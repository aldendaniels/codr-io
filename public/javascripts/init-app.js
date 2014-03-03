define('init-app', function(require)
{
    // Dependencies.
    // Requires jQuery.
    var oHelpers = require('helpers/helpers-web'),
        oModes   = require('edit-control/modes');
    
    var bDocReady = false;

    function loadModeChooser(fnOnModeSelect)
    {
        // Init menu.
        var oMenu = oModes.createModeMenu('#modes', null, function(oMode) // On Mode select
        {
            fnOnModeSelect(oMode);
        });
        oMenu.focusInput();
        
        // Maintain focus.
        oHelpers.on(window, 'mousedown.home', null, function(oEvent)
        {
            if (!$(oEvent.target).is('input, textarea'))
                oEvent.preventDefault();
        });
        
        // Pass events through to the menu.
        oHelpers.on(window, 'click.home keyup.home keydown.home', null, function(oEvent)
        {
            if ($(oEvent.target).parents('#home #modes').length > 0)
                oMenu.onEvent(oEvent);
            
        });        
    }
        
    function loadWorkspace(bIsNewDocument, bIsSnapshot, oNewDocumentMode)
    {
        var fnLoadWorkspace = function()
        {
            require(['app-main'], function(fnAppMain, Socket)
            {
                // Instantiate main app.
                fnAppMain(bIsNewDocument, bIsSnapshot, oNewDocumentMode);
                
                // Hide mode chooser.
                if (bIsNewDocument)
                {
                    $('BODY').removeClass('home');
                    $(window).off('.home');
                }
            });                
        };
        if (this._bDocReady)
            fnLoadWorkspace()
        else
            $(document).ready(fnLoadWorkspace);
    }
    
    return function()
    {        
        // Store DocReady State.
        $(document).ready(function()
        {
            bDocReady = true;
            console.log(ace);
        });
        
        // References global variables defined in index.html:
        //   - IS_NEW_DOCUMENT
        //   - IS_SNAPSHOT
        if (IS_NEW_DOCUMENT)
        {
            loadModeChooser(function(oMode)
            {
                loadWorkspace(IS_NEW_DOCUMENT, IS_SNAPSHOT, oMode)
            });
        }
        else
            loadWorkspace(IS_NEW_DOCUMENT, IS_SNAPSHOT, null);
    };
});

// Reload whever the url changes.
//
//      TODO:           Ideally we wouldn't reload when clicking "back" after creating a document.
//                      We could just hide the document and show the landing page, which would be faster.
//                      This takes some work, however, so for now we just reload.
//
//      Chrome Bug:     Chrome erroneously fires the popstate event on page load.
//                      This bug has been fixed, but the fix is not yet in production.
//                      See: https://code.google.com/p/chromium/issues/detail?id=63040
//
//      Chrome Bug Fix: Using the onload + timeout trick silences the buggy popstate event in Chrome.
//                      This is a variant of the fix proposed by Torben.
//                      See: http://stackoverflow.com/questions/6421769/popstate-on-pages-load-in-chrome/10651028#10651028
//
//      NOTE:            Once the Chrome bug fix has been out in the wild for a bit, we can simplify this code.
window.addEventListener('load', function()
{
    window.setTimeout(function()
    {
        window.addEventListener('popstate', function()
        {
            window.location.reload();
        });
    }, 0);
});

// Start App.
require(['init-app'], function(fnInitApp)
{
    fnInitApp();
});
