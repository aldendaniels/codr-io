var oMenu = null;
var oEditor = null;

$(document).on('ready', function()
{
    oMenu = new Menu(aModes, aFavKeys, $('#language'), null, initEditor);
    oMenu.attachEvents();
    
    $('#search').focus();
    
    var sOldVal = '';
    $('#search').on('keyup', function()
    {
        var sVal = $(this).val();
        if (sVal != sOldVal)
        {
            filterLanguages($(this).val());
            sOldVal = sVal;
        }
    });
});

$('.mode').on('click', function(oEvent)
{
    initEditor($(oEvent.target).attr('id'));
});

function filterLanguages(sSearch)
{
    // Hide all languages.
    sSearch = sSearch.toLowerCase();
    var jOptions = $('#languages .option').hide();
    
    // Show languages matching filter.
    var jVisibleOptions = jOptions.filter(function(elem)
    {
        return $(this).text().toLowerCase().indexOf(sSearch) === 0;					
    }).show();
    
    // Update key nav.
    $('.option.current').removeClass('current');
    oKeyable.update(false);
}

function initEditor(sKey)
{
    oMenu.detachEvents();
    $('body').removeClass('selectLang');

    oEditor = new Editor(sKey, true, true);
}
