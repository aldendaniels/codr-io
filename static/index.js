var oMenu = null;
var oEditor = null;

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
    oMenu.detach();
    $('body').removeClass('selectLang');

    oEditor = new Editor(sKey, true, true);
}
