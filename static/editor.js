
// Elem IDs.
var EDITOR_ID  = 'codr-edit';
var TOOLBAR_ID = 'codr-toolbar';

// Editor object.
var Editor = oHelpers.createClass(
{
    // Connection state.
    _oSocket: null,
    
    // Ace editor objects.
    _oAceEditor: null,
    _oAceEditorSession: null,
    _oAceDocument: null,

    // Editor state.
    _sMode: '',
    _bIsEditing: false,
    
    // Other.
    _iRemoteCursorMarkerID: null,
    _bApplyingExternalAction: false,
    _bIsInitialized: false,

    __init__: function(bIsEditing)
    {
        // Save editng state.
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
        this._oSocket.bind('message', this, this._handleServerAction);
        if (IS_NEW_DOCUMENT)
        {
            this._oSocket.send('createDocument',
            {
                sText: this._oAceDocument.getValue(),
                sMode: this._sMode
            });            
        }
        else
        {
            this._oSocket.send('openDocument',
            {
                sDocumentID: window.location.pathname.substr(1)
            });
        }
    },
    
    setMode: function(sMode)
    {
        this._oAceEditSession.setMode('ace/mode/' + sMode);
		this._sMode = sMode;
    },

    _handleServerAction: function(oAction)
    {
        // Verify initialization.
        if (oAction.sType == 'setDocumentData' || oAction.sType == 'setDocumentID')
            oHelpers.assert(!this._bIsInitialized);
        else
            oHelpers.assert(this._bIsInitialized);

        console.log(oAction);

        switch(oAction.sType)
        {
            case 'setDocumentData': // Fired after opening an existing document.
                this._setText(oAction.oData.sText);
                this._setIsEditing(oAction.oData.bIsEditing);
                this.setMode(oAction.oData.sMode);
                this._bIsInitialized = true;
                break;

            case 'setDocumentID': // Fired after creating a new document.
                // TODO: Assert not init...
                this._setDocumentID(oAction.oData.sDocumentID);
                this._bIsInitialized = true;
                break;

            case 'setSelection':
                this._onRemoteCursorMove(oAction.oData);
                break;
            
            case 'setMode':
                this.setMode(oAction.oData.sMode);
                break;
            
            case 'removeEditRights':
                this._setIsEditing(false);        
                this.sendAction('releaseEditRights'); // Notify server of action receipt.
                break;

            case 'editRightsGranted':
                this._setIsEditing(true);
                break;
            
            case 'aceDelta':
                this._bApplyingExternalAction = true;
                this._oAceDocument.applyDeltas([oAction.oData]);
                this._bApplyingExternalAction = false;
                break;
            
            default:
                oHelpers.assert(false, 'Invalid event type "' + oAction.sType + '".');
        }        
    },

    _onRemoveServerMove: function(oAction)
    {
        window.alert('TODO: Support showing selection changes');
    },

    _attachAceEvents: function()
    {
        this._oAceEditor.on('change', oHelpers.createCallback(this, function(oAceDelta)
        {
            if (this._bIsInitialized && !this._bApplyingExternalAction)
            {
                this.sendAction('aceDelta', oAceDelta.data);
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
    },

    _setText: function(sText)
    {
        this._oAceDocument.setValue(sText);
    },

    _setDocumentID: function(sID)
    {
        window.history.replaceState(null, '', '/' + sID);
    },

    sendAction: function(sType, oData)
    {
        if (this._bIsInitialized)
            this._oSocket.send(sType, oData);
    }
});
