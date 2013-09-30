
var COLORS     = ['green', 'pink', 'orange', 'purple', 'red', 'turquoise '];
var EDITOR_ID  = 'edit';

// Editor object.
var Editor = oHelpers.createClass(
{
    _oSocket: null,
    _oEditControl: null,

    // Remote users.
    _oRemoteUsers: null, // { userID: { sColor: '', oLastSelAction: null }, ...}    
    _iNumUsers: 0,
    _oLastSelectionRange: null,
    _bApplyingRemoteDelta: false,

    // OT Transform state.
    _iServerState: 0,
    _aServerUnseenQueue: null,

    __type__: 'Editor',    

    __init__: function(oSocket)
    {
        this._oSocket = oSocket;
        this._oRemoteUsers = {};
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
                this._bApplyingRemoteDelta = true;
                this.setContent(oAction.oData.aLines);
                this._bApplyingRemoteDelta = false;
                break;
            
            case 'setRemoteSelection':
                var sClientID = oAction.oData.sClientID;
                var sColorClass = this._oRemoteUsers[sClientID].sColor;
                this._oEditControl.setSelectionMarker(oAction.oData.oRange, sClientID, sColorClass);
                break;
            
            case 'docChange':
                this._iServerState = oAction.oData.iServerState;
                this._bApplyingRemoteDelta = true;
                
                // Revert pending deltas.
                this._oEditControl.revertDeltas(this._aServerUnseenQueue);
                
                // Transform pending deltas.
                for (var i = 0; i < this._aServerUnseenQueue.length; i++)
                    this._aServerUnseenQueue[i].oRange = transformRange(oAction.oDelta, this._aServerUnseenQueue[i].oRange);
                
                // Apply new delta
                this._oEditControl.applyDeltas([oAction.oData.oDelta]);
                
                // Apply pending tranformed deltas.
                if (this._aServerUnseenQueue.length > 0)
                    this._oEditControl.applyDeltas(this._aServerUnseenQueue);
                
                this._bApplyingRemoteDelta = false;
                break;
                
            case 'eventReciept':
                this._iServerState = oAction.oData.iServerState;
                this._aServerUnseenQueue = this._aServerUnseenQueue.splice(1);
                break;
                
            case 'addUser':
                var iNumUsers = Object.keys(this._oRemoteUsers).length;
                this._oRemoteUsers[oAction.oData.sClientID] =
                {
                    sColor: iNumUsers <= COLORS.length ? COLORS[iNumUsers] : 'black',
                    oLastSelAction: null,
                    aAceMarkersIDs: []
                }
                this._setPeopleViewing();
                break;
                
            case 'removeUser':
                this._oEditControl.removeSelectionMarker(oAction.oData.sClientID);
                delete this._oRemoteUsers[oAction.oData.sClientID];
                this._setPeopleViewing();
                break;
            
            default:
                return false;
        }

        return true;
    },

    _setPeopleViewing: function()
    {
        var iNumViewers = Object.keys(this._oRemoteUsers).length;
        var sText = iNumViewers + ' other' + (iNumViewers == 1 ? '' : 's');
        $('#num-viewing').text(sText)
                         .toggleClass('others-viewing', iNumViewers > 0);
    },
    
    _onSelectionChange: function(oRange)
    {
        if (!this._bApplyingRemoteDelta)
        {
            this._oSocket.send('setSelection',
            {
                oRange: oRange /*, TOOD:
                sFocusEnd: 'start' or 'end'*/
            });
            this._oLastSelectionRange = oRange;                
        }
    },
    
    _onDocumentChange: function(oDelta)
    {
        if (!this._bApplyingRemoteDelta)
        {
            this._oSocket.send('docChange', {
                'oDelta': oDelta,
                'iClientState': this._iServerState
            });
            this._aServerUnseenQueue.push(oDelta);
        }
    }
});
