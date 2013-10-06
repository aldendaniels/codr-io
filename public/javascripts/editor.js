
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
                var sClientID = oAction.oData.sClientID;
                var sColorClass = this._oRemoteClients[sClientID].sColor;
                this._oRemoteClients[sClientID].oLastSelRange = oAction.oData.oRange;
                this._oEditControl.setSelectionMarker(oAction.oData.oRange, sClientID, sColorClass);
                break;
            
            case 'docChange':
                
                // Store server state.
                this._iServerState = oAction.oData.iServerState;
                
                // Revert pending deltas.
                this._oEditControl.revertDeltas(this._aServerUnseenQueue);
                
                // Transform pending deltas.
                var oDelta = oAction.oData.oDelta;
                for (var i = 0; i < this._aServerUnseenQueue.length; i++)
                    this._aServerUnseenQueue[i].oRange = oOT.transformRange(oDelta, this._aServerUnseenQueue[i].oRange);
                
                // Apply new delta.
                this._oEditControl.applyDelta(oDelta);
                
                // Apply pending tranformed deltas.
                this._oEditControl.applyDeltas(this._aServerUnseenQueue);
                
                // Transform remote selections.
                this._transformRemoteSelections(oDelta);
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
    
    _onSelectionChange: function(oRange)
    {
        this._oSocket.send('setSelection',
        {
            oRange: oRange /*, TOOD:
            sFocusEnd: 'start' or 'end'*/
        });
    },
    
    _onDocumentChange: function(oDelta)
    {
        this._oSocket.send('docChange', {
            'oDelta': oDelta,
            'iClientState': this._iServerState
        });
        this._transformRemoteSelections(oDelta);
        this._aServerUnseenQueue.push(oDelta);
    },
    
    _transformRemoteSelections: function(oDelta)
    {
        for (var sClientID in this._oRemoteClients)
        {
            var oClient = this._oRemoteClients[sClientID];
            if (oClient.oLastSelRange)
            {
                oClient.oLastSelRange = oOT.transformRange(oDelta, oClient.oLastSelRange);
                this._oEditControl.setSelectionMarker(oClient.oLastSelRange, sClientID, oClient.sColor);
            }
        }
    }
});
