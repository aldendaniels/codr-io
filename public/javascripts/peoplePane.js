
var PeoplePane = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,
    _aCurUsers: null,
    _aHistory: null,
    _aTypingUsers: null,
    _bTyping: false,
    _iTypingTimeout: null,
    
    __type__: 'PeoplePane',    

    __init__: function(oWorkspace, oSocket)
    {
        // Save data.
        this._oSocket = oSocket;
        this._oWorkspace = oWorkspace;
        this._aCurUsers = [];
        this._aHistory = [];
        this._aTypingUsers = [];
        
        // Listen to socket events.
        this._oSocket.bind('message', this, this._handleServerAction);
                
        // Init DOM events.
        this._attachDOMEvents();
    },
    
    /* START: DOM Event handling */
    contains: function(jElem)
    {
        return jElem.closest('#people').length > 0;
    },
    onEvent: function()
    {
    },
    focus: function()
    {
        $('#chat-box').focus();
    },
    onBlur: function()
    {
    },
    /* END: DOM Event handling */
    
    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'addUser':
                this._aCurUsers.push(oAction.oData.sUsername);
                this._reRender();
                break;
                
            case 'removeUser':
                this._aCurUsers.splice(this._aCurUsers.indexOf(oAction.oData.sUsername), 1);
                this._reRender();
                break;
                
            case 'newChatMessage':
                this._addNewChatMessage(oAction.oData.sUsername, oAction.oData.sMessage);
                break;
                
            case 'startTyping':
                this._aTypingUsers.push(oAction.oData.sUsername);
                this._reRender();
                break;
                
            case 'endTyping':
                this._aTypingUsers.splice(this._aTypingUsers.indexOf(oAction.oData.sUsername), 1);
                this._reRender();
                break;
            
            default:
                return false;
        }
        return true;
    },

    _addNewChatMessage: function(sUsername, sMessage)
    {
        this._aHistory.push(
        {
            'sUsername': sUsername,
            'sMessage': sMessage
        });
        this._reRender();
    },

    _sendNewMessage: function(sMessage)
    {
        sMessage = sMessage.replace(/^\s+|\s+$/g, "");
        if (!sMessage)
            return;

        this._oSocket.send('newChatMessage',
        {
            'sMessage': sMessage
        });
        this._aHistory.push(
        {
            'sUsername': this._oWorkspace.getUserInfo()['sUsername'],
            'sMessage': sMessage
        });

        this._reRender();
    },

    _reRender: function()
    {
        // Remove old comments.
        var jWrapper = $('#comments-wrapper');
        jWrapper.empty();

        // Populate current users.
        var jViewing = $(document.createElement('div'));
        jViewing.append('<br/>Viewing: ' + this._englishFormatArray(this._aCurUsers) + '<br/></br>');
        jWrapper.append(jViewing);

        // Show chat history.
        for (var i = 0; i < this._aHistory.length; i++)
        {
            var jComment = $(document.createElement('div'));
            var oComment = this._aHistory[i];
            jComment.text(oComment.sUsername + ': ' + oComment.sMessage).append('<br/><br/>');
            jWrapper.append(jComment);
        }

        // Show currently typing.
        var jTyping = $(document.createElement('div'));
        jTyping.append('<br/><br/>Typing: ' + this._englishFormatArray(this._aTypingUsers));
        jWrapper.append(jTyping);
    },

    _englishFormatArray: function(aArray)
    {
        if (aArray.length === 0)
            return '';

        if (aArray.length === 1)
            return aArray[0];

        if (aArray.length === 2)
            return aArray.join(' and ');

        return aArray.slice(0, -1).join(', ') + ' and ' + aArray[aArray.length - 1];
    },

    _attachDOMEvents: function()
    {
        oHelpers.on(window, 'click', this, function(oEvent)
        {
            var jTarget = $(oEvent.target);

            if (jTarget.closest('#people-pane-button').length)
            {
                $('#workspace').toggleClass('people-pane-expanded');
                this._oWorkspace.resize();
            }
        });

        oHelpers.on(window, 'keypress', this, function(oEvent)
        {
            var jTarget = $(oEvent.target);
            var iKeyCode = oEvent.keyCode ? oEvent.keyCode : oEvent.which;

            if (jTarget.is('#chat-box'))
            {
                if (iKeyCode == 13)
                {
                    this._clearTyping();

                    this._sendNewMessage($('#chat-box').val());
                    $('#chat-box').val('');
                    oEvent.preventDefault();
                }
                else
                {
                    if (!this._bTyping)
                    {
                        this._oSocket.send('startTyping');
                        this._bTyping = true;
                    }

                    if (this._iTypingTimeout)
                        window.clearTimeout(this._iTypingTimeout);

                    this._iTypingTimeout = window.setTimeout(
                        oHelpers.createCallback(this, this._clearTyping),
                        1000
                    );
                }
            }
        });
    },

    _clearTyping: function()
    {
        window.clearTimeout(this._iTypingTimeout);
        this._bTyping = false;
        this._iTypingTimeout = null;
        this._oSocket.send('endTyping');
    }
});

