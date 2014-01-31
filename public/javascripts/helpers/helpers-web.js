define(function(require)
{
    // Dependencies
    var $        = require('lib/jquery'),
        oHelpers = require('./helpers-web-no-jquery');
        
    oHelpers.extendObj(oHelpers,
    {
        on: function(oElem, sEventName, oScope, fnCallback)
        {
            $(oElem).on(sEventName, oHelpers.createCallback(oScope, fnCallback));
        },
        
        isVisible: function(oElem)
        {
            // Opera reports offsetWidths and offsetHeights less than zero on some elements
            var eElem = $(oElem).get(0);
            return (eElem.offsetWidth > 0 || eElem.offsetHeight > 0) &&
                  !$(eElem).parents().addBack().filter(function()
                    {
                        return $.css( this, "visibility" ) === "hidden";
                    }).length;
        },
        
        isFocusable: function(oElem)
        {
            // Get info.
            var eElem = $(oElem).get(0);
            var sNodeName = eElem.nodeName.toLowerCase();
            var bHasTabIndex = !isNaN( $.attr( eElem, "tabindex" ) );
            
            // Is Focusable?
            var isFocusable;
            if (oHelpers.inArray(sNodeName, ['input', 'select', 'textarea', 'button', 'object']))
                isFocusable = !eElem.disabled;
            else if (sNodeName == 'a')
                isFocusable = bHasTabIndex || eElem.href;
            else
                isFocusable = bHasTabIndex;
            
            // Return True if the element is focusable and is visible.
            return isFocusable && this.isVisible(eElem);
        },
        
        findFirstChild: function(oElem, oScope, fnCallback)
        {
            return $(oElem).find('*').filter(function()
            {
                return oHelpers.createCallback(oScope, fnCallback)(this /* Current DOM Elem */)
            }).first();
        }
    });
    return oHelpers;
});