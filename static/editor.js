
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
    
    _handleServerMessage: function()
    {
        var oEvent = JSON.parse(oMessage.data);
        if (oEvent.sType == 'setInitialValue')
        {
            this._bApplyingExternalEvent = true;
            this._oAceDocument.setValue(oEvent.sData);
            this._bApplyingExternalEvent = false;
            if (oEvent.bReadOnly)
                alert('ToDo: Support readonly files.');

            this._setIsEditing(oEvent.bIsEditing);
        }
        else if (oEvent.sType == 'selectionChange')
        {
            this._onRemoteCursorMove(oEvent);
        }
        else if (oEvent.sType == 'languageChange')
        {
            this._setMode(oEvent.sLang);
        }
        else if (oEvent.sType == 'removeEditRights')
        {
            this._setIsEditing(false);        
            // Notify server of event receipt.
            g_oSocket.send(JSON.stringify(
            {
                sType: 'releaseEditRights'
            }));
        }
        else if (oEvent.sType == 'editRightsGranted')
        {
            this._setIsEditing(true);
        }
        else if (oEvent.sType == 'newSnapshotUrl')
        {
            window.alert('yourNewSnapshotUrl: ' + document.location.host + oEvent.sUrl);
        }
        else
        {
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
        if (g_bApplyingExternalEvent)
            return;
    
        var oNormEvent = {
            sType: 'aceDelta',
            oDelta: oEvent
        }
        this._oSocket.send(JSON.stringify(oNormEvent));

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
