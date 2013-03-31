var g_oWorkspace = null;

$(document).on('ready', function()
{
    g_oWorkspace = new Workspace();    
    if (IS_NEW_DOCUMENT)
        chooseMode();
    else
        connect();
});

function chooseMode()
{
    function fnOnModeSelect(sMode)
    {
        g_oWorkspace.setMode(sMode);
        g_oWorkspace.focusEditor();
        oMenu.detach();
        $('BODY').removeClass('home');
        connect();
    }
    
    // Create the editor mode menu.
    var oMenu = new Menu(aModes, aFavKeys, $('#modes'), null, fnOnModeSelect);
    oMenu.attach();
    
    // Attach button events.
    $('.btn.mode').on('click', function()
    {
        fnOnModeSelect(this.id);
    });
}

function connect()
{
    var sURL = 'ws://' + window.document.location.host + '/';
    console.log(sURL);
    var oSocket = new oHelpers.WebSocket(sURL);
    oSocket.bind('open', null, function()
    {
        g_oWorkspace.connect(oSocket);
        return true;
    });
}
