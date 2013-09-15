
var oInitApp = 
{
    _oPendingChosenMode: null,
    _oWorkspace: null,
    
    /// CALLED FOR NEW DOCUMENT ///
    
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
        if (IS_SNAPSHOT)
            var sURL = null;
        else
            var sURL = 'ws://' + window.document.location.host + '/';

        var oSocket = new oHelpers.WebSocket(sURL);
        this._oWorkspace = new Workspace(oSocket, bIsNewDocument, oNewDocumentMode);
    },

    getSnapshotData: function()
    {
        oHelpers.assert(IS_SNAPSHOT, 'Should be published.');

        var sDocumentID = /^\/v\/([a-z0-9]+)\/?$/.exec(document.location.pathname)[1];
        $.get('/ajax/' + sDocumentID + '/', oHelpers.createCallback(this, function(oResponse)
        {
            if (oResponse.sError)
            {
                document.write(oResponse.sError);
                return;
            }

            this._oWorkspace.setEditorText(oResponse.sText);
            this._oWorkspace.setMode(oResponse.sMode);
            this._oWorkspace.setTitle(oResponse.sTitle);
        }));
    },
        
        
    /// NEW DOCUMENT HELPERS ///
    
    _createModeMenu: function(fnOnModeSelect)
    {
        // Init menu.
        var oMenu = g_oModes.createModeMenu('#modes', this, fnOnModeSelect);
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
