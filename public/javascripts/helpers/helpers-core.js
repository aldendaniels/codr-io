// Makes importable via node.
// See http://requirejs.org/docs/node.html
if (typeof define !== 'function')
{
    var define = require('amdefine')(module);
}

define(function()
{
    var oCallback = {
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
         *   downloadData(oCallback.create(myHandler, myHandler.onDownload));
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
            function getClosureCache() { return oCallback._aClosureCache; }
    
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
    
    return {
        
        createClass: function(oProps)
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
        },
        
        createCallback: function(oObject, fnCallback, aOptionalArguments)
        {
            aOptionalArguments = aOptionalArguments || [];
            return oCallback.create(oObject, fnCallback, aOptionalArguments);
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
        
        fromJSON: function(sJSON)  // Wrap JSON.parse for better date handling.
        {
            var oData = JSON.parse(sJSON);
            if (oData)
            {
                return this.mutateObj(oData, this, function(val)
                {
                    if (typeof(val) == 'string')
                    {
                        var iStartChars = 'JSON_DATE:'.length;
                        if (val.slice(0, iStartChars) == 'JSON_DATE:')
                            return new Date(val.slice(iStartChars));
                    }
                    return val;
                });                
            }
            return oData;
        },
        
        toJSON: function(oData) // Wrap JSON.stringify for better date handling.
        {            
            return JSON.stringify(this.mutateObj(oData, this, function(val)
            {
                if (val && val.constructor == Date)
                    return 'JSON_DATE:' + val.toISOString();
                return val;
            }));
        },
        
        // Creates a recursive clone of an object replacing each non-object
        // member as dictated by fnCallback.
        mutateObj: function(oObj, oScope, fnCallback)
        {
            function _objectMutate(oSrcObj, oTgtObj, oScope, fnCallback)
            {
                for (var sKey in oSrcObj)
                {
                    var C = (typeof oSrcObj[sKey] == 'undefined' ? '' : oSrcObj[sKey].constructor);
                    if (C == Array || C == Object) // Recurse
                    {
                        oTgtObj[sKey] = new oSrcObj[sKey].constructor();
                        _objectMutate(oSrcObj[sKey], oTgtObj[sKey], oScope, fnCallback);
                    }
                    else
                        oTgtObj[sKey] = oCallback.create(oScope, fnCallback)(oSrcObj[sKey]);
                }            
            }
            
            var C = (typeof oObj == 'undefined' ? '' : oObj.constructor);
            if (C == Array || C == Object)
            {
                var oClone = new oObj.constructor();
                _objectMutate(oObj, oClone, oScope, fnCallback);
                return oClone;
            }
            else
                return oCallback.create(oScope, fnCallback)(oObj);
        },
        
        extendObj: function(oObj1, oObj2)
        {
            for (sKey in oObj2)
                oObj1[sKey] = oObj2[sKey];
        },
        
        deepCloneObj: function(oObj)
        {
            return this.fromJSON(this.toJSON(oObj));
        },
        
        formatDateTime: function(d)
        {
            return '' +
                           
                // Date
                ( '0' + (d.getMonth() + 1) ).slice(-2) + '/' +
                ( '0' + d.getDate()        ).slice(-2) + '/' +
                d.getFullYear() +
                
                // Time
                ' at ' +
                ( '0' + d.getHours() % 12 ).slice(-2) + ':' +
                ( '0' + d.getMinutes()    ).slice(-2) + ' ' +
                (d.getHours < 12 ? 'AM' : 'PM')
        }
    };
});