define('init-app', function(require)
{
    // Dependencies.
    var $        = require('lib/jquery'),
        oHelpers = require('helpers/helpers-web'),
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
            require(['workspace'], function(Workspace, Socket)
            {
                // Instantiate Worksapce.
                var oWorkspace = new Workspace(bIsNewDocument, bIsSnapshot, oNewDocumentMode);
                
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
        });
        
        // Hack: references global variables defined in index.html:
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

require(['init-app'], function(fnInitApp)
{
    fnInitApp();
});
