var oMenu = null;
var oEditor = null;
var oSocket = null;

$(document).on('ready', function()
{
    // Create the language menu.
    var aDialogFavKeys = jQuery.grep(aFavKeys, function(sKey)
    {
        return sKey != 'html' && sKey != 'text';
    });
    oMenu = new Menu(aModes, aDialogFavKeys, $('#language'), null, initEditor);
    oMenu.attach();
});

function initEditor(sKey)
{
    // Hide language chooseer.
    oMenu.detach();
    $('body').removeClass('selectLang');

    // Create Editor.
    oEditor = new Editor(sKey, true, true);
    
    // Connect.
    var sURL = 'ws://' + window.document.location.host + window.document.location.pathname;
    oSocket = new oHelpers.WebSocket(sURL);
    oSocket.bind('open', null, function()
    {
        oEditor.connect(oSocket);
    });
}
