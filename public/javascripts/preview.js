define('preview', function(require)
{
    // Dependencies.
    var oHelpers     = require('helpers/helpers-web'),
        fnApplyDelta = require('apply-delta');
    
    return (
    {
        _ePreview: document.getElementById('html-preview'),
        _bAutoRefresh: false,
        _oSocket: null,
        _bIsStandalone: true,        
        
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
                this._bIsStandalone = false;
                this._oEditor = oOptionalEditor;
            }
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
                    else if (!this._bPaused)
                    {
                        // Allow the editor to update, and then update preview.
                        window.setTimeout(oHelpers.createCallback(this, this._updatePreview), 1);
                    }
                    return true;                        
                    
                case 'docChange':
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
            this._ePreview.contentDocument.childNodes[0].innerHTML =
               (this._bIsStandalone ? this._aDocLines : this._oEditor.getAllLines()).join('\n');;
        }
    })
});