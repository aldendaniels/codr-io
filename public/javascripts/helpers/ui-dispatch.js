define(function(require)
{
    // Dependencies.
    // Requires jQuery.
    var oHelpers = require('helpers/helpers-web');
        
    return (
    {
        _bIsInitialized: false,
        _aUIHandlers: [],
        _aFocusHistory: [],
        _oFocusedUIHandler: null,
        _oDefaultUIHandler: null,
        
        registerUIHandler: function(oUIHandler)
        {
            this._init();
            this._aUIHandlers.push(oUIHandler);
        },
        
        blurFocusedUIHandler: function()
        {
            this._assertInit();
            if (this._aFocusHistory.length)
                this._aFocusHistory.pop().focus();
        },
        
        _init: function()
        {
            if (!this._bIsInitialized)
            {
                this._bIsInitialized = true;
                this._attachDOMEvents();                
            }            
        },
        
        _onUIHandlerFocus: function(oUIHandler)
        {
            this._assertInit();
            if (this._oFocusedUIHandler != oUIHandler)
            {
                if (this._oFocusedUIHandler)
                {
                    // Update the UIHandler focus should revert to when ESC is pressed.
                    if (this._oFocusedUIHandler.bEscTo)
                        this._aFocusHistory.push(this._oFocusedUIHandler)
                    
                    // Blur old focused object.
                    if (this._oFocusedUIHandler.onFocusOut)
                        this._oFocusedUIHandler.onFocusOut();                          
                }
                
                this._oFocusedUIHandler = oUIHandler;
                if (oUIHandler.onFocusIn)
                    oUIHandler.onFocusIn();
            }
        },
        
        _getUIHandler: function(jElem)
        {
            jElem = $(jElem);
            for (var i in this._aUIHandlers)
            {
                var oObject = this._aUIHandlers[i];
                if (oObject.contains(jElem))
                    return oObject;
            }
            return null;
        },
        
        _assertInit: function()
        {
            oHelpers.assert(this._bIsInitialized, 'UI Dispatch is not initialized.')
        },
        
        _attachDOMEvents: function()
        {
            oHelpers.on('BODY', 'mousedown mouseup mousemove click focusin keydown keyup keypress change', this, function(oEvent)
            {
                // Get UI Handler (If any).
                var jTarget = $(oEvent.target);
                var oUIHandler = this._getUIHandler(jTarget);
                
                // Handle event.
                switch (oEvent.type)
                {
                    case 'keydown':
                        if (oEvent.which == 27) // ESC
                        {
                            this.blurFocusedUIHandler();
                            break;
                        }
                                            
                    case 'keypress':
                    case 'keydown':
                    case 'keyup':
                    case 'mousemove':
                    case 'mouseup':
                        if (this._oFocusedUIHandler)
                            this._oFocusedUIHandler.onEvent(oEvent);
                        break;
                        
                    case 'focusin':
                        oHelpers.assert(oUIHandler, 'Focusable object should have a UI handler.');
                        this._onUIHandlerFocus(oUIHandler);
                    
                    case 'mousedown':
                        
                        // Focus should always be in a text-entry box.
                        if (!jTarget.is('input, textarea, select, option') || jTarget.prop('disabled'))
                            oEvent.preventDefault();
                        
                        // Blur focused object on click off if bAutoBlur is true.
                        if (this._oFocusedUIHandler && this._oFocusedUIHandler.bAutoBlur &&
                           (oUIHandler === null || oUIHandler !== this._oFocusedUIHandler))
                        {
                            this.blurFocusedUIHandler();
                        }
                        
                    // Forward non-keyboard events.
                    default:
                        if (oUIHandler)
                            oUIHandler.onEvent(oEvent);
                }
            });
        }
    });
});