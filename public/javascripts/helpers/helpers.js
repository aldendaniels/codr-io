function _createClass(oProps)
{
    var Class = null;
    // Create class with constructor.
    if ('__init__' in oProps)
        Class = oProps['__init__'];
    else
        Class = function(){};
    
    // Add methods.
    for (var sName in oProps)
        Class.prototype[sName] = oProps[sName];
    
    return Class;
}
    
var oHelpers = {
    
    on: function(oElem, sEventName, oScope, fnCallback)
    {
        $(oElem).on(sEventName, oHelpers.createCallback(oScope, fnCallback));
    },
    
    next: function (jElem, sSelector)
    {
        while (jElem)
        {
            // Look down.
            var jNext = jElem.find(sSelector);
            if (jNext.length)
                return jNext;
            
            // Look horizontally.
            jNext = jElem.next(sSelector);
            if (jNext.length)
                return jNext;
            
            // Look up: Stop and document root.
            jElem = jElem.parent();
            if (jElem.length)
            {
                jElem = jElem.next();
                if (jElem.is(sSelector))
                    return $element;
            }
        }
        return null;
    },
    
    inOrIn: function(oElem1, oElem2)
    {
        return $(oElem1).closeset(oElem2).length > 0;
    },
    
    assert: function(bCondition, sMessage)
    {
        if (!bCondition)
            throw sMessage;
    },
    
    inArray: function(oItem, aArray)
    {
        for (var i in aArray)
        {
            if (aArray[i] == oItem)
                return true;
        }
        return false
    },
    
    WebSocket: _createClass(
    {
        _oSocket: null,
        _oCallbacks: {}, // Map of event to handlers.
        _aOutbox: [], // We queue sent messages until connection opens.
        _bIsOpen: false,
        
        __init__: function(url)
        {
            this._oSocket = new WebSocket(url);
            
            this._oSocket.onmessage = oHelpers.createCallback(this, function(oEvent)
            {
                this._dispatch('message', JSON.parse(oEvent.data));
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
        },
        
        bind: function(sEventName, oScope, fnCallback)
        {
            this._oCallbacks[sEventName] = this._oCallbacks[sEventName] || [];
            this._oCallbacks[sEventName].push(oHelpers.createCallback(oScope, fnCallback));
        },
        
        send: function(sEventType, oEventData)
        {
            var sMessage = JSON.stringify({ sType: sEventType, oData: oEventData });
            if (this._bIsOpen)
                this._oSocket.send(sMessage);
            else
                this._aOutbox.push(sMessage);
        },
        
        _dispatch: function(sEventName, oOptionalData)
        {
            if (sEventName in this._oCallbacks)
            {
                var bHandled = false;

                for (var i in this._oCallbacks[sEventName])
                {
                    if (this._oCallbacks[sEventName][i](oOptionalData))
                        bHandled = true;
                }

                oHelpers.assert(bHandled, 'The event had no listener: ' + sEventName)
            }
        }  
    }),
    
    createClass: function(oProps)
    {
        return _createClass(oProps);
    },
    
    createCallback: function(oObject, fnCallback, aOptionalArguments)
    {
        aOptionalArguments = aOptionalArguments || [];
        return _Callback.create(oObject, fnCallback, aOptionalArguments);
    }
}

var _Callback = {
    /*
     * This function solves the problem of the value of "this" not persisting for callbacks.
     * (This function correctly maintains all parameters that are passed to the callback function.)
     *
     * Example usage:
     *
     *   function downloadData(fnCallback)
     *   {
     *     var sData = "(download data here)";
     *     fnCallback(sData);
     *   }
     *
     *   var myHandler = {};
     *   myHandler.onDownload = function(sData) { this._sData = sData; };
     *   downloadData(Callback.create(myHandler, myHandler.onDownload));
     *
     * In some situations, the callback's parameters need to be specified when the callback is created.
     * This is particularly cumbersome when creating callbacks in a loop, because it's not possible
     * to use a simple closure.
     *
     * Thanks to http://laurens.vd.oever.nl/weblog/items2005/closures/ for ideas on solving
     * Internet Explorer memory leaks.
     */
    _aClosureCache: [],

    create: function(/*oObject, fnCallback, aArgumentsOverride*/)
    {
        // "this" will return the global object
        function getClosureCache() { return _Callback._aClosureCache; }

        // cache the parameters in the member variable
        var iID = getClosureCache().push(arguments)-1;
        return function()
            {
                var oArguments = getClosureCache()[iID];
                var oObject = oArguments[0];
                var fnCallback = oArguments[1];
                var aArgumentsOverride = oArguments[2];
                
                // If we have both normal arguments and an arguments override, pass in the normal arguments at the end
                if (aArgumentsOverride)
                {
                    // Copy arguments array, so that the array is not affected for the next call.
                    aArgumentsOverride = aArgumentsOverride.concat([]);
                    for (var i = 0; i < arguments.length; i++)
                        aArgumentsOverride.push(arguments[i]);
                }

                return fnCallback.apply(oObject, aArgumentsOverride || arguments);
            };
    }
};
