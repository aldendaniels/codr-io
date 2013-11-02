
define(function(require)
{
    // Dependencies.
    var $        = require('jquery'),
        oHelpers = require('helpers/helpers'),
        oModes   = require('edit-control/modes');
        
    function loadModeChooser(fnOnModeSelect)
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
    }
    
    function loadWorkspace(bIsNewDocument, bIsSnapshot, oNewDocumentMode)
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
    
    return function(bIsNewDocument, bIsSnapshot)
    {
        if (bIsNewDocument)
        {
            loadModeChooser(function(oMode)
            {
                loadWorkspace(bIsNewDocument, bIsSnapshot, oMode)
            });
        }
        else
            loadWorkspace(bIsNewDocument, bIsSnapshot, null);        
    }
});
