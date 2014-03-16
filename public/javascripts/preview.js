define('preview', function(require)
{
    // Dependencies.
    var oHelpers     = require('helpers/helpers-web'),
        fnApplyDelta = require('apply-delta');
    
    return (
    {
        _ePreview: document.getElementById('html-preview'),
        _bAutoRefresh: true,
        _oSocket: null,
        _bIsStandalone: true,
        _bIsDirty: true, // Start as dirty, since we need initial content.
        
        // Standalone Only.
        _aDocLines: [],
        
        // Docked (Non-Standalone) Only
        _bPaused: false,
        _oEditor: null,
        
        init: function(oSocket, oOptionalEditor)
        {
            this._oSocket = oSocket;
            this._oSocket.bind('message', this, this._handleServerAction, true /* bHandleMsgSends */);
            
            // Docked (non stand-alone).
            if (oOptionalEditor)
            {
                this._bPaused = true;
                this._bIsStandalone = false;
                this._oEditor = oOptionalEditor;
            }
        },
        
        setSnapshotLines: function(aDocLines)
        {
            this._aDocLines = aDocLines;
            this._updatePreview();
        },
        
        pause: function()
        {
            this._bPaused = true;
        },
        
        play: function()
        {
            this._bPaused = false;
            this._updatePreview();
        },
        
        _handleServerAction: function(oAction)
        {
            switch(oAction.sType)
            {
                case 'setDocumentData':
                    if (this._bIsStandalone)
                    {
                        this._aDocLines = oAction.oData.aLines;
                        this._updatePreview();
                    }
                    else
                    {
                        if (!this._bPaused)
                            window.setTimeout(oHelpers.createCallback(this, this._updatePreview), 1);
                    }
                    return true;
                    
                case 'docChange':
                    this._bIsDirty = true;
                    if (this._bIsStandalone)
                    {
                        fnApplyDelta(this._aDocLines, oAction.oData.oDelta);
                        if (this._bAutoRefresh)
                            this._updatePreview();
                    }
                    else if (!this._bPaused)
                    {
                        // Allow the editor to update, and then update preview.
                        if (this._bAutoRefresh)
                            window.setTimeout(oHelpers.createCallback(this, this._updatePreview), 1);
                    }
                    return true;
                    
                case 'setAutoRefreshPreview':
                    this._bAutoRefresh = oAction.oData.bAutoRefreshPreview;
                    if (this._bAutoRefresh && !this._bPaused)
                        this._updatePreview();
                    return true;
                
                case 'refreshPreview':
                    oHelpers.assert(!this._bAutoRefresh, 'The "refreshPreview" event should only occur when manually refreshing.');
                    if (!this._bPaused)
                        this._updatePreview();
                    return true;
                    
                case 'error':
                    document.write(oAction.oData.sMessage);
                    return true;
            }
            return false;
        },
        
        _updatePreview: function()
        {
            oHelpers.assert(!this._bPaused, '_updatePreview should not be called when paused.');
            
            if (this._bIsDirty)
            {
                // Get HTML.
                var sHTML = (this._bIsStandalone ? this._aDocLines : this._oEditor.getAllLines()).join('\n');
                if (!sHTML) // Show placeholder.
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
                this._ePreview.contentDocument.documentElement.innerHTML = sHTML;
                
                // Replace scripts.
                // Necessary because setting the InnerHTML of the iFrame won't make it eval the scripts.
                var aScripts = this._ePreview.contentDocument.getElementsByTagName('script');
                var i = -1;
                loadNextScript = oHelpers.createCallback(this, function()
                {
                    i++;
                    if (i < aScripts.length)
                        this._loadScript(aScripts[i], loadNextScript)                        
                });
                loadNextScript();
            }
            this._bIsDirty = false;
        },
        
        _loadScript: function(eOldScript, fnCallback)
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