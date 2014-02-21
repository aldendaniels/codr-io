define(function(require)
{
    return function (url, width, height, fnOnClose)
    {
        var leftPosition, topPosition;
        
        //Allow for borders.
        leftPosition = (window.screen.width / 2) - ((width / 2) + 10);
        
        //Allow for title and status bars.
        topPosition = (window.screen.height / 2) - ((height / 2) + 50);
        
        //Open the window.
        oWindow = window.open(url, 
                              "Window2", 
                              "status=no" + 
                              ",height=" + height + 
                              ",width=" + width + 
                              ",resizable=yes" + 
                              ",left=" + leftPosition + 
                              ",top=" + topPosition + 
                              ",screenX=" + leftPosition + 
                              ",screenY=" + topPosition +  
                              ",toolbar=no" + 
                              ",menubar=no" + 
                              ",scrollbars=no" + 
                              ",location=no" + 
                              ",directories=no");
        
        if (fnOnClose)
        {
            var pollTimer = window.setInterval(function()
            {
                if (win.closed !== false)
                { 
                    window.clearInterval(pollTimer);
                    fnOnClose();
                }
            }, 200);        
        }
        
        return oWindow;
    }
});
