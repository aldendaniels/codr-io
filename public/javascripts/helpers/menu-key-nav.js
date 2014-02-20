define(function(require)
{
    // Dependencies.
    var $        = require('lib/jquery'),
        oHelpers = require('helpers/helpers-web'),
        Keyable  = require('helpers/keyable');

    return oHelpers.createClass(
    {
        _jParent:     null,
        _oKeyable:    null,
        _fnOnSelect:  null,
        _bIsDisabled: false,
        
        __init__: function(jParent, oScope, fnOnSelect)
        {
            this._jParent    = $(jParent);
            this._fnOnSelect = oHelpers.createCallback(oScope, fnOnSelect);
            this._oKeyable   = new Keyable(jParent, 'id', '.option');
            this._oKeyable.attach();
        },
        
        update: function()
        {
            this._oKeyable.update();
        },
        
        setDisabled: function(bIsDisabled)
        {
            this._bIsDisabled = bIsDisabled;
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
                        this._selectCur();
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
                                this._selectCur();
                                oEvent.preventDefault();
                            }
                            break;
                    }        
                    break;
            }
        },
        
        _selectCur: function()
        {
            if (!this._bIsDisabled)
            {
                this._fnOnSelect(this._oKeyable.getCurrent().attr('id'));
                this._jParent.find('.option.selected').removeClass('selected');
                this._jParent.find('.option.current').addClass('selected');
            }
        },
        
        _scrollIntoView: function()
        {            
            // Get Elems.
            var jElem = this._oKeyable.getCurrent();
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