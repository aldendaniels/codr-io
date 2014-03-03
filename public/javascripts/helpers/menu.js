define(function(require)
{
    // Dependencies.
    // Requires jQuery.
    var oHelpers    = require('helpers/helpers-web'),
        MenuKeyNav  = require('helpers/menu-key-nav');

    return oHelpers.createClass(
    {
        _aFavOptions: null,
        _aNormalOptions: null,
        _iNumFavorites: 0,
        _fnOnSelect: null,
        _jMenu: null,
        _oMenuKeyNav: null,
        _sLastQuery: '',
        
        __init__: function(aOptions, jParent, iNumFavoriteOptions, oScope, fnGetKey, fnGetDisplayText, fnOnSelect)
        {
            // Save options.
            this._aNormalOptions = aOptions.slice(iNumFavoriteOptions);
            this._aFavOptions = aOptions.slice(0, iNumFavoriteOptions);
            
            // Map options by key.
            this._oOptionsByKey = {};
            for (var iOptionIndex in aOptions)
            {
                var oOption = aOptions[iOptionIndex];
                this._oOptionsByKey[fnGetKey(oOption)] = oOption;
            }
            
            // Save callbacks.
            this._fnGetKey          = oHelpers.createCallback(oScope, fnGetKey);
            this._fnGetDisplayText  = oHelpers.createCallback(oScope, fnGetDisplayText);
            this._fnOnSelect        = oHelpers.createCallback(oScope, fnOnSelect);
            
            // Init.
            this._jMenu = $(
                '<div class="menu" >' +
                    '<div class="menu-search">'+
                        '<input type="text" autocomplete="off"/>' +
                    '</div>' + 
                    '<div class="menu-options" tabIndex="-1">' + // Tab index for FF.
                    '</div>' +
                '</div>'
            );
            this._oMenuKeyNav = new MenuKeyNav(this._jMenu.find('.menu-options'), this, this._onSelect);
            this._renderOptions();
            $(jParent).append(this._jMenu);
        },
        
        focusInput: function()
        {
            this._jMenu.find('.menu-search input').focus();
        },
        
        reset: function()
        {
            this._jMenu.find('input').val('');
            this._renderOptions();
        },
        
        onEvent: function(oEvent)
        {
            // Filter on key up.
            if (oEvent.type == 'keyup')
            {
                var sQuery = this._jMenu.find('.menu-search input').val();
                if (this._sLastQuery != sQuery)
                    this._renderOptions(sQuery);
                this._sLastQuery = sQuery;
            }
            
            // Forward other events to MenuKeyNav.
            this._oMenuKeyNav.setDisabled($('.menu').hasClass('disabled'));            
            this._oMenuKeyNav.onEvent(oEvent);
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
            
            // Update DOM.
            this._oMenuKeyNav.update();
        },
        
        _grepOptions: function(aOptions, sSearch)
        {
            return $.grep(aOptions, oHelpers.createCallback(this, function(oOption)
            {
                return this._fnGetDisplayText(oOption).toLowerCase().indexOf(sSearch) != -1;
            }));
        },
        
        _appendOption: function(jParent, oOption)
        {
            var jOption = $('<div class="option mode"></div>');
            jOption.text(this._fnGetDisplayText(oOption)).attr('id', this._fnGetKey(oOption));
            jParent.append(jOption);
        },
        
        _onSelect: function(sOptionID)
        {
            this._fnOnSelect(this._oOptionsByKey[sOptionID]);
        }
    });
});