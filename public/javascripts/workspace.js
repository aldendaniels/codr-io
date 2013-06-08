
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
    _oPeoplePane: null,
    _oUserInfo: null,

    __init__: function()
    {
        var bIsEditing = IS_NEW_DOCUMENT
        this._oEditor = new Editor(bIsEditing);
        this._setIsEditing(bIsEditing);
        
        // On a new document creation, default the title to "Untitled".
        if (IS_NEW_DOCUMENT)
            this._setTitle(_sUNTITLED);
    },

    setSocket: function(oSocket)
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

    getUserInfo: function()
    {
        return this._oUserInfo;
    },
    
    _initConnection: function(oUserInfo)
    {
        this._oUserInfo = oUserInfo;

        this._attachDOMEvents();
        this._oEditor.connect(this._oSocket);
        this._oModeMenu = new Menu(aModes, aFavKeys, $('#mode-menu'), this, this._onModeChoice);

        this._oPeoplePane = new PeoplePane(this, this._oSocket);
    },

    _attachDOMEvents: function()
    {
        oHelpers.on(window, 'click', this, function(oEvent)
        {
            var jTarget = $(oEvent.target);
            
            // Dropdown button
            var jToolbarBtn = jTarget.closest('.toolbar-item-btn');
            if (jToolbarBtn.length)
            {
                var jToolbarItem = jToolbarBtn.parent();
                if (jToolbarItem.hasClass('open'))
                    jToolbarItem.removeClass('open');
                else
                {
                    // Open.
                    jToolbarItem.toggleClass('open');
                    jToolbarItem.find('input[type="text"]').focus().select();
                    
                    // Highlight the current mode menu.
                    if (jToolbarItem.is('#mode'))
                        this._oModeMenu.highlight(this._sMode);
                }
            }
            
            // Title save button
            if (jTarget.closest('#title-save').length)
            {
                this._setTitleToLocal();
            }
            
            // Edit button
            if (jTarget.closest('#edit-button').length)
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
            }
            
            // Mode menu option.
            if (jTarget.closest('#mode-menu').length)
                this._oModeMenu.onEvent(oEvent);
        });
        
        oHelpers.on(window, 'keypress', this, function(oEvent)
        {            
            // Save title on ENTER.
            var jTarget = $(oEvent.target);
            if (jTarget[0] == $('#title-input')[0])
            {
                if (oEvent.which == 13 /* ENTER */)
                    this._setTitleToLocal();                
            }            
        });
        
        oHelpers.on(window, 'keyup keydown', this, function(oEvent)
        {
            // Mode menu option.
            var jTarget = $(oEvent.target);
            if (jTarget.closest('#mode-menu').length)
                this._oModeMenu.onEvent(oEvent);            
        });
        
        oHelpers.on(window, 'mousedown', this, function(oEvent)
        {
            // Maintain focus.
            var jTarget = $(oEvent.target);
            if (!jTarget.is('input, textarea'))
                oEvent.preventDefault();

            // Close toolbar.
            var jOpenToolbarItem = $('.toolbar-item.open');
            if (jOpenToolbarItem.length && !$(oEvent.target).closest('.toolbar-item.open').length)
            {
                jOpenToolbarItem.removeClass('open');
                this._oEditor.focusEditor()
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
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'connect':
                this._initConnection(oAction.oData);
                break;

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
        this._oEditor.focusEditor();
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
    },
    
    _onModeChoice: function(sMode)
    {
        this.setMode(sMode);
        this._oSocket.send('setMode', {sMode: sMode});
        $('.toolbar-item.open').removeClass('open');
        this._oEditor.focusEditor();
    }
});
