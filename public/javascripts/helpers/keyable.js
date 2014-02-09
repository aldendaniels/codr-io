define(function(require)
{
    // Dependencies.
    var $        = require('lib/jquery'),
        oHelpers = require('helpers/helpers-web');

    return oHelpers.createClass({
    
        // Constant members.
        _jParent: null,
        _sIDAttr: '',
        _sKeyableSelector: '',
    
        // Non-constant members.
        _bAttached: false,
        _jKeyables: null,
        _jSelected: null,
    
        __init__: function(jParent, sIDAttr, sKeyableSelector)
        {
            this._jParent = $(jParent);
            this._sIDAttr = sIDAttr;
            this._sKeyableSelector = sKeyableSelector;
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
            this._jKeyables = this._jParent.find(this._sKeyableSelector);
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
});


