
var ShortcutHandler = oHelpers.createClass({
    _oShortcuts: null,
    _bIsOpen: false,
    
    __init__: function()
    {
        this._oShortcuts = {};

        $('body').on('keydown', oHelpers.createCallback(this, this._onKeyDown));
    },

    registerShortcut: function(sAccel, jElem, sPos)
    {
        oHelpers.assert(sAccel.length == 1, 'A shortcut must be one char long.');
        this._oShortcuts[sAccel.toUpperCase().charCodeAt(0)] = {
            'jElem': jElem,
            'sAccel': sAccel.toUpperCase(),
            'sPos': sPos
        };
    },

    _onKeyDown: function(oEvent)
    {
        var iKeyCode = oEvent.keyCode || oEvent.which;

        if (!this._bIsOpen && iKeyCode == 186 && oEvent.ctrlKey) // ctrl-;
        {
            this._open();
            return;
        }
        else if (this._bIsOpen && iKeyCode == 27) //esc
        {
            this._close();
        }
        else if (this._bIsOpen && iKeyCode in this._oShortcuts)
        {
            var jElem = this._oShortcuts[iKeyCode]['jElem'];
            if (jElem.is('button'))
                jElem.click();
            else
                jElem.find('input:not([disabled],[type="hidden"]), button:not([disabled]), a, select:not([disabled])')[0].focus();

            this._close();

            oEvent.preventDefault();
        }
    },

    _open: function()
    {
        for (var iShortcut in this._oShortcuts)
        {
            var jShortcut = $('<div class="shortcut"></div>');
            jShortcut.text(this._oShortcuts[iShortcut]['sAccel']);

            var jElem = this._oShortcuts[iShortcut]['jElem'];
            jElem.prepend(jShortcut);

            // Center vertically
            jShortcut.css('margin-top', (jElem.height() - jShortcut.outerHeight()) / 2 + 'px')

            // Position
            var iOverExtend = jShortcut.outerWidth() / 2;
            if (this._oShortcuts[iShortcut]['sPos'] == 'left')
            {
                var iPaddingLeft = parseInt(jElem.css('padding-left'));
                jShortcut.css('margin-left', -iPaddingLeft - iOverExtend + 2 + 'px');
            }
            else
            {
                var iPaddingRight = parseInt(jElem.css('padding-right'));
                var iWidth = jElem.width();
                jShortcut.css('margin-left', iPaddingRight + iWidth - iOverExtend - 2 + 'px');
            }
        }
        this._bIsOpen = true;
    },

    _close: function()
    {
        $('.shortcut').hide();
        this._bIsOpen = false;
    }
    
});
