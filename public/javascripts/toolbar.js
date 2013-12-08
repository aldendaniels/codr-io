define(function(require)
{
    // Dependencies.
    var $        = require('lib/jquery'),
        oHelpers = require('helpers/helpers-web'),
        oModes   = require('edit-control/modes'),
        Chat     = require('chat');

    return oHelpers.createClass(
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
            this._oModeMenu = oModes.createModeMenu('#mode-menu', this, this._setModeToLocal);
            
            // Create the chat object.
            this._oChat = new Chat(oWorkspace, oSocket);
            this._oSocket.bind('message', this, this._handleServerAction);
    
            // Bind shorctut handlers.
            oShortcutHandler.registerShortcut('T', $('#toolbar-item-title'),    -15);
            oShortcutHandler.registerShortcut('L', $('#toolbar-item-mode'),     -15);
            oShortcutHandler.registerShortcut('D', $('#toolbar-item-download'),  12);
            oShortcutHandler.registerShortcut('F', $('#toolbar-item-fork'),      12);
            if (!IS_SNAPSHOT)
            {
                oShortcutHandler.registerShortcut('C', $('#toolbar-item-chat'),  12);
                oShortcutHandler.registerShortcut('K', $('#toolbar-item-link'),  12);
            }
            
            // Make editable for non-snapshoht files.
            if (IS_SNAPSHOT)
            {    
                // Toggle mode menu editability.
                $('.menu').addClass('disabled');
                
                // Toggle title editability.
                $('#title-input, #title-save').prop('disabled', true);
                $('#title .hidden-focusable a').attr('tabIndex', -1);
                
                // Show the "edit mode required" message.
                $('.edit-mode-message').show();
            }
        },
        
        setTitle: function(sTitle)
        {
            $('#toolbar-item-title .toolbar-item-selection').text(sTitle);
            $('#title-input').val(sTitle);
            $('#download-as').val(sTitle);
            $('#toolbar-item-title .toolbar-item-btn').attr('title', sTitle);
        },
        
        setMode: function(oMode)
        {
            $('#toolbar-item-mode .toolbar-item-selection').text(oMode.getDisplayName());
            $('BODY').toggleClass('mode-html',       oMode.getName() == 'html');
            $('BODY').toggleClass('show-html-tools', oMode.getName() == 'html');
        },
        
        contains: function(jElem)
        {
            // #snapshot-notify-bar is a hack . . . it functions like unused toolbar.
            return jElem.closest('#toolbar-top,#toolbar-left,#snapshot-notify-bar,#html-tools').length > 0;
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
                }
                
                // Show/Hide HTML tools.
                if (jTarget.closest('#html-tools-btn').length)
                {
                    $('BODY').toggleClass('show-html-tools');
                }
                
                return;
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
                if (jActiveToolbarItem.is('#toolbar-item-title') && oEvent.which == 13 /* ENTER */)
                {
                    this._setTitleToLocal();
                    oEvent.preventDefault();
                    return;
                }
                
                // Download on ENTER.
                if (jActiveToolbarItem.is('#toolbar-item-download') && oEvent.which == 13 /* ENTER */)
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
            if (jActiveToolbarItem.is('#toolbar-item-mode'))
            {
                this._oModeMenu.onEvent(oEvent);
                return;
            }
            
            /* Forward chat events to chat. */
            if (jActiveToolbarItem.is('#toolbar-item-chat'))
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
                oHelpers.findFirstChild(jItem, this, function(eChild)
                {
                    return oHelpers.isFocusable(eChild);
                }).focus().select();           
            }
            
            /* Notify chat. */
            if (jItem.is('#toolbar-item-chat'))
                this._oChat.onOpen();
        },
        
        _closeOpenDropdown: function()
        {
            // Close dropdown.
            var jItem = $('.toolbar-item.open');
            jItem.removeClass('open').scrollTop(0);
            
            /* Notify chat. */
            if (jItem.is('#toolbar-item-chat'))
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
    
        _handleServerAction: function(oAction)
        {
            switch(oAction.sType)
            {
                case 'addSnapshot':
                    $('#snapshots #placeholder').remove();
                    var sUrl = document.location.origin + '/v/' + oAction.oData.sID;
                    var sDate = oHelpers.formatDateTime(oAction.oData.oDateCreated);
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
});