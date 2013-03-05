var oKeyable = null;
var oEditor = null;

$(document).on('ready', function()
{
    oKeyable = new Keyable('#options', 'id');
    oKeyable.attach();
    
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

$(window).on('keydown.modeSelection', function(oEvent)
{
    switch (oEvent.which)
    {
    // Select next down div
    case 40: // Down arrow
        oKeyable.moveDown();
        oEvent.preventDefault();
        
        break;
    // Select next up div
    case 38: // Up arrow					
        oKeyable.moveUp();
        oEvent.preventDefault();
        break;

    // On choice
    case 13:
        var sMode = oKeyable.getSelected().attr('id');
        initEditor(sMode);
        break;
    default:
        $('#search').focus();
    }
    
    scrollIntoView(oKeyable.getSelected());
});

function scrollIntoView(jElem)
{
    // Calculate the element's position.
    var jViewport = jElem.offsetParent();
    var iTop = jElem.position().top - parseInt(jViewport.css('paddingTop'));
    var iBottom = jViewport[0].clientHeight - (iTop + jElem[0].offsetHeight)
        
    // Scroll element vertically into view.
    var iScrollTop = null;
    if (iTop < 0)
    {
        iScrollTop = jViewport.scrollTop() + iTop;
        jViewport.scrollTop(iScrollTop);
    }
    else if (iBottom < 0)
    {
        iScrollTop = jViewport.scrollTop() - iBottom;
        jViewport.scrollTop(iScrollTop);
    }
}

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

function initEditor(sMode)
{
    $(window).off('keydown.modeSelection');
    $('body').removeClass('selectLang');

    oEditor = new Editor(true, sMode);
}
