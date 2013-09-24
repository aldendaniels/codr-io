
// Elem IDs.
var EDITOR_ID  = 'edit';
var TOOLBAR_ID = 'toolbar';
var COLORS     = ['green', 'pink', 'orange', 'purple', 'red', 'turquoise '];

var Range = ace.require('ace/range').Range;

// Editor object.
var Editor = oHelpers.createClass(
{
    // Connection state.
    _oSocket: null,
    _oWorkspace: null,
    
    // Ace editor objects.
    _oAceEditor: null,
    _oAceEditorSession: null,
    _oAceDocument: null,

    // Other.
    _oMode: null,
    _iNumUsers: 0,
    _oLastSelectionRange: null,
    _oRemoteUsers: null, /* {
                          *    userID:
                          *    {
                          *        sHexColor: '',
                          *        oLastSelAction: ...,
                          *        aAceMarkersIDs: []
                          *    }}
                          */
    
    // Removte
    _bApplyingRemoteDelta: false,
    _iRemoteCursorMarkerID1: null,
    _iRemoteCursorMarkerID2: null,
    _jEditorElem: null,

    // Trans Op
    _iServerState: 0,
    _aServerUnseenQueue: null,

    __type__: 'Editor',    

    __init__: function(oWorkspace, oSocket)
    {
        this._oSocket = oSocket;
        this._oWorkspace = oWorkspace;
        this._oRemoteUsers = {};
        this._aServerUnseenQueue = [];
        
        // Attach socket.
        this._oSocket.bind('message', this, this._handleServerAction);
        
        // Create ace editor.
        this._jEditorElem = $('#' + EDITOR_ID);
        this._jSummaryBar = $('#summary-bar');
        this._oAceEditor = ace.edit(EDITOR_ID);
        this._oAceEditSession = this._oAceEditor.getSession();
        this._oAceDocument = this._oAceEditSession.getDocument();
        
        // Set initial ace editor settings.
        this._oAceEditor.setFontSize(14);
        this._oAceEditor.setShowPrintMargin(false);
        this._oAceEditor.setReadOnly(IS_SNAPSHOT);
            
        // Attach Ace gotoline command to different shortcut
        this._oAceEditor.commands.bindKey('Ctrl-G|Command-G', 'gotoline');
        this._oAceEditor.commands.bindKey('Ctrl-L|Command-L', '');
		
		// Do not include white space in selection
		this._oAceEditor.setSelectionStyle('text');
        
        // Attach events.
        this._attachAceEvents();

        // Update status bar.
        this._setPeopleViewing();
        this._setCursorPosSummary();
    },
    
    setMode: function(oMode)
    {
        this._oAceEditSession.setMode(oMode.getPath());
        this._oMode = oMode;
    },
    
    getSelection: function()
    {
        return this._oAceEditor.getSelectionRange();
    },

    getMode: function()
    {
        return this._oMode;
    },

    getText: function()
    {
        return this._oAceDocument.getValue();
    },
    
    isFocused: function()
    {
        return this._oAceEditor.isFocused();
    },

    resize: function()
    {
        this._oAceEditor.resize();
    },
    
    contains: function(jElem)
    {
        return jElem.closest(this._jEditorElem).length > 0 || jElem.closest(this._jSummaryBar).length > 0;
    },

    focus: function()
    {
        this._oAceEditor.focus();
    },
    
    // Called by workspace, but not needed.
    onBlur: function()  {},
    onEvent: function() {},

    setText: function(sText)
    {
        this._oAceDocument.setValue(sText);
        this._oAceEditor.moveCursorTo(0, 0);
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'setDocumentData': // Fired after opening an existing document.
                this._iServerState = oAction.oData.iServerState;
                this._bApplyingRemoteDelta = true;
                this.setText(oAction.oData.sText);
                this._bApplyingRemoteDelta = false;
                break;
            
            case 'setRemoteSelection':
                this._removeRemoteSelection(oAction.oData.sClientID);
                this._addRemoteSelection(oAction.oData.sClientID, oAction.oData.oSel);
                break;
            
            case 'aceDelta':
                this._iServerState = oAction.oData.iServerState;
                this._bApplyingRemoteDelta = true;

                // Revert pending deltas.
                this._oAceDocument.revertDeltas(this._aServerUnseenQueue);

                // Transform pending deltas.
                var oDeltaOp = getTransOpFromAceDelta(oAction.oData.oDelta);
                for (var i = 0; i < this._aServerUnseenQueue.length; i++)
                    transformAceDelta(oDeltaOp, this._aServerUnseenQueue[i]);

                // Apply new delta
                this._oAceDocument.applyDeltas([oAction.oData.oDelta]);

                // Apply pending tranformed deltas.
                if (this._aServerUnseenQueue.length > 0)
                    this._oAceDocument.applyDeltas(this._aServerUnseenQueue);

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
                this._removeRemoteSelection(oAction.oData.sClientID);
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
        var sNumViewers = iNumViewers + ' other viewer' + (iNumViewers == 1 ? '' : 's');
        $('#num-viewing').text(sNumViewers);
    },

    _addRemoteSelection: function(sClientID, oSel)
    {
        // Create Range.
        var bIsCollapsed  = oSel.start.row == oSel.end.row && oSel.start.column == oSel.end.column;
        var oNewRange     = new Range();
        oNewRange.start = this._oAceDocument.createAnchor(oSel.start.row, oSel.start.column);
        oNewRange.end   = this._oAceDocument.createAnchor(oSel.end.row,   oSel.end.column);
        
        // Determine color.
        var sColorClass = this._oRemoteUsers[sClientID].sColor;
        
        // Add marker.
        var aAceMarkerIDs = this._oRemoteUsers[sClientID].aAceMarkersIDs;
        if (bIsCollapsed)
        {
            oNewRange.end.column += 1; // Hack: Zero-width selections are not visible.
            aAceMarkerIDs.push(this._oAceEditSession.addMarker(oNewRange, 'remote-sel-collapsed '     + sColorClass,  'text'));
            aAceMarkerIDs.push(this._oAceEditSession.addMarker(oNewRange, 'remote-sel-collapsed-hat ' + sColorClass, 'text'));
        }
        else
            aAceMarkerIDs.push(this._oAceEditSession.addMarker(oNewRange, 'remote-sel ' + sColorClass, 'text'));   
    },
    
    _removeRemoteSelection: function(sClientID)
    {
        var aAceMarkerIDs = this._oRemoteUsers[sClientID].aAceMarkersIDs;
        for (var i in aAceMarkerIDs)
        {
            var iMarkerID = aAceMarkerIDs[i];
            this._oAceEditSession.removeMarker(iMarkerID);
        }
        this._oRemoteUsers[sClientID].aAceMarkersIDs = [];
    },

    _setCursorPosSummary: function(oSel)
    {
        var iRow = oSel ? oSel.start.row : 0;
        var iCol = oSel ? oSel.start.column : 0;
        $('#line-number').text(iRow + 1);
        $('#col-number').text(iCol + 1);
    },

    _attachAceEvents: function()
    {
        this._oAceEditor.on('change',          oHelpers.createCallback(this, this._onAceDocumentChange ));
        this._oAceEditor.on('changeCursor',    oHelpers.createCallback(this, this._onAceSelectionChange));
        this._oAceEditor.on('changeSelection', oHelpers.createCallback(this, this._onAceSelectionChange));
        this._oAceEditor.on('blur', function(oEvent){ oEvent.preventDefault(); });
    },
    
    _onAceSelectionChange: function(oEvent)
    {
        var oSelectionRange = this._oAceEditor.getSelectionRange();
        var bIsDuplicateEvent = this._oLastSelectionRange && this._oLastSelectionRange.isEqual(oSelectionRange);
        if (!bIsDuplicateEvent  && !this._bApplyingRemoteDelta)
        {
            this._oSocket.send('setSelection', {oSel: oSelectionRange});
            this._oLastSelectionRange = oSelectionRange;                
            this._setCursorPosSummary(oSelectionRange);
        }
    },
    
    _onAceDocumentChange: function(oAceDelta)
    {
        if (!this._bApplyingRemoteDelta)
        {
            this._oSocket.send('aceDelta', {
                'oDelta': oAceDelta.data,
                'iClientState': this._iServerState
            });

            this._aServerUnseenQueue.push(oAceDelta.data);
        }
    }
});
