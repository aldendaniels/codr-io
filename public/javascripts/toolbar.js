
var Toolbar = oHelpers.createClass(
{
    /* External dependencies */
    _oSocket: null,
    _oWorkspace: null,
    
    /* Internal state */
    _oModeMenu: null,
    _oChat: null,
    
    __type__: 'Toolbar',    

    __init__: function(oWorkspace, oSocket, oShortcutHandler)
    {
        // Save dependencies.
        this._oSocket = oSocket;
        this._oWorkspace = oWorkspace;
        
        // Create the mode menu.
        this._oModeMenu = g_oModes.createModeMenu('#mode-menu', this, this._setModeToLocal);
        
        // Create the chat object.
        this._oChat = new Chat(oWorkspace, oSocket);

        this._oSocket.bind('message', this, this._handleServerAction);

        oShortcutHandler.registerShortcut('T', $('#title-shortcut-wrapper'), 'right', 20)
        oShortcutHandler.registerShortcut('L', $('#mode-shortcut-wrapper'), 'right', 20)
        oShortcutHandler.registerShortcut('D', $('#download-menu-shortcut-wrapper'), 'right')
        oShortcutHandler.registerShortcut('F', $('#fork-menu-shortcut-wrapper'),     'right')
        oShortcutHandler.registerShortcut('S', $('#settings-menu-shortcut-wrapper'), 'right')

        if (!IS_SNAPSHOT)
        {
            oShortcutHandler.registerShortcut('E', $('#edit-button'), 'left')
            oShortcutHandler.registerShortcut('C', $('#chat-menu-shortcut-wrapper'), 'right')
            oShortcutHandler.registerShortcut('K', $('#link-menu-shortcut-wrapper'), 'right')
        }
    },
    
    setTitle: function(sTitle)
    {
        $('#title .toolbar-item-selection').text(sTitle);
        $('#title-input').val(sTitle);
        $('#title .toolbar-item-btn').attr('title', sTitle);
    },
    
    setMode: function(oMode)
    {
        $('#mode .toolbar-item-selection').text(oMode.getDisplayName());
    },

    setIsEditing: function(bIsEditing)
    {
        // Toggle edit button style.
        $('#edit-button').toggleClass('on', bIsEditing);

        // Toggle mode menu editability.
        $('.menu').toggleClass('disabled', !bIsEditing);
        
        // Toggle title editability.
        $('#title-input, #title-save').prop('disabled', !bIsEditing);
        $('#title .hidden-focusable a').attr('tabIndex', (bIsEditing ? -1 : 1));
        if ($('.toolbar-item.open').is('#title'))
            $('#title .hidden-focusable a').focus();

        // Show the "edit mode required" message.
        $('.edit-mode-message').toggle(!bIsEditing);

    },
    
    contains: function(jElem)
    {
        // #snapshot-notify-bar is a hack . . . it functions like unused toolbar.
        return jElem.closest('#toolbar-top,#toolbar-left,#snapshot-notify-bar').length > 0;
    },
    
    focus: function()
    {
        oHelpers.assert(false, 'The toolbar should only receive focus manually.')
    },
    
    onBlur: function()
    {
         this._closeOpenDropdown();
    },
        
    onEvent: function(oEvent)
    {
        // Get data.
        var jTarget = $(oEvent.target);
        var jActiveElem = $(document.activeElement);
        var sEventType = oEvent.type;
        
        // Get target and active items (if any).
        var jTargetToolbarItem = jTarget.parents('.toolbar-item');
        var jActiveToolbarItem = jActiveElem.parents('.toolbar-item');
        
        // Toggle dropdowns on click.
        if (sEventType == 'mousedown')
        {
            if (jTarget.closest('.toolbar-item-btn').length)
            {
                if (jTargetToolbarItem[0] == jActiveToolbarItem[0])
                {
                    this._blur();
                }
                else
                {
                    this._closeOpenDropdown();
                    if (!jTargetToolbarItem.is('.disabled'))
                        this._openDropdown(jTargetToolbarItem);
                }
                return;
            }
            
            // Blur when clicking directly on the toolbar (e.g. not on dropdown).
            if (jActiveToolbarItem.length && !jTargetToolbarItem.length)
            {
                this._blur();
                return;
            }
        }
        
        /* Close dropdown on focus out */
        if (sEventType == 'focusin')
        {
            var jOpenDropdown = $('.toolbar-item.open');
            if (jActiveToolbarItem.length)
            {
                if (jOpenDropdown.length)
                {
                    if (!jOpenDropdown.is(jActiveToolbarItem))
                    {
                        this._closeOpenDropdown();
                        this._openDropdown(jActiveToolbarItem)
                    }
                }
                else
                    this._openDropdown(jActiveToolbarItem)
            }
            else
                this._closeOpenDropdown();
            return;
        }

        if (sEventType == 'keydown')
        {
            // Set title on ENTER.
            if (jActiveToolbarItem.is('#title') && oEvent.which == 13 /* ENTER */)
            {
                this._setTitleToLocal();
                oEvent.preventDefault();
                return;
            }
            
            // Download on ENTER.
            if (jActiveToolbarItem.is('#download-menu') && oEvent.which == 13 /* ENTER */)
            {
                this._download();
                return;
            }            
        }
        
        if (sEventType == 'click')
        {
            // Set title on button click.
            if (jTarget.is('#title-save'))
            {
                this._setTitleToLocal();
                return;
            }
            
            // Toggle editing on button click.
            var jEditButton = jTarget.closest('#edit-button');
            if (jEditButton.length)
            {
                this._toggleEditMode(jEditButton.hasClass('on'));
                return;
            }
            
            // Download document
            if (jTarget.closest('#download').length)
            {
                this._download();
                return;
            }       

            // Create snapshot
            if (jTarget.is('#snapshot-button'))
            {
                this._oSocket.send('snapshotDocument');
            }

        }
        
        /* Forward language events to menu. */
        if (jActiveToolbarItem.is('#mode'))
        {
            this._oModeMenu.onEvent(oEvent);
            return;
        }
        
        /* Forward chat events to chat. */
        if (jActiveToolbarItem.is('#chat-menu'))
        {
            this._oChat.onEvent(oEvent);
            return;
        }        

    },
    
    //////////////// HELPERS //////////////// 
    
    _openDropdown: function(jItem)
    {
        // Open dropdown
        if (!jItem.hasClass('open'))
        {
            jItem.addClass('open');
            jItem.find(':focusable').first().focus().select();            
        }
        
        /* Notify chat. */
        if (jItem.is('#chat-menu'))
            this._oChat.onOpen();
    },
    
    _closeOpenDropdown: function()
    {
        // Close dropdown.
        var jItem = $('.toolbar-item.open');
        jItem.removeClass('open').scrollTop(0);
        
        /* Notify chat. */
        if (jItem.is('#chat-menu'))
            this._oChat.onClose();

    },
    
    _blur: function()
    {
        this._oWorkspace.blurFocusedObject(this);    
    },
    
    _setModeToLocal: function(oMode)
    {
        this._oSocket.send('setMode', { sMode: oMode.getName() });
        this.setMode(oMode);
        this._oWorkspace.setEditorMode(oMode);
        this._blur();
    },
    
    _setTitleToLocal: function()
    {
        var sTitle = $('#title-input').val();
        this._oSocket.send('setDocumentTitle', { 'sTitle': sTitle });
        this.setTitle(sTitle);
        this._blur();    
    },
    
    _download: function()
    {
        var sHref = window.location.href;
        if (sHref[-1] != '/')
        {
            sHref += '/'
        }
        var sFilename = $('#download-as').val();
        window.location.href = sHref + 'download?filename=' + sFilename;
        this._blur();
    },
    
    _toggleEditMode: function(bIsCurrentlyEditing)
    {
        if (bIsCurrentlyEditing) // Release edit rights.
        {
            this._oSocket.send('releaseEditRights');
            this._oWorkspace.setIsEditing(false);
        }
        else
        {
            // TODO: Make the button look like it's doing something.
            this._oSocket.send('requestEditRights', this._oWorkspace.getEditorSelection());
        }
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'addSnapshot':
                $('#snapshots #placeholder').remove();
                var sUrl = document.location.origin + '/v/' + oAction.oData.sID;
                var sDate = oHelpers.formatDateTime(new Date(oAction.oData.oDateCreated));
                var jSnapshot = $('<a class="snapshot-link"><span class="date"></span><span class="url"></span></a>');
                jSnapshot.find('span.date').text(sDate);
                jSnapshot.find('span.url').text(sUrl);
                jSnapshot.attr('href', sUrl).appendTo('#snapshots');
                break;

            default:
                return false;
        }

        return true;
    }
});
