define(function(require)
{
    // Dependencies
    var $        = require('lib/jquery');
        oHelpers = require('./helpers-core');
        
    oHelpers.extendObj(oHelpers,
    {
        on: function(oElem, sEventName, oScope, fnCallback)
        {
            $(oElem).on(sEventName, oHelpers.createCallback(oScope, fnCallback));
        }
    });
    
    return oHelpers;
});