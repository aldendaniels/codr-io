
define(function(require)
{
    // Dependencies.
    var $        = require('lib/jquery'),
        oHelpers = require('helpers/helpers-web');
        
    var setSessionInfoCallback = (function ()
    {
        var bIsSet = false;
        var sLocalKey = 'codr-io/local'
    
        function setSessionInfoCallback(oScope, fnOnResponse)
        {
            if (bIsSet)
            {
                oHelpers.assert(false, 'You can not call setSessionInfoCallback twice.');
                return;
            }
    
            var fnCallback = oHelpers.createCallback(oScope, fnOnResponse);
    
            // Call the callback now with possible stale data.
            if (getFromLocal() !== null)
                fnCallback(getFromLocal());
    
    
            // The data we sent wasn't clean. We need to update it, then call the callback a second time.
            getServerSessionInfo(fnCallback);
        }
    
        function supportsLocalStorage() {
            try {
                return 'localStorage' in window && window['localStorage'] !== null;
            } catch (e) {
                return false;
            }
        }
    
    
        function getFromLocal()
        {
            if (supportsLocalStorage())
            {
                var ret = window.localStorage.getItem(sLocalKey);
                if (ret)
                    return JSON.parse(ret);
                return null;
            }
    
            return null;
        }
    
        function setLocal(oNewInfo)
        {
            if (supportsLocalStorage())
                window.localStorage.setItem(sLocalKey, JSON.stringify(oNewInfo));
        }
    
        function getServerSessionInfo(fnCallback)
        {
            $.getJSON('/userInfo/', function(oResponse)
            {
                setLocal(oResponse);
                fnCallback(oResponse);
            });
        }
    
        return setSessionInfoCallback;
    })();
    
    function onAccountInfo(oInfo)
    {
        $('body').toggleClass('logged-in', oInfo.bLoggedIn);
    
        if (oInfo.bLoggedIn)
        {
            $('#home-greeting-username').text(oInfo.sUsername);
            $('#workspace-greeting-username').text(oInfo.sUsername);
        }
    }
    
    setSessionInfoCallback(this, onAccountInfo);
});