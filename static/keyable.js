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
        this._aFavOptions = [];
        this._aNormalOptions = [];

        jQuery.each(aOptions, oHelpers.createCallback(this, function(i, oOption)
        {
            if (jQuery.inArray(oOption.sKey, aFavKeys))
                this._aFavOptions.push(oOption);
            else
                this._aNormalOptions.push(oOption);
        }));
        
        this._fnOnSelect = oHelpers.createCallback(oScope, fnOnSelect);

        this._createHTML(jParent);
        this._oKeyable = new Keyable(this._jMenu);

    },

    attachEvents: function()
    {
        oHelpers.on(window, 'keydown.menu', this, this._onKeyDown);
        oHelpers.on(window, 'keyup.menu', this, this._onKeyUp);
    },

    detachEvents: function()
    {
        $(window).off('keydown.menu');
        $(window).off('keyup.menu');
    },
    
    _createHTML: function(jParent)
    {
        this._jMenu = $(
            '<div class="menu" >' + 
                '<input type="text" class="menu-search" autocomplete="off"/>' + 
                '<div class="menu-options">' +
                '</div>' +
            '</div>'
        );
        jParent.append(this._jMenu);
        this._renderOptions();
    },
    
    _renderOptions: function(sOptionalFilter)
    {
        // Clear old options.
        var jOptionsParent = this._jMenu.children('.menu-options');
        jOptionsParent.empty();
    
        // Filter options.
        var sFilter = (sOptionalFilter || '').toLowerCase();
        var aFavOptions    = this._grepOptions(this._aFavOptions   , sFilter);
        var aNormalOptions = this._grepOptions(this._aNormalOptions, sFilter);
        
        // Create favorite options.
        if (aFavOptions.length)
        {
            var jFavs = jOptionsParent.append('<div class="menu-favs"></div>')
            for (var i = 0; i < aFavOptions.length; i++)
                this._appendOption(jFavs, aFavOptions[i]);
        }
        
        // Create normal options.
        for (var i = 0; i < aNormalOptions.length; i++)
            this._appendOption(jOptionsParent, aNormalOptions[i]);
    },
    
    _grepOptions: function(aItems, sQuery)
    {
        return jQuery.grep(aItems, function(oOpt)
        {
            return oOpt.sText.toLowerCase().indexOf(sQuery) != -1 ||
                   oOpt.sKey.toLowerCase().indexOf(sQuery) != -1;
        });
    },
    
    _appendOption: function(jParent, oOpt)
    {
        jParent.append('<div class="option keyable mode" id="' + oOpt.sKey + '">' + oOpt.sText + '</div>');
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
            oEvent.preventDefault();
            
            break;
        // Select next up div
        case 38: // Up arrow
            this._oKeyable.moveUp();
            oEvent.preventDefault();
            break;

        // On choice
        case 13:
            var sKey = this._oKeyable.getSelected().attr('id');
            this._fnOnSelect(sKey);
            break;
        default:
            this._jMenu.find('.menu-search').focus();
        }
        
        this._scrollIntoView(this._oKeyable.getSelected());
    },

    _onKeyUp: function()
    {
        var sQuery = this._jMenu.find('.menu-search').val();
        if (this._sLastQuery != sQuery)
            this._renderOptions(sQuery);

        this._sLastQuery = sQuery;
    }
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

