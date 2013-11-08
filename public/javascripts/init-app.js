define('init-app', function(require)
{
    // Dependencies.
    var $        = require('lib/jquery'),
        oHelpers = require('helpers/helpers-web'),
        oModes   = require('edit-control/modes');
    
    return {
        loadModeChooser: function(fnOnModeSelect)
        {
            // Init menu.
            var oMenu = oModes.createModeMenu('#modes', this, function(oMode) // On Mode select
            {
                fnOnModeSelect(oMode);
            });
            oMenu.focusInput();
            
            // Maintain focus.
            oHelpers.on(window, 'mousedown.home', this, function(oEvent)
            {
                if (!$(oEvent.target).is('input, textarea'))
                    oEvent.preventDefault();
            });
            
            // Pass events through to the menu.
            oHelpers.on(window, 'click.home keyup.home keydown.home', this, function(oEvent)
            {
                if ($(oEvent.target).parents('#home #modes').length > 0)
                    oMenu.onEvent(oEvent);
                
            });        
        },
    
        loadWorkspace: function(bIsNewDocument, bIsSnapshot, oNewDocumentMode)
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
        }
    }
});

require(['init-app'], function(oInitApp)
{
    // Hack: references global variables defined in index.html:
    //   - IS_NEW_DOCUMENT
    //   - IS_SNAPSHOT
    if (IS_NEW_DOCUMENT)
    {
        oInitApp.loadModeChooser(function(oMode)
        {
            oInitApp.loadWorkspace(IS_NEW_DOCUMENT, IS_SNAPSHOT, oMode)
        });
    }
    else
        oInitApp.loadWorkspace(IS_NEW_DOCUMENT, IS_SNAPSHOT, null);  
});
