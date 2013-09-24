
var ShortcutHandler = oHelpers.createClass({
    _oShortcuts: null,
    _bIsOpen: false,
    
    __init__: function()
    {
        this._oShortcuts = {};

        $('body').on('keydown', oHelpers.createCallback(this, this._onKeyDown));
        $('#shortcut-overlay').on('mousedown', oHelpers.createCallback(this, this._close))
    },

    registerShortcut: function(sAccel, jElem, sPos, iOptionalOffset)
    {
        oHelpers.assert(sAccel.length == 1, 'A shortcut must be one char long.');
        this._oShortcuts[sAccel.toUpperCase().charCodeAt(0)] = {
            jElem:   jElem,
            sAccel:  sAccel.toUpperCase(),
            sPos:    sPos,
            iOffset: iOptionalOffset || 0
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
            {
                jElem.click();
            }
            else
            {
                var sSel = 'input:not([disabled],[type="hidden"]),' +
                           'button:not([disabled]), a, select:not([disabled]), textarea:not([disabled])';
                jElem.find(sSel)[0].focus();
            }

            this._close();

            oEvent.preventDefault();
        }
    },

    _open: function()
    {
        for (var iShortcut in this._oShortcuts)
        {
            var oShortcut = this._oShortcuts[iShortcut];
            var jShortcut = $('<div class="shortcut"></div>');
            jShortcut.text(oShortcut.sAccel);

            var jElem = oShortcut['jElem'];
            jElem.prepend(jShortcut);

            // Center vertically
            jShortcut.css('margin-top', (jElem.height() - jShortcut.outerHeight()) / 2 + 'px')

            // Position
            var iOverExtend = jShortcut.outerWidth() / 2;
            if (oShortcut['sPos'] == 'left')
            {
                var iPaddingLeft = parseInt(jElem.css('padding-left'));
                jShortcut.css('margin-left', -iPaddingLeft - iOverExtend + oShortcut.iOffset + 2 + 'px');
            }
            else
            {
                var iPaddingRight = parseInt(jElem.css('padding-right'));
                var iWidth = jElem.width();
                jShortcut.css('margin-left', iPaddingRight + iWidth - iOverExtend - oShortcut.iOffset - 2 + 'px');
            }
        }
        $('#shortcut-overlay').show();
        this._bIsOpen = true;
    },

    _close: function()
    {
        $('.shortcut').remove();
        $('#shortcut-overlay').hide();
        this._bIsOpen = false;
    }
    
});
