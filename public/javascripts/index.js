
var oApp = 
{
    _oWorkspace: null,
    _sPendingMode: '', /* Caches mode if user selects one before the workspace is loaded. */

    initModeChooser: function()
    {
        var oMenu = new Menu(aModes, aFavKeys, $('#modes'), this, function(sMode)
        {
            this._setWorkspaceModeAndConnect(sMode);
            oMenu.detach();
        });
        oMenu.attach();
    },
    
    initWorkspace: function()
    {
        this._oWorkspace = new Workspace();
        if (this._sPendingMode)
        {
            this._setWorkspaceModeAndConnect(this._sPendingMode);
            this._sPendingMode = '';
        }
    },
    
    initConnection: function()
    {
        oHelpers.assert(this._oWorkspace, 'initialize the workspace before connecting.');
        var sURL = 'ws://' + window.document.location.host + '/';
        var oSocket = new oHelpers.WebSocket(sURL);
        oSocket.bind('open', this, function()
        {
            this._oWorkspace.connect(oSocket);
            return true; // The "open" event is handled.
        });
    },
    
    _setWorkspaceModeAndConnect: function(sMode)
    {
        if (this._oWorkspace)
        {
            this._oWorkspace.setMode(sMode);
            this._oWorkspace.focusEditor();
            this.initConnection();        
            $('BODY').removeClass('home');
        }
        else
            this._sPendingMode = sMode;
    }
};
