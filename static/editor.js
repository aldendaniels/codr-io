
// Elem IDs.
var EDITOR_ID  = 'codr-edit'
var TOOLBAR_ID = 'codr-toolbar'

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

    // Document state.
    _bIsEditable: false,
    _iRemoteCursorMarkerID: null,

    __init__: function(bIsEditable, sLanguage)
    {
        // Create ace editor.
        this._oAceEditor = ace.edit(EDITOR_ID);
        this._oAceEditSession = this._oAceEditor.getSession();
        this._oAceDocument = this._oAceEditSession.getDocument();
        
        // Set initial settings.
        g_oEditor.setFontSize(14);
        setLang(sLanguage);
        this._setEditMode(bIsEditable);
        
        // Attach events.
        this._attachDOMEvents();
        this._attachAceEvents();
    },
    
    connect: function(oSocket)
    {
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerMessage);
    },
    
    handleServerMessage: function()
    {
        
    },
    
    _attachDOMEvents: function()
    {
        
    },
    
    _attachAceEvents: function()
    {
        
    },
});
