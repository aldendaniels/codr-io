
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

    // Document state.
    _bIsEditable: false,
    _iRemoteCursorMarkerID: null,

    __init__: function(bIsEditable, sMode)
    {
        // Create ace editor.
        this._oAceEditor = ace.edit(EDITOR_ID);
        this._oAceEditSession = this._oAceEditor.getSession();
        this._oAceDocument = this._oAceEditSession.getDocument();
        
        // Set initial settings.
        g_oEditor.setFontSize(14);
        this._setMode(sMode);
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
    
    _handleServerMessage: function()
    {
        
    },

    _attachAceEvents: function()
    {
        
    },
    
    _attachDOMEvents: function()
    {
        // Toggle edit mode.
        oHelpers.on('#edit-btn', 'click', this, function()
        {
            this._oSocket.send('requestEditRights');
        });

        // Set editor language.
        oHelpers.on('#edit-mode', 'change', this, function(oEvent)
        {
            // Set mode.
            var sMode = $(oEvent.target).val();
            this._oSocket.send('languageChange', sMode);
            this._setMode(sMode);            
        });
        
        // Change mode.
        $('#mode').on('change', function()
        {
            setLang($(this).val());
            g_oSocket.send(JSON.stringify(
            {
                'sType': 'languageChange',
                'sLang': $(this).val()
            }));
        });
        
        $('#fork').click(function()
        {
            document.location.pathname = '/fork' + document.location.pathname;
        });
    
        $('#snapshot').click(function()
        {
            g_oSocket.send(JSON.stringify(
            {
                sType: 'generateSnapshot'
            }));
        });
    },
    
    _setMode: function(sMode)
    {
        this._oAceEditSession.setMode("ace/mode/" + sMode);
        if ($('#edit-mode').val() != sMode)
            $('#edit-mode').val(sMode);    
    }
});
