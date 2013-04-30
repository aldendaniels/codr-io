
/*
    TODO: This is unused and untested code.
*/

var oToolbar = oHelpers.createClass(
{
    /* External dependencies */
    _oSocket: null,
    _fnBlur: null,
    _fnSetIsEditing: null,
    
    /* Internal state */
    _oModeMenu: null,
    
    __init__: function(oSocket, fnBlur, fnSetIsEditing)
    {
        this._oSocket = oSocket;
        this._fnBlur = fnBlur;
        this._fnSetIsEditing = fnSetIsEditing;
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
            this._fnSetIsEditing(!jEditButton.hasClass('on'));
            return;
        }
    },
    
    //////////////// GENERIC DROPDOWN STUFF //////////////// 
    
    _openDropdown: function(jItem)
    {
        if (!jItem.hasClass('open'))
        {
            jItem.addClass('open');
            jItem.find(':focusable').first().focus();            
        }
    },
    
    _closeDropdown: function(jItem, bBlur)
    {
        jItem.removeClass('open');
    },
    
    //////////////// HANDLE USER CHANGES  //////////////// 
      
    _setMode: function(sMode)
    {
        this._oSocket.send('setMode', sMode);
        this._fnBlur();
    },
    
    _setTitle: function(sTitle)
    {
        this._oSocket.send('setTitle', sTitle);
        this._fnBlur();
    }
});
