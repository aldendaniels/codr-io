define('preview', function(require)
{
    // Dependencies.
    var oHelpers     = require('helpers/helpers-web'),
        fnApplyDelta = require('apply-delta');
    
    return (
    {
        _aDocLines: [],
        _ePreview: document.getElementById('preview'),
        _bAutoRefresh: false,
        _oSocket: null,
        
        init: function(oSocket)
        {
            this._oSocket = oSocket;
            this._oSocket.bind('message', this, this._handleServerAction);
        },
        
        _handleServerAction: function(oAction)
        {
            switch(oAction.sType)
            {
                case 'setDocumentData':
                    this._aDocLines = oAction.oData.aLines;
                    this._updatePreview();
                    return true;
                    
                case 'docChange':
                    fnApplyDelta(this._aDocLines, oAction.oData.oDelta);
                    if (this._bAutoRefresh)
                        this._updatePreview();
                    return true;
                    
                case 'setAutoRefreshPreview':
                    this._bAutoRefresh = oAction.oData.bAutoRefreshPreview;
                    return true;
                
                case 'refreshPreview':
                    oHelpers.assert(!this._bAutoRefresh, 'The "refreshPreview" event should only occur when manually refreshing.');
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
            this._ePreview.contentDocument.childNodes[0].innerHTML = this._aDocLines.join('\n');
        }
    })
});