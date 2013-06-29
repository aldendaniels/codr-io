
var oInitApp = 
{
    _oPendingChosenMode: null,
    
    /// CALLED FOR EXISTING DOCUMENT ///
    
    initModeChooser: function()
    {
        this._createModeMenu(function(oMode) // On Mode select
        {
            this._oPendingChosenMode = oMode;
            if (window.Workspace)
                this._initNewWorkspaceForChosenMode();
        });
        oHelpers.on(document, 'ready', this, this._initNewWorkspaceForChosenMode);
    },
    
    
    /// CALLED FOR EXISTING DOCUMENT ///
    
    initWorkspace: function(bIsNewDocument, oNewDocumentMode)
    {
        var sURL = 'ws://' + window.document.location.host + '/';
        var oSocket = new oHelpers.WebSocket(sURL);
        return new Workspace(oSocket, bIsNewDocument, oNewDocumentMode);
    },
        
        
    /// NEW DOCUMENT HELPERS ///
    
    _createModeMenu: function(fnOnModeSelect)
    {
        // Init menu.
        var oMenu = new Menu(g_oModes.aModes, $('#modes'), this,
            function(oMode) { return $.inArray(oMode, g_oModes.aFavModes) != -1; }, // Is favorite
            function(oMode) { return oMode.getName();                            }, // Get key
            function(oMode) { return oMode.getDisplayName();                     }, // Get item display text.
            fnOnModeSelect
        );
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
            if ($(oEvent.target).parents('#home #modes'))
                oMenu.onEvent(oEvent);
        });        
    },
    
    _initNewWorkspaceForChosenMode: function()
    {
        if(this._oPendingChosenMode)
        {
            var oWorkspace = this.initWorkspace(IS_NEW_DOCUMENT, this._oPendingChosenMode);
            $('body').removeClass('home');
            $(window).off('.home');
            this._oPendingChosenMode = null;            
        }
    }
};
