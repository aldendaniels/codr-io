define('preview', function(require)
{
    // Dependencies.
    var oHelpers     = require('helpers/helpers-web'),
        fnApplyDelta = require('apply-delta');
    
    return (
    {
        _bAutoRefresh: true,
        _aDocLines: [],
        _bPaused: true,
        
        init: function(oOptionalEditor)
        {
            // Handle server messages passed to iFrame via the PostMessage API.
            window.onMessage = null;
            oHelpers.on(window, 'message', this, function(e)
            {
                this._handleMessage(e.originalEvent.data);
            });
            
            // Disable document.write.
            // This is necessary because calling document.write will kill the
            // Preview scripts.
            document.write = function()
            {
                alert('document.write is not supported in preview');
            }
            
            // We notify the parent window when JS is loaded.
            window.parent.postMessage({sType: 'previewLoaded'}, '*');
        },
        
        _handleMessage: function(o)
        {
            switch(o.sType)
            {
                case 'serverMessage':
                    this._handleServerAction(o.oData);
                    break;
                
                case 'setSnapshotLines':
                    this._aDocLines = o.oData.aLines;
                    this._updatePreview();
                    break;
                    
                case 'pause':
                    this._bPaused = true;
                    break;
                
                case 'play':
                    this._bPaused = false;
                    if (o.oData)
                    {
                        this._aDocLines = o.oData.aLines;
                        this._updatePreview();                        
                    }
                    break;
                
                case 'checkPreviewLoaded':
                    window.parent.postMessage({sType: 'previewLoaded'}, '*');
                    break;
                    
                default:
                    oHelpers.assert(false, 'Bad message sent to preview.');
            }
        },
        
        _handleServerAction: function(oAction)
        {
            switch(oAction.sType)
            {
                case 'setDocumentData':
                    if (!this._bPaused)
                    {
                        this._aDocLines = oAction.oData.aLines;
                        this._updatePreview();                        
                    }
                    break;
                    
                case 'docChange':
                    if (!this._bPaused)
                    {
                        fnApplyDelta(this._aDocLines, oAction.oData.oDelta);
                        if (this._bAutoRefresh)
                            this._updatePreview();
                    }
                    break;
                    
                case 'setAutoRefreshPreview':
                    this._bAutoRefresh = oAction.oData.bAutoRefreshPreview;
                    if (this._bAutoRefresh && !this._bPaused)
                        this._updatePreview();
                    break;
                
                case 'refreshPreview':
                    oHelpers.assert(!this._bAutoRefresh, 'The "refreshPreview" event should only occur when manually refreshing.');
                    if (!this._bPaused)
                        this._updatePreview();
                    break;
                    
                case 'error':
                    document.write(oAction.oData.sMessage);
                    break;
            }
            
            // Pretend to handle all events since the preview functionality
            // only needs a subset. This shouldn't mess up a docked preview
            // since there we get events on send, not on receipt.
            return true; 
        },
        
        _updatePreview: function()
        {
            // Validate that preview is not paused. Preview is paused when the docked preview paneis hidden.
            oHelpers.assert(!this._bPaused, '_updatePreview should not be called when paused.');
            
            // Show placeholder (if no HTML to render).
            var sHTML = this._aDocLines.join('\n');
            if (!sHTML) 
            {
                sHTML = [
                    '<!DOCTYPE html>',
                    '<html>',
                    '    <head>',
                    '        <style type="text/css">',
                    '            body',
                    '            {',
                    '                background-color: #f5f5f5;',
                    '                font-family: "Lucida Sans Unicode", "Lucida Grande", sans-serif;',
                    '                text-align: center;',
                    '                text-shadow: 1px 2px 3px white;',
                    '            }',
                    '            ',
                    '            h1',
                    '            {',
                    '                font-size: 2.5em;',
                    '                color: #aaa;',
                    '                margin-bottom: 0;',
                    '                font-weight: normal',
                    '            }',
                    '            ',
                    '            p',
                    '            {',
                    '                margin-top: 10px;',
                    '                color: #888;',
                    '            }',
                    '            ',
                    '            html, body, table',
                    '            {',
                    '                height: 100%;',
                    '                width: 100%;',
                    '                overflow: hidden;',
                    '                text-align: center;',
                    '            }',
                    '        </style>',
                    '    </head>',
                    '    <body>',
                    '        <table>',
                    '            <tr>',
                    '                <td>',
                    '                    <h1>HTML Preview</h1>',
                    '                    <p>No content yet. Start typing!</p>',
                    '                </td>',
                    '            </tr>',
                    '        </table>',
                    '    </body>',
                    '</html>'
                ].join('\n');
            }
            
            // Update content.
            document.documentElement.innerHTML = sHTML;
            
            // Replace scripts.
            this._reloadScripts();
        },
        
        _reloadScripts: function()
        {
            // Necessary because setting the InnerHTML of the iFrame won't make it eval the scripts.
            var aScripts = document.getElementsByTagName('script');
            var i = -1;
            reloadNextScript = oHelpers.createCallback(this, function()
            {
                i++;
                if (i < aScripts.length)
                    this._reloadScript(aScripts[i], reloadNextScript)                        
            });
            reloadNextScript();
        },
        
        _reloadScript: function(eOldScript, fnCallback)
        {
            var eNewScript = document.createElement('script');
            eNewScript.type = eOldScript.type;
            if (eOldScript.src)
            {
                eNewScript.src = eOldScript.src;
                eNewScript.onload = fnCallback;
                eOldScript.parentNode.replaceChild(eNewScript, eOldScript);
            }
            else
            {
                eNewScript.text = eOldScript.text;
                eOldScript.parentNode.replaceChild(eNewScript, eOldScript);
                fnCallback();
            }
        }
    });
});

// Start Preview
require(['preview'], function(oPreview)
{
    oPreview.init();
});