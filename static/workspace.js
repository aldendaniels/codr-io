var Workspace = oHelpers.createClass({
    _oSocket: null,
    _oEditor: null,

    __init__: function()
    {
        var bIsEditing = IS_NEW_DOCUMENT
        this._oEditor = new Editor(bIsEditing);
        this._setIsEditing(bIsEditing);
    },

    connect: function(oSocket)
    {
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerAction);

        if (IS_NEW_DOCUMENT)
        {
            this._oSocket.send('createDocument',
            {
                sText: this._oEditor.getText(),
                sMode: this._oEditor.getMode()
            });            
        }
        else
        {
            this._oSocket.send('openDocument',
            {
                sDocumentID: window.location.pathname.substr(1)
            });
        }
        this._attachDOMEvents();
        this._oEditor.connect(oSocket);
    },

    setMode: function(sMode)
    {
        this._oEditor.setMode(sMode);
        $('#codr-toolbar #documentMode').text(sMode);
    },
    
    focusEditor: function()
    {
        this._oEditor.focusEditor();
    },
    
    _attachDOMEvents: function()
    {
        oHelpers.on('.toolbar-item-btn', 'click', this, function(oEvent)
        {
            var jToolbarItem = $(oEvent.currentTarget).parent();
            jToolbarItem.toggleClass('open');
            jToolbarItem.find('input[type="text"]').focus().select();
        });

        oHelpers.on('#documentTitleSave', 'click', this, function()
        {
            this._setTitleToLocal();
        });
        
        oHelpers.on('#documentTitleInput', 'keypress', this, function(oEvent)
        {
            if (oEvent.which == 13 /* ENTER */)
                this._setTitleToLocal();
        });

        oHelpers.on('#edit-btn', 'click', this, function()
        {
            if (!$('#edit-btn').hasClass('disabled'))
                this._oSocket.send('requestEditRights');
        });
        
        oHelpers.on('BODY', 'mousedown', this, function(oEvent)
        {
            var jOpenToolbarItem = $('.toolbar-item.open');
            if (jOpenToolbarItem.length && !$(oEvent.target).parents('.toolbar-item.open').length)
                jOpenToolbarItem.removeClass('open');
        });
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'setDocumentTitle':
                $('#documentTitle').text(oAction.oData.sTitle);
                $('#documentTitleInput').val(oAction.oData.sTitle);
                break;

            case 'setMode':
                $('#codr-toolbar #documentMode').text(oAction.oData.sMode);
                break;

            case 'removeEditRights':
                this._setIsEditing(false);
                this._oSocket.send('releaseEditRights'); // Notify server of action receipt.
                break;

            case 'editRightsGranted':
                this._setIsEditing(true);
                break;

            case 'setDocumentID': // Fired after creating a new document.
                this._setDocumentID(oAction.oData.sDocumentID);
                break;
 
            default:
                return false;
        }

        return true;
    },

    _setTitleToLocal: function()
    {
        var sTitle = $('#documentTitleInput').val();
        $('#documentTitle').text(sTitle);
        this._oSocket.send('setDocumentTitle', { 'sTitle': sTitle });
        $('.toolbar-title').removeClass('open');
    },
    
    _setDocumentID: function(sID)
    {
        window.history.replaceState(null, '', '/' + sID);
    },

    _setIsEditing: function(bIsEditing)
    {
        this._oEditor.setIsEditing(bIsEditing);
        if (bIsEditing)
        {
            $('#edit-btn').text('Editing...').addClass('disabled'); 
        }
        else
        {
            $('#edit-btn').text('Start Editing').removeClass('disabled'); 
        }
    }
});
