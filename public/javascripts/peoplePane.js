
var PeoplePane = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,
    _aCurUsers: null,
    _aHistory: null,
    _aTypingUsers: null,
    _bTyping: false,
    _iTypingTimeout: null,
    _iUnseen: 0,
    
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

        var oRealThis = this;
        $('#username').on('blur', function(oEvent)
        {
            oRealThis.onEvent(oEvent);
        });
    },
    
    contains: function(jElem)
    {
        return jElem.closest('#people').length > 0;
    },
    
    onEvent: function(oEvent)
    {
        // Get data.
        var jTarget = $(oEvent.target);
        var sEventType = oEvent.type;

        if (sEventType == 'click')
        {
            return;
        }
        
        if (sEventType == 'keypress')
        {
            if (jTarget.is('#chat-box'))
            {
                if (oEvent.which == 13)
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
        }

        if (sEventType == 'blur')
        {
            if (jTarget.is('#username'))
                this._changeUsername(jTarget.val());
        }
    },

    focus: function()
    {
        $('#chat-box').focus();
        this._iUnseen = 0;
        this._reRender();
    },

    onBlur: function()
    {
    },
    
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
        if (!this._isPaneOpen())
            this._iUnseen++;

        this._aHistory.push(
        {
            'sUsername': sUsername,
            'sMessage': sMessage
        });
        this._reRender();
    },

    _changeUsername: function(sUsername)
    {
        this._oSocket.send('changeUsername',
        {
            'sUsername': sUsername
        });

        this._oWorkspace.getUserInfo()['sUsername'] = sUsername;
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

        // Update the notifications.
        $('#people-pane-button-notification').text(this._iUnseen || '');
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

    _clearTyping: function()
    {
        window.clearTimeout(this._iTypingTimeout);
        this._bTyping = false;
        this._iTypingTimeout = null;
        this._oSocket.send('endTyping');
    },
    
    _isPaneOpen: function()
    {
        return $('#workspace').hasClass('people-pane-expanded');
    }
});

