
// Elem IDs.
var EDITOR_ID  = 'codr-edit';
var TOOLBAR_ID = 'codr-toolbar';

// Editor object.
var Editor = oHelpers.createClass(
{
    // Connection state.
    _oSocket: null,
    _aInitialEventQueue: [],
    
    // Ace editor objects.
    _oAceEditor: null,
    _oAceEditorSession: null,
    _oAceDocument: null,

    // Editor state.
    _sMode: '',
    _bHasEditPerms: false,
    _bIsEditing: false,
    
    // Other.
    _iRemoteCursorMarkerID: null,
    _bApplyingExternalEvent: false,

    __init__: function(bHasEditPerms, bIsEditing)
    {
        // Save state.
        oHelpers.assert(bHasEditPerms || !bIsEditing);
        this._bHasEditPerms = bHasEditPerms;
        this._bIsEditing = bIsEditing;
        
        // Create ace editor.
        this._oAceEditor = ace.edit(EDITOR_ID);
        this._oAceEditSession = this._oAceEditor.getSession();
        this._oAceDocument = this._oAceEditSession.getDocument();
        
        // Set initial settings.
        this._oAceEditor.setFontSize(14);
        this._setIsEditing(bIsEditing);
        
        // Attach events.
        this._attachDOMEvents();
        this._attachAceEvents();
        
        // Set focus.
       this._oAceEditor.focus();
    },
    
    connect: function(oSocket)
    {
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerEvent);
    },
    
    setMode: function(sMode)
    {
        this._oAceEditSession.setMode('ace/mode/' + sMode);
		this._sMode = sMode;
    },

    _handleServerEvent: function(oEvent)
    {
        switch(oEvent.sType)
        {
            case 'selectionChange':
                this._onRemoteCursorMove(oEvent);
                break;
            
            case 'languageChange':
                this._setMode(oEvent.sLang);
                break;
            
            case 'removeEditRights':
                this._setIsEditing(false);        
                this._oSocket.send( {sType: 'releaseEditRights'} ); // Notify server of event receipt.
                break;

            case 'editRightsGranted':
                this._setIsEditing(true);
                break;

            case 'newSnapshotUrl':
                window.alert('yourNewSnapshotUrl: ' + document.location.host + oEvent.sUrl);
                break;
            
            case 'aceDelta':
                this._bApplyingExternalEvent = true;
                this_oAceDocument.applyDeltas([oEvent.oDelta.data]);
                this._bApplyingExternalEvent = false;
            
            default:
                assert(false, 'Invalid event type "' + oEvent.sType + '".');
        }        
    },

    _onRemoveServerMove: function(oEvent)
    {
        window.alert('TODO: Support showing selection changes');
    },

    _attachAceEvents: function()
    {
        this._oAceEditor.on("change", oHelpers.createCallback(this, function(oEvent)
        {
            if (!this._bApplyingExternalEvent)
            {
                this._oSocket.send(
                {
                    sType: 'aceDelta',
                    oDelta: oEvent
                });
            }        
        }));
    },

    _attachDOMEvents: function()
    {
        // TODO.
    },

    _setIsEditing: function(bIsEditing)
    {
        this._bIsEditing = bIsEditing;
        // TODO: Update UI.
    }
});
