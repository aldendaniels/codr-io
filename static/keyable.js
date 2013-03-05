var Menu = oHelpers.createClass(
{
    _aFavOptions: null,
    _aNormalOptions: null,
    _iNumFavorites: 0,
    _fnOnSelect: null,
    _jMenu: null,
    _oKeyable: null,
    _sLastQuery: '',
    
    __init__: function(aOptions, aFavKeys, jParent, oScope, fnOnSelect)
    {
        // Save copy of options array.
        this._aNormalOptions = aOptions.slice();
        
        // Extract Favorites.
        this._aFavOptions = [];
        for (var iFavKeyIndex in aFavKeys)
        {
            for (var iOptionIndex in this._aNormalOptions)
            {
                var sFavKey = aFavKeys[iFavKeyIndex];
                var oOption = this._aNormalOptions[iOptionIndex];
                if (oOption.sKey == sFavKey)
                {
                    this._aFavOptions.push(oOption);
                    this._aNormalOptions.splice(iOptionIndex, 1);
                    break;
                }
            }
        }
        
        // Save select callback.
        this._fnOnSelect = oHelpers.createCallback(oScope, fnOnSelect);

        // Init.
        this._jMenu = $(
            '<div class="menu" >' + 
                '<input type="text" class="menu-search" autocomplete="off"/>' + 
                '<div class="menu-options">' +
                '</div>' +
            '</div>'
        );
        this._oKeyable = new Keyable(this._jMenu);
        this._renderOptions();
        jParent.append(this._jMenu);
        this._oKeyable.update();
    },

    attach: function()
    {
        oHelpers.on(window, 'keydown.menu', this, this._onKeyDown);
        oHelpers.on(window, 'keyup.menu', this, this._onKeyUp);
        oHelpers.on(this._jMenu, 'click', this, this._selectCur);
        this._oKeyable.attach();
        this._jMenu.find('.menu-search').focus();

    },

    detach: function()
    {
        $(window).off('keydown.menu');
        $(window).off('keyup.menu');
        this._oKeyable.detach();
    },
        
    _renderOptions: function(sOptionalFilter)
    {
        // Clear old options.
        var jOptionsParent = this._jMenu.children('.menu-options');
        jOptionsParent.empty();
    
        // Filter options.
        var sSearch = (sOptionalFilter || '').toLowerCase();
        var aFavOptions    = this._grepOptions(this._aFavOptions   , sSearch);
        var aNormalOptions = this._grepOptions(this._aNormalOptions, sSearch);
        
        // Create favorite options.
        if (aFavOptions.length)
        {
            var jFavs = $('<div class="menu-favs"></div>').appendTo(jOptionsParent);
            for (var i = 0; i < aFavOptions.length; i++)
                this._appendOption(jFavs, aFavOptions[i]);
        }
        
        // Create normal options.
        for (var i = 0; i < aNormalOptions.length; i++)
            this._appendOption(jOptionsParent, aNormalOptions[i]);
        
        // Update keyable.
        this._oKeyable.update();
    },
    
    _grepOptions: function(aOptions, sSearch)
    {
        return jQuery.grep(aOptions, function(oOption)
        {
            return oOption.sText.toLowerCase().indexOf(sSearch) != -1 ||
                   oOption.sKey.toLowerCase().indexOf(sSearch) != -1;
        });
    },
    
    _appendOption: function(jParent, oOption)
    {
        var jOption = $('<div class="option keyable mode"></div>');
        jOption.text(oOption.sText).attr('id', oOption.sKey);
        jParent.append(jOption);
    },
    
    _scrollIntoView: function(jElem)
    {
        // Calculate the element's position.
        var jViewport = jElem.offsetParent();
        var iTop = jElem.position().top - parseInt(jViewport.css('paddingTop'));
        var iBottom = jViewport[0].clientHeight - (iTop + jElem[0].offsetHeight)
            
        // Scroll element vertically into view.
        var iScrollTop = null;
        if (iTop < 0)
        {
            iScrollTop = jViewport.scrollTop() + iTop;
            jViewport.scrollTop(iScrollTop);
        }
        else if (iBottom < 0)
        {
            iScrollTop = jViewport.scrollTop() - iBottom;
            jViewport.scrollTop(iScrollTop);
        }
    },

    _onKeyDown: function(oEvent)
    {
        switch (oEvent.which)
        {
            // Select next down div
            case 40: // Down arrow
                this._oKeyable.moveDown();
                this._scrollIntoView(this._oKeyable.getSelected());
                oEvent.preventDefault();
                
                break;
            // Select next up div
            case 38: // Up arrow
                this._oKeyable.moveUp();
                this._scrollIntoView(this._oKeyable.getSelected());
                oEvent.preventDefault();
                break;
    
            // On choice
            case 13:
                this._selectCur();
                break;
            
            default:
                this._jMenu.find('.menu-search').focus();
        }        
    },

    _onKeyUp: function()
    {
        var sQuery = this._jMenu.find('.menu-search').val();
        if (this._sLastQuery != sQuery)
            this._renderOptions(sQuery);
        
        this._sLastQuery = sQuery;
    },
    
    _selectCur: function()
    {
        var sKey = this._oKeyable.getSelected().attr('id');
        this._fnOnSelect(sKey);
    },
});

var Keyable = oHelpers.createClass({

    // Constant members.
	_jParent: null,
	_sIDAttr: '',

	// Non-constant members.
	_bAttached: false,
    _jKeyables: null,
    _jSelected: null,

	__init__: function(jParent, sIDAttr)
	{
        this._jParent = $(jParent);
		this._sIDAttr = sIDAttr;
		this.update();
	},
	
	attach: function()
	{
		this._jSelected.addClass('current');
		this._bAttached = true;
	},
	
	detach: function()
	{
		this._jSelected.removeClass('current');
		this._bAttached = false;		
	},
	
	update: function(bMaintainSel)
	{
		// Maintain selection.
		this._jKeyables = this._jParent.find('.keyable:visible');
        if (bMaintainSel && this._jSelected)
		{
			var sSelID = this._jSelected.attr(this._sIDAttr);
			var jSelected = this._jKeyables.filter('[' + this._sIDAttr + '="' + sSelID + '"]');
			if (jSelected)
			{
				this.select(jSelected);
				return;
			}
		}
		
		// Select the first item.
		this.select($(this._jKeyables[0]));
	},
	
	select: function(jElem)
	{
		this._jSelected = $(jElem);
		if (this._bAttached)
		{
			this._jKeyables.removeClass('current');
			this._jSelected.addClass('current');
		}
	},
	
	moveDown: function()
	{
		var iCurIndex = this._jKeyables.index(this._jSelected);
		if (iCurIndex < this._jKeyables.length - 1)
			this.select(this._jKeyables[iCurIndex + 1], true);
	},
	
	moveUp: function()
	{
		var iCurIndex = this._jKeyables.index(this._jSelected);
		if (iCurIndex > 0)
			this.select(this._jKeyables[iCurIndex - 1], true);		
	},
	
	getSelected: function()
	{
		return this._jSelected;
	}
});

