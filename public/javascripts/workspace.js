
/*
CODE STRUCTURE: (not implemented yet)

    The App is organized into three objects:
     1. Editor
     2. Toolbar    (not done yet)
     3. PeoplePane (not done yet)
    None of the above sections know about each other.
    
    All of the above objects share a Socket instance.
    When an event is received from the server each of
    the classes (Editor, Tolbar, PeoplePane) have the
    opportunity to handle the event. In some cases,
    multiple objects can handle a single event. For example,
    when the document mode is updated, we update both
    the editor and the toolbar.
    
    All three are objects managed by an outer class named "Workspace."
    The Workspace class has the following functions:
     1. Bind DOM events and broadcast them to the appropriate objects.
     2. Manage which section has UI focus.
     3. Intercept actions as necessary.
        For example, then the toolbar sends the setMode event down the socket,
        the workspace can intercept this in order to update the edtor mode
        before the event is sent.
    
    NOTE: All events should be bound on the BODY element by the workspace.
    TODO: Change the menu element to stop attaching it's own event.
    CAVEAT: This is not true for the ace editor.
*/

_sUNTITLED = 'Untitled';

var Workspace = oHelpers.createClass(
{
    _oSocket: null,
    _oEditor: null,
    _oModeMenu: null,
    _sMode: null,

    __init__: function()
    {
        var bIsEditing = IS_NEW_DOCUMENT
        this._oEditor = new Editor(bIsEditing);
        this._setIsEditing(bIsEditing);
        
        // On a new document creation, default the title to "Untitled".
        if (IS_NEW_DOCUMENT)
            this._setTitle(_sUNTITLED);
    },

    connect: function(oSocket)
    {
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerAction);

        if (IS_NEW_DOCUMENT)
        {
            this._oSocket.send('createDocument',
            {
                sText:  this._oEditor.getText(),
                sMode:  this._oEditor.getMode(),
                sTitle: _sUNTITLED
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
        this._sMode = sMode;
        $('#mode .toolbar-item-selection').text(sMode);
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
            if (jToolbarItem.hasClass('open'))
            {
                jToolbarItem.removeClass('open');
                this._oModeMenu.detach();
            }
            else
            {
                // Open.
                jToolbarItem.toggleClass('open');
                jToolbarItem.find('input[type="text"]').focus().select();
                
                // Attach the mode menu.
                if (jToolbarItem.is('#mode'))
                {
                    this._oModeMenu.attach();
                    this._oModeMenu.highlight(this._sMode);
                }
            }
        });

        oHelpers.on('#title-save', 'click', this, function()
        {
            this._setTitleToLocal();
        });
        
        oHelpers.on('#title-input', 'keypress', this, function(oEvent)
        {
            if (oEvent.which == 13 /* ENTER */)
                this._setTitleToLocal();
        });

        oHelpers.on('#edit-button', 'click', this, function()
        {
            if (this._oEditor.isEditing())
            {
                this._setIsEditing(false);
                this._oSocket.send('releaseEditRights');
            }
            else
            {
                this._oSocket.send('requestEditRights', this._oEditor.getSelection());
            }
        });
        
        oHelpers.on('BODY', 'mousedown', this, function(oEvent)
        {
            var jOpenToolbarItem = $('.toolbar-item.open');
            if (jOpenToolbarItem.length && !$(oEvent.target).closest('.toolbar-item.open').length)
            {
                jOpenToolbarItem.removeClass('open');
                this._oModeMenu.detach();;
            }
            
            // TODO: This is a hack. We should really remove focus whenever a
            // toolbar menu is open and return focus when it is closed.
            if (oEvent.target.tagName != 'INPUT')
            {
                oEvent.preventDefault(); // Keep Ace from losing focus.
            }
        });
        
        // Prevent arrow keys from functioning in non-edit mode.
        $(window).onKeyDown = null;
        $(window)[0].addEventListener('keydown', oHelpers.createCallback(this, function(oEvent)
        {
            if (this._oEditor.isFocused() && !this._oEditor.isEditing())
            {
                oEvent.preventDefault;
                oEvent.stopPropagation();
            }
        }), true /*useCapture */);
        
        var jModeMenu = $('#mode-menu');
        this._oModeMenu = new Menu(aModes, aFavKeys, jModeMenu, this, function(sMode)
        {
            this.setMode(sMode);
            this._oSocket.send('setMode', {sMode: sMode});
            $('.toolbar-item.open').removeClass('open');
        });
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'setDocumentTitle':
                this._setTitle(oAction.oData.sTitle);
                break;

            case 'setMode':
                this.setMode(oAction.oData.sMode);
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
    
    _setTitle: function(sTitle)
    {
        $('#title .toolbar-item-selection').text(sTitle);
        $('#title-input').val(sTitle);
    },

    _setTitleToLocal: function()
    {
        var sTitle = $('#title-input').val();
        $('#title .toolbar-item-selection').text(sTitle);
        this._oSocket.send('setDocumentTitle', { 'sTitle': sTitle });
        $('#title').removeClass('open');
    },
    
    _setDocumentID: function(sID)
    {
        window.history.replaceState(null, '', '/' + sID);
    },

    _setIsEditing: function(bIsEditing)
    {
        this._oEditor.setIsEditing(bIsEditing);
        $('BODY').toggleClass('is-editing', bIsEditing);
        $('#edit-button').toggleClass('on', bIsEditing);
    }
});
