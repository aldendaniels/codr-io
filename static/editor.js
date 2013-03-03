
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
    _bIsEditing: false,
    _iRemoteCursorMarkerID: null,
    _bApplyingExternalEvent: false,

    __init__: function(bIsEditing, sMode)
    {
        // Create ace editor.
        this._oAceEditor = ace.edit(EDITOR_ID);
        this._oAceEditSession = this._oAceEditor.getSession();
        this._oAceDocument = this._oAceEditSession.getDocument();
        
        // Set initial settings.
        this._oAceEditor.setFontSize(14);
        this._setMode(sMode);
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
        this._oSocket.bind('message', this, this._handleServerMessage);
    },
    
    _handleServerMessage: function(oMessage)
    {
        var oEvent = oMessage.data;
        switch(oEvent)
        {
            case 'setInitialValue':
                this._bApplyingExternalEvent = true;
                this._oAceDocument.setValue(oEvent.sData);
                this._bApplyingExternalEvent = false;
                if (oEvent.bReadOnly)
                    alert('ToDo: Support readonly files.');
    
                this._setIsEditing(oEvent.bIsEditing);
                break;
            
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
            
            default:
                this._bApplyingExternalEvent = true;
                this_oAceDocument.applyDeltas([oEvent.oDelta.data]);
                this._bApplyingExternalEvent = false;
   
        }        
    },

    _onRemoveServerMove: function(oEvent)
    {
        assert('ToDo: Support showing selection changes');
    },

    _attachAceEvents: function()
    {
        this._oAceEditor.on("change", onDocumentChange);
    },

    _onDocumentChange: function(oEvent)
    {
        if (this._bApplyingExternalEvent)
            return;
    
        var oNormEvent = {
            sType: 'aceDelta',
            oDelta: oEvent
        }
        this._oSocket.send(oNormEvent);

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
            this._oSocket.send(
            {
                'sType': 'languageChange',
                'sLang': $(this).val()
            });
        });
        
        $('#fork').click(function()
        {
            document.location.pathname = '/fork' + document.location.pathname;
        });
    
        $('#snapshot').click(function()
        {
            this._oSocket.send(
            {
                sType: 'generateSnapshot'
            });
        });
    },

    _setIsEditing: function(bIsEditing)
    {
        this._bIsEditing = bIsEditing;
        alert('ToDo: Support bIsEditing');
    
    },
    
    _setMode: function(sMode)
    {
        this._oAceEditSession.setMode(sMode);
        if ($('#edit-mode').val() != '/ace/mode/' + sMode)
            $('#edit-mode').val(sMode);    
    }
});
