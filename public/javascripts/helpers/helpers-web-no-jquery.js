define(function(require)
{
    // Dependencies
    var oHelpers = require('./helpers-core');
        
    oHelpers.extendObj(oHelpers,
    {        
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