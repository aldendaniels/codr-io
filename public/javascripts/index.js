
var oApp = 
{
    _oWorkspace: null,
    _oPendingMode: null, /* Caches mode if user selects one before the workspace is loaded. */

    initModeChooser: function()
    {
        // Init menu.
        var oMenu = new Menu(g_oModes.aModes, $('#modes'), this,
            
            function(oMode) // Is favorite.
            {
                return $.inArray(oMode, g_oModes.aFavModes) != -1;
            },                 
                        
            function(oMode) // Get key
            {
                return oMode.getName();
            },
            
            function(oMode) // Get item display text.
            {
                return oMode.getDisplayName();
            },
            
            function(oMode) // On item select.
            {
                this._setWorkspaceModeAndConnect(oMode);
            }
        );
        oMenu.focusInput();
        
        // Maintain focus.
        oHelpers.on(window, 'mousedown.home', this, function(oEvent)
        {
            var jTarget = $(oEvent.target);
            if (!jTarget.is('input, textarea'))
            {
                console.log('stopping');
                oEvent.preventDefault();
            }
        });
        
        // Pass events through to the menu.
        oHelpers.on(window, 'click.home keyup.home keydown.home', this, function(oEvent)
        {
            var jTarget = $(oEvent.target);                        
            if (jTarget.parents('#home #modes'))
                oMenu.onEvent(oEvent);
        });
    },
    
    initWorkspace: function()
    {
        this._oWorkspace = new Workspace();
        if (this._oPendingMode)
        {
            this._setWorkspaceModeAndConnect(this._oPendingMode);
            this._oPendingMode = null;
        }
    },
    
    initConnection: function()
    {
        oHelpers.assert(this._oWorkspace, 'initialize the workspace before connecting.');
        var sURL = 'ws://' + window.document.location.host + '/';
        var oSocket = new oHelpers.WebSocket(sURL);
        oSocket.bind('open', this, function()
        {
            this._oWorkspace.setSocket(oSocket);
            return true; // The "open" event is handled.
        });
    },
    
    _setWorkspaceModeAndConnect: function(oMode)
    {
        if (this._oWorkspace)
        {
            this._oWorkspace.setMode(oMode);
            this._oWorkspace.focusEditor();
            this.initConnection();
            $('body').removeClass('home');
            $(window).off('.home');
        }
        else
            this._oPendingMode = oMode;
    }
};
