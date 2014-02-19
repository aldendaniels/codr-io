define(function(require)
{
    // Dependencies.
    var $        = require('lib/jquery'),
        oHelpers = require('helpers/helpers-web');
        
    return oHelpers.createClass(
    {
        _jDropdown: null,
        
        __init__: function(jDropdown, oSubUIHandler, oWorkspace)
        {
            // Validate element.
            this._jDropdown  = $(jDropdown);
            oHelpers.assert(this._jDropdown.hasClass('toolbar-item'), 'A toolbar item is expected.');
            
            // Save sub (inner) UI handler.
            this._oSubUIHandler = oSubUIHandler || null;
            
            // Register with UI Root.
            this._oWorkspace = oWorkspace;
            this._oWorkspace.registerUIHandler(this, true /* modal */);
        },
        
        // UI HANDLER METHOD
        contains: function(jElem)
        {
            return jElem.closest(this._jDropdown).length > 0;
        },
        
        // UI HANDLER METHOD
        onFocusIn: function()
        {
            if (!this._jDropdown.hasClass('disabled'))
            {
                this._jDropdown.addClass('open');
                if (this._oSubUIHandler && this._oSubUIHandler.onFocusIn)
                    this._oSubUIHandler.onFocusIn();
            }
        },
        
        // UI HANDLER METHOD
        onFocusOut: function()
        {
            this._jDropdown.removeClass('open').scrollTop(0);
            if (this._oSubUIHandler && this._oSubUIHandler.onFocusOut)
                this._oSubUIHandler.onFocusOut();
        },
        
        // UI HANDLER METHOD
        onEvent: function(oEvent)
        {
            // Toggle button on click.
            var jTarget = $(oEvent.target);
            var sEventType = oEvent.type;
            if (sEventType == 'mousedown' && jTarget.closest('.toolbar-item-btn').length)
            {
                this._toggle();
                return;
            }
                        
            // Forward events to handler.
            if (this._oSubUIHandler && this._oSubUIHandler.onEvent)
                this._oSubUIHandler.onEvent(oEvent);
        },
        
        _toggle: function()
        {
            if (!this._jDropdown.hasClass('open'))
            {
                oHelpers.findFirstChild(this._jDropdown, this, function(eChild)
                {
                    return oHelpers.isFocusable(eChild);
                }).focus().select();
            }
            else
                this._oWorkspace.blurFocusedObject();
        }
    });
});