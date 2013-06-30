
var Toolbar = oHelpers.createClass(
{
    /* External dependencies */
    _oSocket: null,
    _oWorkspace: null,
    
    /* Internal state */
    _oModeMenu: null,
    
    __type__: 'Toolbar',    

    __init__: function(oWorkspace, oSocket)
    {
        // Save dependencies.
        this._oSocket = oSocket;
        this._oWorkspace = oWorkspace;
        
        // Create the mode menu.
        this._oModeMenu = new Menu(g_oModes.aModes, $('#mode-menu'), this,
            function(oMode) { return $.inArray(oMode, g_oModes.aFavModes) != -1; }, // Is favorite.
            function(oMode) { return oMode.getName();                            }, // Get key
            function(oMode) { return oMode.getDisplayName();                     }, // Get item display text.
            this._setModeToLocal
        );
    },
    
    setTitle: function(sTitle)
    {
        $('#title .toolbar-item-selection').text(sTitle);
        $('#title-input').val(sTitle);
    },
    
    setMode: function(oMode)
    {
        $('#mode .toolbar-item-selection').text(oMode.getDisplayName());
    },
    
    setIsEditing: function(bIsEditing)
    {
        $('.menu').toggleClass('disabled', !bIsEditing);
        $('#edit-button').toggleClass('on', bIsEditing);
        $('#title-input').prop('disabled', !bIsEditing);
        $('#title-save').prop('disabled', !bIsEditing);
        $('#title .hidden-focusable a').attr('tabIndex', (bIsEditing ? -1 : 1));
        $('.edit-mode-message').text((bIsEditing ? '': 'Edit mode is requried to make changes.'));
    },
    
    contains: function(jElem)
    {
        return jElem.closest('#toolbar').length > 0;
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
                    this._openDropdown(jTargetToolbarItem);
                }
                return;
            }
            
            // Blur when clicking directly on the toolbar (e.g. not on dropdown).
            if (jTarget.is('#toolbar') && jActiveToolbarItem)
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
        
        /* Forward language events to menu. */
        if (jActiveToolbarItem.is('#mode'))
        {
            this._oModeMenu.onEvent(oEvent);
            return;
        }
        
        if (sEventType == 'keydown')
        {
            // Set title on ENTER.
            if (jActiveToolbarItem.is('#title') && oEvent.which == 13 /* ENTER */)
            {
                this._setTitleToLocal();
            }
            return;
        }
        
        if (sEventType == 'click')
        {
            // Set title on button click.
            if (jTarget.is('#title-save'))
            {
                this._setTitleToLocal();
            }
            
            // Toggle editing on button click.
            var jEditButton = jTarget.closest('#edit-button');
            if (jEditButton.length)
            {
                this._toggleEditMode(jEditButton.hasClass('on'));
            }
            
            // Show/Hide people pane.
            if (jTarget.closest('#people-pane-button').length)
            {
                this._oWorkspace.togglePeoplePane();
            }
            
            // Download document
            if (jTarget.closest('#download-button').length)
            {
                var sHref = window.location.href;
                if (sHref[-1] != '/')
                {
                    sHref += '/'
                }
                window.location.href = sHref + 'download';
            }
            
            return;                
        }
    },
    
    //////////////// HELPERS //////////////// 
    
    _openDropdown: function(jItem)
    {
        if (!jItem.hasClass('open'))
        {
            jItem.addClass('open');
            jItem.find(':focusable').first().focus().select();            
        }
    },
    
    _closeOpenDropdown: function()
    {
        $('.toolbar-item.open').removeClass('open');
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
        $('#title .toolbar-item-selection').text(sTitle);
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
    }
});
