define(function(require)
{
    // Dependencies
    // Requires jQuery.
    var oHelpers = require('./helpers-core');
        
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
        },
        
        getOrigin: function()
        {
            return window.location.href.replace(window.location.pathname, '');
        },
        
        isChrome: function()
        {
            return navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
        },
        
        isFF: function()
        {
            return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        },
        
        setTitleWithHistory: function(sTitle)
        {
            // HACK: In order for GC to notice that we've updated the title in history,
            //       the title has to be set after a replaceState call.
            if (this.isChrome())
                window.history.replaceState(null, '', window.location.pathname);
            
            document.title = sTitle;
        }
    });
    return oHelpers;
});