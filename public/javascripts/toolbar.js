
/*
    TODO: This is unused and untested code.
*/

var oToolbar = oHelpers.createClass(
{
    /* External dependencies */
    _oSocket: null,
    _fnBlur: null,
    
    /* Internal state */
    _oModeMenu: null,
    
    __init__: function(oSocket, fnBlur)
    {
        this._oSocket = oSocket;
        this._fnBlur = fnBlur;
        
        // Init the mode menu.
        this._oModeMenu = new Menu(aModes, aFavKeys, '#mode-menu', this, this._setMode);
    },
    
    onEvent: function(oEvent)
    {
        // Get data.
        var jTarget = $(oEvent.target);
        var jActiveElem = $(document.ActiveElement);
        var sEventType = oEvent.type;

        // Get target and active items (if any).
        var jTargetToolbarItem = jItemBtn.parents('.toolbar-item');
        var jActiveToolbarItem = jActiveElem.parents('.toolbarItem');
        
        /* Forward language events to menu. */
        if (jActiveToolbarItem.is('#mode'))
        {
            this._oModeMenu.onEvent(oEvent);
            return;
        }
        
        /* Toggle dropdown on mousedown. */
        var jItemBtn = jTarget.closest('.toolbar-item-btn');
        if (sEventType == 'mousedown' && jItemBtn.length)
        {
            if (jTargetToolbarItem == jActiveToolbarItem)
            {
                this._closeDropdown(jTargetToolbarItem);
                this._fnBlur();
            }
            else
            {
                this._openDropdown(jTargetToolbarItem)
            }
            return;
        }
        
        /* Open dropdown on focus. */
        if (sEventType == 'focus' && jTargetToolbarItem.length)
        {
            this._openDropdown(jTargetToolbarItem);
            return;
        }
        
        /* Close dropdown on blur. */
        if (sEventType == 'blur' && jTargetToolbarItem.length)
        {
            this._closeDropdown(jTargetToolbarItem);
            return;
        }
        
        /* Set title on click. */
        if (sEventType == 'click' && jTarget.is('#title-save'))
        {
            this._setTitle($('#title-input').val());
            return;
        }
        
        /* Set edit button on click. */
        var jEditButton = jTarget.closest('#edit-button');
        if (sEventType == 'click' && jEditButton.length)
        {
            this._setIsEditing(!jEditButton.hasClass('on'));
            return;
        }
    },
    
    //////////////// GENERIC DROPDOWN STUFF //////////////// 
    
    _openDropdown: function(jItem)
    {
        jItem.addClass('open');
        jItem.find(':focusable').first().focus();
    },
    
    _closeDropdown: function(jItem, bBlur)
    {
        jItem.removeClass('open');
    },
    
    //////////////// HANDLE USER CHANGES  //////////////// 
      
    _setMode: function(sMode)
    {
        console.log('TODO: Set mode.');
        this._fnBlur();
    },
    
    _setTitle: function(sTitle)
    {
        console.log('TODO: Set title.');
        this._fnBlur();
    },
    
    _setIsEditing: function(bIsEditing)
    {
        console.log('TOOD: Set is editing');
        this._fnBlur();
    }
});
