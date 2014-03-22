
define(function(require)
{
    // Dependencies.
    // Requires jQuery.
    var oHelpers = require('helpers/helpers-web');
                   require('lib/linkify');

    return (
    {
        _oSocket: null,
        _fnGetUserInfo: null,
        _aHistory: null,
        _aTypingUsers: null,
        _bTyping: false,
        _iTypingTimeout: null,
        _iUnseen: 0,
        _bChatVisible: false,
        
        __type__: 'PeoplePane',    
        
        init: function(oSocket, fnGetUserInfo)
        {
            // Save data.
            this._oSocket = oSocket;
            this._fnGetUserInfo = fnGetUserInfo;
            this._aCurUsers = [];
            this._aHistory = [];
            this._aTypingUsers = [];
            
            // Listen to socket events.
            this._oSocket.bind('message', this, this._handleServerAction);
        },
        
        onFocusIn: function()
        {
            this._bChatOpen = true;
            if (this._bChatVisible)
                this._iUnseen = 0;
            this._reRender();
        },
        
        onFocusOut: function()
        {
            this._bChatOpen = false;
        },
        
        onEvent: function(oEvent)
        {
            // Get data.
            var jTarget = $(oEvent.target);
            var jActiveElem = $(document.activeElement);
            var sEventType = oEvent.type;
            
            if (sEventType == 'click')
            {
                if (jTarget.is('#chat-identify-ok-button'))
                    this._changeClientID($('#chat-identify').val());
                return;
            }
            
            if (sEventType == 'keypress')
            {
                if (jActiveElem.closest('#chat-identify-wrapper').length)
                {
                    if (oEvent.which == 13)
                        this._changeClientID($('#chat-identify').val());
                    return;                
                }
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
                    this._changeClientID(jTarget.val());
            }
        },
        
        _showChatBox: function()
        {
            if (this._bChatVisible)
                return;
            
            var bChatIsFocused = $(document.activeElement).parents('#toolbar-item-chat').length;
            $('#chat').removeClass('identify');
            $('#chat-identify').prop('disabled', true);
            $('#chat-identify-ok-button').prop('disabled', true);
            $('#chat-box').prop('disabled', false);
            
            // Focus chat.
            if (bChatIsFocused)
                $('#chat-box').focus();
                
            this._bChatVisible = true;
            this._iUnseen = 0;
            this._reRender();
        },
    
        _handleServerAction: function(oAction)
        {
            switch(oAction.sType)
            {
                case 'newChatMessage':
                    this._addNewChatMessage(oAction.oData.sClientID, oAction.oData.sMessage);
                    break;
                    
                case 'startTyping':
                    this._aTypingUsers.push(oAction.oData.sClientID);
                    this._reRender();
                    break;
                    
                case 'endTyping':
                    this._aTypingUsers.splice(this._aTypingUsers.indexOf(oAction.oData.sClientID), 1);
                    this._reRender();
                    break;
    
                case 'invalidClientIDChange':
                    
                    $('#chat-identify-error-message').text(oAction.oData.sReason);
                    break;
    
                case 'newClientIDAccepted':
                    
                    // Save username.
                    this._fnGetUserInfo()['sClientID'] = oAction.oData.sClientID;
                    
                    // Show chat box.
                    this._showChatBox();
                    
                    break;
                
                default:
                    return false;
            }
            return true;
        },
    
        _addNewChatMessage: function(sClientID, sMessage)
        {
            if (!this._bChatOpen || !this._bChatVisible)
                this._iUnseen++;
                
            this._aHistory.push(
            {
                'sClientID': sClientID,
                'sMessage': sMessage
            });
            this._reRender();
        },
    
        _changeClientID: function(sClientID)
        {
            this._oSocket.send('changeClientID',
            {
                'sClientID': sClientID
            });
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
                'sClientID': this._fnGetUserInfo()['sClientID'],
                'sMessage': sMessage
            });
    
            this._reRender();
        },
    
        _reRender: function()
        {
            // Remove old comments.
            var jHistory = $('#chat-history');
            jHistory.empty();
            
            // Show chat history.
            for (var i = 0; i < this._aHistory.length; i++)
            {
                var oMessage = this._aHistory[i];
                var jMessage = $(
                    '<div class="chat-message">' +
                       '<span class="chat-message-from"></span>' +
                       '<span class="chat-message-text"></span>' +
                    '</div>'
                );
                jMessage.find('.chat-message-from').text(oMessage.sClientID + ': ');
                jMessage.find('.chat-message-text').text(oMessage.sMessage);
                jHistory.append(jMessage);
            }
            
            // Linkify links.
            jHistory.find('.chat-message-text').linkify({target: "_blank"});
            
            // Scroll to bottom.
            jHistory.scrollTop(10000000);
            
            // Show currently typing.
            $('#chat-typing-names').text(this._englishFormatArray(this._aTypingUsers));
            
            // Update the notifications.
            $('#chat-unread-count').text(this._iUnseen);
            $('#chat-unread-count').toggle(!!this._iUnseen);
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
});
