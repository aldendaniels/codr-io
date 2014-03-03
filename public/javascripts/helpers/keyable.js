define(function(require)
{
    // Dependencies.
    // Requires jQuery.
    var oHelpers = require('helpers/helpers-web');

    return oHelpers.createClass({
    
        // Constant members.
        _jParent: null,
        _sIDAttr: '',
        _sKeyableSelector: '',
    
        // Non-constant members.
        _bAttached: false,
        _jKeyables: null,
        _jCurrent: null,
    
        __init__: function(jParent, sIDAttr, sKeyableSelector)
        {
            this._jParent = $(jParent);
            this._sIDAttr = sIDAttr;
            this._sKeyableSelector = sKeyableSelector;
            this.update();
        },
        
        attach: function()
        {
            this._jCurrent.addClass('current');
            this._bAttached = true;
        },
        
        detach: function()
        {
            this._jCurrent.removeClass('current');
            this._bAttached = false;        
        },
        
        update: function(bMaintainSel)
        {
            // Maintain current option.
            this._jKeyables = this._jParent.find(this._sKeyableSelector);
            if (bMaintainSel && this._jCurrent)
            {
                var sSelID = this._jCurrent.attr(this._sIDAttr);
                var jCurrent = this._jKeyables.filter('[' + this._sIDAttr + '="' + sSelID + '"]');
                if (jCurrent)
                {
                    this.setCurrent(jCurrent);
                    return;
                }
            }
            
            // Set the first item as the current item.
            this.setCurrent($(this._jKeyables[0]));
        },
        
        setCurrent: function(jElem)
        {
            this._jCurrent = $(jElem);
            if (this._bAttached)
            {
                this._jKeyables.removeClass('current');
                this._jCurrent.addClass('current');
            }
        },
        
        moveDown: function()
        {
            var iCurIndex = this._jKeyables.index(this._jCurrent);
            if (iCurIndex < this._jKeyables.length - 1)
                this.setCurrent(this._jKeyables[iCurIndex + 1], true);
        },
        
        moveUp: function()
        {
            var iCurIndex = this._jKeyables.index(this._jCurrent);
            if (iCurIndex > 0)
                this.setCurrent(this._jKeyables[iCurIndex - 1], true);        
        },
        
        getCurrent: function()
        {
            return this._jCurrent;
        }
    });
});


