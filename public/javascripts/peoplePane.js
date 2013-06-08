
var PeoplePane = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,
    _oUsers: null,
    _aCurrentUsers: null,
    _aHistory: null,
    _aCurrentlyTyping: null,
    _bTyping: false,
    _iTypingTimeout: null,

    __init__: function(oWorkspace, oSocket)
    {
        this._oSocket = oSocket;
        this._oWorkspace = oWorkspace;

        this._oSocket.bind('message', this, this._handleServerAction);
        
        var oUserInfo = this._oWorkspace.getUserInfo();
        this._oUsers = {};
        this._oUsers[oUserInfo.sUserID] = oUserInfo.sUserName;

        this._aCurrentUsers = [];
        this._aCurrentUsers.push(oUserInfo.sUserID)
        
        this._aHistory = [];
        this._aCurrentlyTyping = [];

        this._attachDOMEvents();
        this._reRender();
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'addUser':
                this._oUsers[oAction.oData.sUserID] = oAction.oData.sUserName;
                this._aCurrentUsers.push(oAction.oData.sUserID);
                this._reRender();
                break;

            case 'addInactiveUser':
                this._oUsers[oAction.oData.sUserID] = oAction.oData.sUserName;
                break;

            case 'removeUser':
                this._aCurrentUsers.pop(this._aCurrentUsers.indexOf(oAction.oData.sUserId));
                this._reRender();
                break;

            case 'newChatMessage':
                this._addNewChatMessage(oAction.oData.sUserID, oAction.oData.sMessage);
                break;

            case 'startTyping':
                this._aCurrentlyTyping.push(oAction.oData.sUserID);
                this._reRender();
                break;

            case 'endTyping':
                this._aCurrentlyTyping.pop(this._aCurrentlyTyping.indexOf(oAction.oData.sUserID));
                this._reRender();
                break;
 
            default:
                return false;
        }

        return true;
    },

    _addNewChatMessage: function(sUserID, sMessage)
    {
        this._aHistory.push(
        {
            'sUserID': sUserID,
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
            'sUserID': this._oWorkspace.getUserInfo()['sUserID'],
            'sMessage': sMessage
        });

        this._reRender();
    },

    _reRender: function()
    {
        var jWrapper = $('#comments-wrapper');
        jWrapper.empty();

        var aViewingUserNames = [];
        for (var i = 0; i < this._aCurrentUsers.length; i++)
            aViewingUserNames.push(this._oUsers[this._aCurrentUsers[i]]);

        var jViewing = $(document.createElement('div'));
        jViewing.append('Viewing: ' + this._englishFormatArray(aViewingUserNames));
        jWrapper.append(jViewing);

        for (var i = 0; i < this._aHistory.length; i++)
        {
            var jComment = $(document.createElement('div'));
            var oComment = this._aHistory[i];
            jComment.text(this._oUsers[oComment.sUserID] + ': ' + oComment.sMessage);
            jWrapper.append(jComment);
        }

        var aTypingNames = [];
        for (var i = 0; i < this._aCurrentlyTyping.length; i++)
            aTypingNames.push(this._oUsers[this._aCurrentlyTyping[i]]);

        var jTyping = $(document.createElement('div'));
        jTyping.append('Typing" ' + this._englishFormatArray(aTypingNames));
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
                $('#workspace').toggleClass('people-pane-expanded');
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

