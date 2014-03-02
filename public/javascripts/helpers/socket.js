
/* Used for testing (global to facilitate setting from console. */
var fg_iSendMsDelay = 0;
var fg_iReceiveMsDelay = 0;

define(function(require)
{
    // Dependencies.
    var oHelpers = require('helpers/helpers-core');
    
    return oHelpers.createClass(
    {
        _oSocket: null,
        _oCallbacks: {}, // Map of event to handlers.
        _aOutbox: [], // We queue sent messages until connection opens.
        _bIsOpen: false,
        
        __init__: function(sUrl)
        {
            // We fake a socket for published documents.
            if (sUrl === null)
                return;
            
            this._oSocket = new WebSocket(sUrl);
            
            this._oSocket.onmessage = oHelpers.createCallback(this, function(oEvent)
            {
                this._dispatch('message', oHelpers.fromJSON(oEvent.data));
            });
            
            this._oSocket.onopen = oHelpers.createCallback(this, function()
            {
                this._dispatch('open', null);
                while (this._aOutbox.length)
                {
                    this._oSocket.send(this._aOutbox.pop());
                }
                this._bIsOpen = true;
            });
            
            this._oSocket.onclose = oHelpers.createCallback(this, function()
            {
                this._dispatch('close', null);
            });
            
            // Fixes pernicious IE bug. IE does not correctly close
            // the socket when the window is refreshed or left via the
            // back butotn. As a result, we need to manually close
            // the socket. socket.close() does not appear to work,
            // so we send down our own "close" event instead that we
            // handle server-side.
            window.addEventListener('beforeunload', oHelpers.createCallback(this, function()
            {
                this.send('close', null);
            }));
        },
        
        bind: function(sEventName, oScope, fnCallback, bHandleMsgSends)
        {
            this._oCallbacks[sEventName] = this._oCallbacks[sEventName] || [];
            this._oCallbacks[sEventName].push(
            {
                fnCallback: oHelpers.createCallback(oScope, fnCallback),
                bHandleMsgSends: bHandleMsgSends || false
            });
        },
        
        send: function(sEventType, oEventData)
        {
            // Broadcast send notification.
            var oData = { sType: sEventType, oData: oEventData || null };
            this._dispatchNoDelay('message', oData, true /* bIsMsgSend */);
            
            // Serialize message.
            var sMessage = oHelpers.toJSON(oData);
            
            // Send message.
            if (fg_iSendMsDelay > 0)
            {
                window.setTimeout(oHelpers.createCallback(this, function()
                {
                    this._send(sMessage);
                }), fg_iSendMsDelay);
            }
            else
            {
                this._send(sMessage);
            }
        },
        
        _send: function(sMessage)
        {
            if (this._bIsOpen)
                this._oSocket.send(sMessage);
            else
                this._aOutbox.push(sMessage);
        },
        
        _dispatch: function(sEventName, oOptionalData)
        {
            if (fg_iReceiveMsDelay > 0)
            {
                var fnCallback = oHelpers.createCallback(this, this._dispatchNoDelay, [sEventName, oOptionalData]);
                window.setTimeout(fnCallback, fg_iReceiveMsDelay);
            }
            else
            {
                this._dispatchNoDelay(sEventName, oOptionalData);
            }
        },
        
        _dispatchNoDelay: function(sEventName, oOptionalData, bIsMsgSend)
        {
            if (sEventName in this._oCallbacks)
            {
                var bHandled = false;
                for (var i in this._oCallbacks[sEventName])
                {
                    var oCallbackData = this._oCallbacks[sEventName][i];
                    if (!bIsMsgSend || oCallbackData.bHandleMsgSends)
                    {
                        bHandled = oCallbackData.fnCallback(oOptionalData, bIsMsgSend) || bHandled;
                    }
                }
                oHelpers.assert(bIsMsgSend || bHandled, 'This "' + sEventName + '" event had no listener: ' + oHelpers.toJSON(oOptionalData));
            }
        }
    });
});
