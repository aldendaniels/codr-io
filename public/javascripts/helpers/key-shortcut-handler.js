define(function(require)
{
    // Dependencies.
    var $           = require('lib/jquery'),
        oHelpers    = require('helpers/helpers-web'),
        oUIDispatch = require('helpers/ui-dispatch');
        
    return oHelpers.createClass({
        
        _oShortcuts: null,
        _bIsOpen: false,
        
        __init__: function()
        {
            this._oShortcuts = {};
            oUIDispatch.registerUIHandler(this);
            
            // Normally we bind all events in workspace, but here we want to get key
            // event even when we don't have focus so we bind our own listener.
            $('body').on('keydown', oHelpers.createCallback(this, this.onEvent));
        },
        
        registerShortcut: function(sAccel, jElem, iOptionalOffset)
        {
            oHelpers.assert(sAccel.length == 1, 'A shortcut must be one char long.');
            this._oShortcuts[sAccel.toUpperCase().charCodeAt(0)] = {
                jElem:   jElem,
                sAccel:  sAccel.toUpperCase(),
                iOffset: iOptionalOffset || 0
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
                    if (!this._bIsOpen && iKeyCode == 186 && oEvent.ctrlKey) // CTRL + SEMICOLON
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
                        if (jElem.is('button'))
                        {
                            jElem.click();
                        }
                        else
                        {
                            oHelpers.findFirstChild(jElem, this, function(eChild)
                            {
                                return oHelpers.isFocusable(eChild);
                            }).focus();
                        }
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
                // Create shortcut indicator.
                var oShortcut = this._oShortcuts[iShortcut];
                var jShortcut = $('<div class="shortcut"></div>');
                jShortcut.text(oShortcut.sAccel);                
                $('#shortcut-overlay').append(jShortcut);
                
                // Position shortcut indicator. 
                var jElem = oShortcut.jElem;
                var oPos = jElem.offset();
                jShortcut.css(
                {
                    top:  oPos.top  + (jElem.height() - jShortcut.outerHeight()) / 2,              // Center vertically.,
                    left: oPos.left +  jElem.width()  - jShortcut.outerWidth() + oShortcut.iOffset // Right align.
                });
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