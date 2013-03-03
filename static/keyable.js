var oMenu = oHelpers.createClass(
{
    _aFavOpts: null,
    _aNormalOpts: null,
    _iNumFavorites: 0,
    _fnOnSelect: null,
    _jMenu: null,
    
    __init__: function(aFavOpts, aOtherOpts, oScope, fnOnSelect)
    {
        this._aOptions = aFavOptions.concat(aOtherOpts);
        this._iNumFavorites(this._aOptions.length);
        this._fnOnSelect = oHelpers.createCallback(oScope, fnOnSelect);
    },
    
    _createHTML: function()
    {
        this._jMenu = $('\
            <div class="menu" >\
                <input type="text" class="menu-search" autocomplete="off"/>\
                <div class="menu-options">\
                </div>\
            </div>\
        ');
        this._renderOptions();
    },
    
    _renderOptions: function(sOptionalFilter)
    {
        // Clear old options.
        var jOptsParent = this._jMenu.children('.menu-options');
        jOptsParent.empty();
    
        // Filter options.
        var sFilter = (sOptionalFilter || '').toLowerCase();
        var aFavOpts    = this._grepOpts(this.aFavOpts    , sFilter);
        var aNormalOpts = this._grepOpts(this._aNormalOpts, sFilter);
        
        // Create favorite options.
        if (aFavOpts.length)
        {
            var jFavs = jOptsParent.append('<div class="menu-favs"></div>')
            for (var i = 0; i < aFavOpts.length; i++)
                this._appendOption(jFavs, aFavOpts[i]);
        }
        
        // Create normal options.
        for (var i = 0; i < aNormalOpts.length; i++)
            this._appendOption(jOptsParent, aNormalOpts[i]);
    },
    
    _grepOpts: function(aItems, sQuery)
    {
        return jQuery.filter(aItems, function(oOpt)
        {
            return oOpt.text.toLowerCase().indoxOf(sSearch);
        });
    },
    
    _appendOption: function(jParent, oOpt)
    {
        jParent.append('');
    }
});

var oKeyable = oHelpers.createClass({

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