
var COLORS     = ['green', 'pink', 'orange', 'purple', 'red', 'turquoise '];
var EDITOR_ID  = 'edit';

// Editor object.
var Editor = oHelpers.createClass(
{
    _oSocket: null,
    _oEditControl: null,

    // Remote users.
    _oRemoteClients: null, // { userID: { sColor: '', oLastSelRange: null }, ...}    

    // OT Transform state.
    _iServerState: 0,
    _aServerUnseenQueue: null,

    __type__: 'Editor',    

    __init__: function(oSocket)
    {
        this._oSocket = oSocket;
        this._oRemoteClients = {};
        this._aServerUnseenQueue = [];
        
        // Attach socket.
        this._oSocket.bind('message', this, this._handleServerAction);
                
        // Attach events.
        this._oEditControl = new EditControl(EDITOR_ID);
        this._oEditControl.on('docChange', this, this._onDocumentChange);
        this._oEditControl.on('selChange', this, this._onSelectionChange);
        
        // Update status bar.
        this._setPeopleViewing();
    },
    
    setMode: function(oMode)
    {
        this._oEditControl.setMode(oMode);
    },
    
    resize: function()
    {
        this._oEditControl.resize();
    },
    
    contains: function(jElem)
    {
        return jElem.closest('#' + EDITOR_ID).length > 0 || jElem.closest(this._jSummaryBar).length > 0;
    },

    focus: function()
    {
        this._oEditControl.focus();
    },
    
    // Called by workspace, but not needed.
    onBlur: function()  {},
    onEvent: function() {},

    setContent: function(aLines)
    {
        this._oEditControl.setContent(aLines);
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'setDocumentData': // Fired after opening an existing document.
                this._iServerState = oAction.oData.iServerState;
                this.setContent(oAction.oData.aLines);
                break;
            
            case 'setRemoteSelection':
                
                // Tranform range to reflect local actions.
                for (var i = 0; i < this._aServerUnseenQueue.length; i++)
                    oAction.oData.oRange = oOT.transformRange(this._aServerUnseenQueue[i], oAction.oData.oRange);
                
                // Save remote selection range and refresh.
                var sClientID = oAction.oData.sClientID;
                this._oRemoteClients[sClientID].oLastSelRange = oAction.oData.oRange;
                this._refreshRemoteSelections();
                break;
            
            case 'docChange':
                
                // Store server state.
                this._iServerState = oAction.oData.iServerState;
                
                // Revert pending deltas.
                for (var i = this._aServerUnseenQueue.length - 1; i >= 0; i--)
                {                 
                    var oLocalDelta = this._aServerUnseenQueue[i];
                    var oInverseDelta = oHelpers.deepCloneObj(oLocalDelta);
                    oInverseDelta.sAction = (oLocalDelta.sAction == 'insert' ? 'delete' : 'insert');
                    this._applyDelta(oInverseDelta);
                }
                
                // Apply new delta.
                this._applyDelta(oAction.oData.oDelta);
                
                // Transform and apply pending tranformed deltas.
                for (var i = 0; i < this._aServerUnseenQueue.length; i++)
                {
                    oLocalDelta = this._aServerUnseenQueue[i];
                    oLocalDelta.oRange = oOT.transformRange(oAction.oData.oDelta, oLocalDelta.oRange);
                    this._applyDelta(oLocalDelta);
                }
                
                // Refresh remote cursors.
                this._refreshRemoteSelections();
                break;
                
            case 'eventReciept':
                this._iServerState = oAction.oData.iServerState;
                this._aServerUnseenQueue = this._aServerUnseenQueue.splice(1);
                break;
                
            case 'addClient':
                
                // Store client info.
                var iNumClients = Object.keys(this._oRemoteClients).length;
                this._oRemoteClients[oAction.oData.sClientID] =
                {
                    sColor: iNumClients <= COLORS.length ? COLORS[iNumClients] : 'black',
                    oLastSelRange: null,
                    aAceMarkersIDs: []
                }
                
                // Update pople viewing.
                this._setPeopleViewing();
                break;
                
            case 'removeClient':
                this._oEditControl.removeSelectionMarker(oAction.oData.sClientID);
                delete this._oRemoteClients[oAction.oData.sClientID];
                this._setPeopleViewing();
                break;
            
            default:
                return false;
        }

        return true;
    },

    _setPeopleViewing: function()
    {
        var iNumViewers = Object.keys(this._oRemoteClients).length;
        var sText = iNumViewers + ' other' + (iNumViewers == 1 ? '' : 's');
        $('#num-viewing').text(sText)
                         .toggleClass('others-viewing', iNumViewers > 0);
    },
    
    _onSelectionChange: function(oRange, bCausedByDocChange)
    {
        if (!bCausedByDocChange)
        {
            this._oSocket.send('setSelection',
            {
                oRange: oRange,
                iState: this._iServerState /*, TOOD:
                sFocusEnd: 'start' or 'end'*/
            });            
        }
        
        // Update current col and row (1-based).
        $('#line-num').text(oRange.oStart.iRow + 1);
        $('#col-num').text(oRange.oStart.iCol + 1);
    },
    
    _onDocumentChange: function(oDelta)
    {
        this._oSocket.send('docChange',
        {
            oDelta: oDelta,
            iState: this._iServerState
        });
        this._transformRemoteSelections(oDelta);
        this._refreshRemoteSelections();
        this._aServerUnseenQueue.push(oDelta);
    },
    
    _transformRemoteSelections: function(oDelta)
    {
        for (var sClientID in this._oRemoteClients)
        {
            var oClient = this._oRemoteClients[sClientID];
            if (oClient.oLastSelRange)
                oClient.oLastSelRange = oOT.transformRange(oDelta, oClient.oLastSelRange);
        }
    },
    
    _refreshRemoteSelections: function()
    {
        for (var sClientID in this._oRemoteClients)
        {
            var oClient = this._oRemoteClients[sClientID];
            if (oClient.oLastSelRange)
                this._oEditControl.setSelectionMarker(oClient.oLastSelRange, sClientID, oClient.sColor);
        }
    },
    
    _applyDelta: function(oDelta)
    {
        this._oEditControl.applyDelta(oDelta);
        this._transformRemoteSelections(oDelta);
    }
});
