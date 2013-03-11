var oMenu = null;
var oEditor = null;
var oSocket = null;

$(document).on('ready', function()
{
    /* Grap templates from cash before initialzing. */
    $.get('static/templates.html', function(sData)
    {
        $('#template').append(sData);
        onReady();
    });
});

function onReady()
{
    // Compile templates.
    oTemplate.init();

    // Create the mode (language) menu.
    var aDialogFavKeys = jQuery.grep(aFavKeys, function(sKey)
    {
        return sKey != 'html' && sKey != 'text';
    });
    oMenu = new Menu(aModes, aDialogFavKeys, $('#language'), null, initEditor);
    oMenu.attach();
    
    // Attach button events.
    $('.btn.mode').on('click', function()
    {
        initEditor(this.id);
    });
    
    // Create Editor.
    oEditor = new Editor(true, true);   
}

function initEditor(sMode)
{
    // Set editor mode.
    oEditor.setMode(sMode);

    // Hide mode chooser.
    oMenu.detach();
    $('body').removeClass('selectLang');
    
    // Connect.
    var sURL = 'ws://' + window.document.location.host + window.document.location.pathname;
    oSocket = new oHelpers.WebSocket(sURL);
    oSocket.bind('open', null, function()
    {
        oEditor.connect(oSocket);
    });
}
