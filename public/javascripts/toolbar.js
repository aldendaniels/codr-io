
/*
    TODO: This is not functional. It's just a place holder.
*/

var oToolbar = oHelpers.createClass(
{
    /* External dependencies */
    _oSocket: null,
    _fnBlur: null,
    
    /* Internal state */
    _jOpenToolbarMenu: null,
    _oModeMenu: null,
    
    __init__: function(oSocket, fnBlur)
    {
        this._oSocket = oSocket;
        this._fnBlur = fnBlur;
        
        // Init the mode menu.
        this._oModeMenu = new Menu(aModes, aFavKeys, '#mode-menu', this, this._onModeChoice);
    },
    
    isOpenDropdown: function()
    {
        return !!this._jOpenToolbarMenu;
    },
    
    onEvent: function(sEventName, jTarget)
    {
        switch (sEventName)
        {
            case 'click':
                console.log('Toolbar click event!');
                break;
            
            case 'mousedown':
                console.log('Toolbar mousedown event!');
                break;
            
            case 'focus':
                console.log('Toolbar focus event!');
                break;
            
            case 'blur':
                console.log('Toolbar blur event!');
                break;
            
            case 'keypress':
                console.log('Toolbar keypress event.');
            
            default:
                console.log('Unhandeled toolbar event!');
        }
    },
    
    //////////////// GENERIC DROPDOWN STUFF //////////////// 
    
    _openDropdown: function(jMenuElem)
    {
        jMenuElem.addClass('open');
        this._jOpenTooblarMenu = jMenuElem;
    },
    
    _closeOpenDropdown: function(jMenuElem)
    {
        if (this._jOpenToolbarMenu)
        {
            this._jOpenToolbarMenu.removeClass('open');
            this._jOpenToolbarMenu = null;
            this._oWorkspace.focusEditor();
        }
    },
    
    //////////////// HANDLE USER CHANGES  //////////////// 
      
    _onModeChoice: function(sMode)
    {
        // TODO: ...
    },
    
    _onSavetoolbar-item-caption: function(stoolbar-item-caption)
    {
        // TODO: ...
    }
});
