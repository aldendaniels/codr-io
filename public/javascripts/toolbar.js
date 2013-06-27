
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
    
    wantsEvent: function(sEventType)
    {
        return oHelpers.inArray(sEventType, ['mousedown', 'click', 'focusin', 'focusout']) ||
               this._oModeMenu.wantsEvent(sEventType);
    },
    
    contains: function(jElem)
    {
        return jElem.closest('#toolbar').length > 0;
    },
    
    focus: function()
    {
        this._openDropdown($('#title')); // TODO: This is a hack.
    },
    
    blur: function()
    {
         this._closeDropdown($('.toolbar-item.open'));
    },
    
    onEvent: function(oEvent)
    {
        // Get data.
        var jTarget = $(oEvent.target);
        var jActiveElem = $(document.ActiveElement);
        var sEventType = oEvent.type;

        // Get target and active items (if any).
        var jTargetToolbarItem = jTarget.parents('.toolbar-item');
        var jActiveToolbarItem = jActiveElem.parents('.toolbarItem');
        
        /* Forward language events to menu. */
        if (jActiveToolbarItem.is('#mode'))
        {
            this._oModeMenu.onEvent(oEvent);
            return;
        }
        
        switch (sEventType)
        {
            case 'mousedown':
                if (jTarget.closest('.toolbar-item-btn').length)
                {
                    if (jTargetToolbarItem == jActiveToolbarItem)
                    {
                        this._closeDropdown(jTargetToolbarItem);
                    }
                    else
                    {
                        this._openDropdown(jTargetToolbarItem)
                        oEvent.preventDefault();
                    }
                    return;
                }
                break;
                
            case 'click':
                                
                /* Set title on button click. */
                if (jTarget.is('#title-save'))
                {
                    this._setTitleToLocal();
                }
                
                /* Set edit button on click. */
                var jEditButton = jTarget.closest('#edit-button');
                if (jEditButton.length)
                {
                    this._oWorkspace.setIsEditing(!jEditButton.hasClass('on'));
                    this._oWorkspace.focusEditor();
                    return;
                }
                
                break;
                
            default:
               //console.log('Unhandled event.');
                
        }
    },
    
    //////////////// GENERIC DROPDOWN STUFF //////////////// 
    
    _openDropdown: function(jItem)
    {
        if (!jItem.hasClass('open'))
        {
            jItem.addClass('open');
            jItem.find(':focusable').first().focus().select();            
        }
    },
    
    _closeDropdown: function(jItem, bBlur)
    {
        jItem.removeClass('open');
    },
    
    //////////////// HANDLE USER CHANGES  //////////////// 
      
    _setModeToLocal: function(oMode)
    {
        this._oSocket.send('setMode', oMode.getKey());
        this.setMode(oMode);
        this._oWorkspace.setEditorMode(oMode);
        this._oWorkspace.blurFocusedObject(this);        
    },
    
    _setTitleToLocal: function()
    {
        var sTitle = $('#title-input').val();
        this._oSocket.send('setDocumentTitle', { 'sTitle': sTitle });
        $('#title .toolbar-item-selection').text(sTitle);
        this._oWorkspace.blurFocusedObject(this);        
    }
});
