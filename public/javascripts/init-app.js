define('init-app', function(require)
{
    // Dependencies.
    // Requires jQuery.
    var oHelpers     = require('helpers/helpers-web'),
        oUIDispatch  = require('helpers/ui-dispatch'),
        oModes       = require('edit-control/modes'),
        oBowser      = require('lib/bowser'),
        oModernizr   = require('lib/modernizr'),
        oTemplatizer = require('helpers/templatizer');
    
    var sNotSupportedTemplate = (
    [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '    <head>',
    '        <title>codr.io</title>',
    '        <style>',
    '            html, body, #main',
    '            {',
    '                margin: 0;',
    '                padding: 0;',
    '                height: 100%;',
    '            }',
    '            ',
    '            body',
    '            {',
    '                font-family: "Lucida Sans Unicode", "Lucida Grande", sans-serif;',
    '                line-height: 2em;',
    '                background-color: #fafafa;',
    '                color: #444;',
    '                text-shadow: 1px 2px 3px white;',
    '            }',
    '            ',
    '            h3, p',
    '            {',
    '                margin-bottom: 0;',
    '                margin-top: 0;',
    '            }',
    '            ',
    '            table#main',
    '            {',
    '                max-width: 480px;',
    '                margin-left: auto;',
    '                margin-right: auto;',
    '            }',
    '            ',
    '        </style>',
    '    </head>',
    '    <body>',
    '        <table id="main">',
    '            <tr>',
    '                <td>',
    '                    <h3>[[ sTitle ]]</h3>',
    '                    <p>[[ sMessage ]]</p>',
    '                </td>',
    '            </tr>',
    '        </div>',
    '    </body>',
    '</html>'
    ]).join('\n');
    
    var oModeMenu = null;

    function loadModeChooser(fnOnModeSelect)
    {
        // Init menu.
        oModeMenu = oModes.createModeMenu('#home-mode-menu', 'Create Document', null, function(oMode) // On Mode select
        {
            fnOnModeSelect(oMode);
            return true; // Don't reset menu.
        });
        
        // Pass events through to the menu.
        oUIDispatch.registerUIHandler(oModeMenu);
        oModeMenu.focusInput();
    }
        
    function loadWorkspace(bIsNewDocument, bIsSnapshot, oNewDocumentMode)
    {
        var fnLoadWorkspace = function()
        {
            require(['app-main'], function(fnAppMain, Socket)
            {
                // Instantiate main app.
                fnAppMain(bIsNewDocument, bIsSnapshot, oNewDocumentMode);
                
                // Hide mode chooser.
                if (bIsNewDocument)
                {
                    oUIDispatch.unregisterUIHandler(oModeMenu);
                    $('BODY').removeClass('home');
                }
            });                
        };
        
        if (IS_EDITOR_READY)
            fnLoadWorkspace()
        else
            EDITOR_READY_HANDlER = fnLoadWorkspace;
    }
    
    return function()
    {
        // Handle unsupported devices.
        oTemplatizer.compileTemplate('not-supported-page', sNotSupportedTemplate);
        if (oBowser.mobile || oBowser.tablet)
        {
            document.open();
            document.write(oTemplatizer.render('not-supported-page',
            {
                sTitle:   'Sorry! Device not supported.',
                sMessage: 'Codr.io does not support mobile devices (including tablets). At this point, \
                           no reliable code editing component exists for touch-based browsers.',
            }));
            document.close();
            return;
        }
        
        // Handle unsupported browsers.
        if (!oModernizr.websockets || !oModernizr.localstorage || !oModernizr.history || !oModernizr.postmessage)
        {
            document.open();
            document.write(oTemplatizer.render('not-supported-page',
            {
                sTitle:   'Sorry! Browser not supported.',
                sMessage: 'Your browser does not support awesome HTML5 features like Web Sockets, \
                           Local Storage, the Post Message API, or the History API. Please upgrade to a modern browser.\
                           The latest versions of Chrome, Firefox, and Internet Explorer are recommended.',
            }));
            document.close();
            return;
        }
        
        // References global variables defined in index.html:
        //   - IS_NEW_DOCUMENT
        //   - IS_SNAPSHOT
        $('body').removeClass('hidden');
        if (IS_NEW_DOCUMENT)
        {
            $('#home').css('opacity', 100);
            loadModeChooser(function(oMode)
            {
                loadWorkspace(IS_NEW_DOCUMENT, IS_SNAPSHOT, oMode)
            });
        }
        else
            loadWorkspace(IS_NEW_DOCUMENT, IS_SNAPSHOT, null);
    };
});

// Reload whever the url changes.
//
//      TODO:           Ideally we wouldn't reload when clicking "back" after creating a document.
//                      We could just hide the document and show the landing page, which would be faster.
//                      This takes some work, however, so for now we just reload.
//
//      Chrome Bug:     Chrome erroneously fires the popstate event on page load.
//                      This bug has been fixed, but the fix is not yet in production.
//                      See: https://code.google.com/p/chromium/issues/detail?id=63040
//
//      Chrome Bug Fix: Using the onload + timeout trick silences the buggy popstate event in Chrome.
//                      This is a variant of the fix proposed by Torben.
//                      See: http://stackoverflow.com/questions/6421769/popstate-on-pages-load-in-chrome/10651028#10651028
//
//      NOTE:            Once the Chrome bug fix has been out in the wild for a bit, we can simplify this code.
window.addEventListener('load', function()
{
    window.setTimeout(function()
    {
        window.addEventListener('popstate', function()
        {
            window.location.reload();
        });
    }, 0);
});

// Start App.
require(['init-app'], function(fnInitApp)
{
    fnInitApp();
});
