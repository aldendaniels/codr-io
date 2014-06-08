define(function(require)
{
    // Dependencies.
    // Requires jQuery.
    var oHelpers = require('helpers/helpers-web'),
        Keyable  = require('helpers/keyable');

    return oHelpers.createClass(
    {
        _jParent:     null,
        _sSelectedID: null,
        _oKeyable:    null,
        _fnOnSelect:  null,
        _bIsDisabled: false,
        
        __init__: function(jParent, oScope, fnOnSelect)
        {
            this._jParent    = $(jParent);
            this._fnOnSelect = oHelpers.createCallback(oScope, fnOnSelect);
            this._oKeyable   = new Keyable(jParent, 'id', '.option');
            this._oKeyable.attach();
            
            // Set default selection.
            var jSelected = this._jParent.find('.selected');
            if (jSelected.length)
                this._oKeyable.setCurrent(jSelected);
            this._sSelectedID = this._oKeyable.getCurrent().attr('id');
        },
        
        update: function()
        {
            this._oKeyable.update();
            this._scrollIntoView();
        },
        
        setDisabled: function(bIsDisabled)
        {
            this._bIsDisabled = bIsDisabled;
        },
        
        setSelected: function(sID, bNoCallback)
        {
            this._oKeyable.setCurrent(this._jParent.find('#' + sID));
            this.selectCur(bNoCallback, false);
            this._scrollIntoView();
        },
        
        makeSelectedCurrent: function()
        {
            var jSelected = this._jParent.find('#' + this._sSelectedID);
            oHelpers.assert(jSelected.length, 'Element not found');
            this._oKeyable.setCurrent(jSelected);
            this._scrollIntoView();
        },
        
        onEvent: function(oEvent)
        {
            var jTarget = $(oEvent.target);
            switch(oEvent.type)
            {
                case 'click':
                    var jOption = jTarget.closest('.option');
                    if (jOption.length)
                    {
                        this._oKeyable.setCurrent(jOption);
                        this.selectCur(false, true);
						if(!this._bIsDisabled)
                            this.selectCur(false, false);
                    }
                    break;
                    
                case 'keydown':
                    
                    switch (oEvent.which)
                    {
                        case 40: // DOWN ARROW
                            this._oKeyable.moveDown();
                            this._scrollIntoView();
                            oEvent.preventDefault();
                            break;
                        
                        case 38: // UP ARROW
                            this._oKeyable.moveUp();
                            this._scrollIntoView();
                            oEvent.preventDefault();
                            break;
                            
                        case 13: // ENTER
                            if(!this._bIsDisabled)
                            {
                                this.selectCur(false, false);
                                oEvent.preventDefault();
                            }
                            break;
                    }        
                    break;
            }
        },
        
        selectCur: function(bNoCallback, bIsClick)
        {
            if (!this._bIsDisabled)
            {
                this._sSelectedID = this._oKeyable.getCurrent().attr('id');
                if (!bNoCallback)
                    this._fnOnSelect(this._oKeyable.getCurrent().attr('id'), bIsClick);
                this._jParent.find('.option.selected').removeClass('selected');
                this._oKeyable.getCurrent().addClass('selected');
            }
        },
        
        _scrollIntoView: function()
        {            
            // Get Elems.
            var jElem = this._oKeyable.getCurrent();
            if (!jElem.length)
                return;
            var jViewport = this._jParent;
            
            // Calculate the element's position.
            var iTop = jElem.position().top - parseInt(jViewport.css('paddingTop'));
            var iBottom = jViewport[0].clientHeight - (iTop + jElem[0].offsetHeight)
            
            // Scroll element vertically into view.
            var iScrollTop = null;
            if (iTop < 0)
            {
                iScrollTop = jViewport.scrollTop() + iTop;
                jViewport.scrollTop(iScrollTop);
            }
            else if (iBottom < 0)
            {
                iScrollTop = jViewport.scrollTop() - iBottom;
                jViewport.scrollTop(iScrollTop);
            }
        }
    });
});
