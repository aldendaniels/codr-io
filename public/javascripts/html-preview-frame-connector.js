define(function(require)
{
    // Dependencies.
    var oHelpers = require('helpers/helpers-web');

    return (
    {
        _aSendQueue: [],
        _bIsPreviewLoaded: false,
        _ePreviewWindow: $('iframe#html-preview-frame')[0].contentWindow,
        
        init: function()
        {
            // Handle preview Load.
            oHelpers.on(window, 'message', this, function(oEvent)
            {
                if (oEvent.originalEvent.data.sType == 'previewLoaded')
                    this._onPreviewLoad();
                else
                    throw 'Unkown message from preview';
            })
            this.sendMessage('checkPreviewLoaded', null, true /* bForce */);
        },
        
        _onPreviewLoad: function()
        {
            // Send Queued messages.
            this._bIsPreviewLoaded = true;
            for (var i in this._aSendQueue)
                this._sendMessage(this._aSendQueue[i]);
            delete this._aSendQueue;
        },
        
        sendMessage: function(sType, oOptionalData, bForce)
        {
            var oMessage = this._createMessage(sType, oOptionalData);
            if (this._bIsPreviewLoaded || bForce)
                this._sendMessage(oMessage);
            else
                this._aSendQueue.push(oMessage);
        },
        
        _createMessage: function(sType, oOptionalData)
        {
            var oMessage = {sType: sType};
            if (oOptionalData)
                oMessage.oData = oOptionalData;
            return oMessage;
        },
        
        _sendMessage: function(oMessage)
        {
            this._ePreviewWindow.postMessage(oMessage, '*');
        }
    });
});