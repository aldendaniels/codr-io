define(function(require)
{
    // Dependencies.
    var $           = require('lib/jquery'),
        oHelpers    = require('helpers/helpers-web'),
        oUIDispatch = require('helpers/ui-dispatch');
        
    return (
    {    
        _oShortcuts: {},
        _bIsOpen: false,
        
        init: function()
        {
            oUIDispatch.registerUIHandler(this);
            
            // Normally we bind all events in workspace, but here we want to get key
            // event even when we don't have focus so we bind our own listener.
            $('body').on('keydown', oHelpers.createCallback(this, this.onEvent));
        },
        
        registerShortcut: function(sAccel, jElem, iOptionalOffsetLeft, iOptionalOffsetTop)
        {
            oHelpers.assert(sAccel.length == 1, 'A shortcut must be one char long.');
            this._oShortcuts[sAccel.toUpperCase().charCodeAt(0)] = {
                jElem:   jElem,
                sAccel:  sAccel.toUpperCase(),
                iOffsetLeft: iOptionalOffsetLeft || 0,
                iOffsetTop:  iOptionalOffsetTop  || 0
            };
        },
        
        contains: function(jElem)
        {
            return jElem.closest('#shortcut-overlay').length > 0;
        },
        
        onFocusIn:  function() { oHelpers.assert(false, 'The shortcut handler should never receive focus.') },        
        onFocusOut: function() { oHelpers.assert(false, 'The shortcut handler should never receive focus.') },
        
        onEvent: function(oEvent)
        {
            switch(oEvent.type)
            {
                case 'mousedown':
                    this._close();
                    break;
                
                case 'keydown':
                    var iKeyCode = oEvent.which;
                    var bIsSemicolon = (iKeyCode == 186 || iKeyCode == 59); // 59 for FF, 186 for other browsers. 
                    if (!this._bIsOpen && bIsSemicolon && oEvent.ctrlKey) // CTRL + SEMICOLON
                    {
                        this._open();
                    }
                    else if (this._bIsOpen && iKeyCode == 27) // ESC
                    {
                        this._close();
                    }
                    else if (this._bIsOpen && iKeyCode in this._oShortcuts)
                    {
                        var jElem = this._oShortcuts[iKeyCode]['jElem'];
                        oHelpers.findFirstChild(jElem, this, function(eChild)
                        {
                            return oHelpers.isFocusable(eChild);
                        }).focus();
                        jElem.click();
                        this._close();
                        oEvent.preventDefault();
                    }
                    break;
            }
        },
        
        _open: function()
        {
            $('#shortcut-overlay').show();
            for (var iShortcut in this._oShortcuts)
            {
                var oShortcut = this._oShortcuts[iShortcut];
                var jElem = oShortcut.jElem;
                if (oHelpers.isVisible(jElem))
                {
                    // Create shortcut indicator.
                    var jShortcut = $('<div class="shortcut"></div>');
                    jShortcut.text(oShortcut.sAccel);                
                    $('#shortcut-overlay').append(jShortcut);
                    
                    // Position shortcut indicator. 
                    var oPos = jElem.offset();
                    jShortcut.css(
                    {
                        top:  oPos.top  + (jElem.outerHeight() - jShortcut.outerHeight()) / 2 + oShortcut.iOffsetTop, // Center vertically.,
                        left: oPos.left +  jElem.outerWidth()  - jShortcut.outerWidth()       + oShortcut.iOffsetLeft // Right align.
                    });                    
                }
            }
            this._bIsOpen = true;
        },
        
        _close: function()
        {
            $('.shortcut').remove();
            $('#shortcut-overlay').hide();
            this._bIsOpen = false;
        }
    });
});