
/*
    TODO: This is unused and untested code.
*/

var Toolbar = oHelpers.createClass(
{
    /* External dependencies */
    _oSocket: null,
    _oWorkspace: null,
    
    /* Internal state */
    _oModeMenu: null,
    
    __type__: 'Toolbar',    

    __init__: function(oSocket, oWorkspace)
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
    
    contains: function(jElem)
    {
        return jElem.closest('#toolbar').length > 0;
    },
    
    focus: function()
    {
        this._openDropdown($('#title')); // TODO: This is a hack.
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
                    this._openDropdown(jTargetToolbarItem)
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
                this._oWorkspace.setIsEditing(!jEditButton.hasClass('on'));
                this._blur();
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
    }
});
