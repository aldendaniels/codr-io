
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

var _sUNTITLED = 'Untitled';

var Workspace = oHelpers.createClass(
{
    _oSocket: null,
    _oEditor: null,
    _oModeMenu: null,
    _oMode: null,
    _oPeoplePane: null,
    _oUserInfo: null,

    __init__: function(oSocket, bIsNewDocument, oNewDocumentMode)
    {
        // Save socket.
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerAction);
        
        // Init editor.
        this._oEditor = new Editor(oSocket);
        
        // On a new document creation, default the title to "Untitled".
        if (bIsNewDocument)
        {
            this._setTitle(_sUNTITLED);
            this._setMode(oNewDocumentMode);
            this._setIsEditing(bIsNewDocument /*bIsEditing*/ );
            this._oSocket.send('createDocument',
            {
                sMode:  oNewDocumentMode.getName(),
                sTitle: _sUNTITLED
            });
        }
        else // Open existing document.
        {
            this._oSocket.send('openDocument',
            {
                sDocumentID: window.location.pathname.substr(1)
            });            
        }
        
        // Attach DOM events.
        this._attachDOMEvents();
        this._oModeMenu = new Menu(g_oModes.aModes, $('#mode-menu'), this,
            function(oMode) { return $.inArray(oMode, g_oModes.aFavModes) != -1; }, // Is favorite.
            function(oMode) { return oMode.getName();                            }, // Get key
            function(oMode) { return oMode.getDisplayName();                     }, // Get item display text.
            this._onModeChoice
        );
        this._oPeoplePane = new PeoplePane(this, oSocket);
    },
    
    _setMode: function(oMode)
    {
        this._oEditor.setMode(oMode);
        this._oMode = oMode;
        $('#mode .toolbar-item-selection').text(oMode.getDisplayName());
    },

    getUserInfo: function()
    {
        return this._oUserInfo;
    },

    resize: function()
    {
        this._oEditor.resize();
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
                
                // Title & Language menu: disable if not in edit mode.
                else if (this._oEditor.isEditing())
                {
                    // Open.
                    jToolbarItem.toggleClass('open');
                    jToolbarItem.find('input[type="text"]').focus().select();
                    
                    // Highlight the current mode menu.
                    if (jToolbarItem.is('#mode'))
                        this._oModeMenu.highlight(this._oMode);
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
            {
                this._oModeMenu.onEvent(oEvent);
            }
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
                this._oUserInfo = oAction.oData;
                break;

            case 'setDocumentTitle':
                this._setTitle(oAction.oData.sTitle);
                break;

            case 'setMode':
                this._setMode(g_oModes.oModesByName[oAction.oData.sMode]);
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
    
    _onModeChoice: function(oMode)
    {
        this.setMode(oMode);
        this._oSocket.send('setMode', {sMode: oMode.getName()});
        $('.toolbar-item.open').removeClass('open');
        this._oEditor.focusEditor();
    }
});
