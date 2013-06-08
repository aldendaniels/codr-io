
var PeoplePane = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,
    _oUsers: null,
    _oCurrentUsers: null, // It's an object to 1) prevent duplicates and 2) allow "sID in _oCurrentUsers"
    _aHistory: null,

    __init__: function(oWorkspace, oSocket)
    {
        this._oSocket = oSocket;
        this._oWorkspace = oWorkspace;

        this._oSocket.bind('message', this, this._handleServerAction);
        
        var oUserInfo = this._oWorkspace.getUserInfo();
        this._oUsers = {};
        this._oCurrentUsers = {};
        this._oUsers[oUserInfo.sUserID] = oUserInfo.sUserName;
        this._oCurrentUsers[oUserInfo.sUserID] = null;
        
        this._aHistory = [];

        this._attachDOMEvents();
        this._reRender();
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'addUser':
                this._oUsers[oAction.oData.sUserID] = oAction.oData.sUserName;
                this._oCurrentUsers[oAction.oData.sUserID] = null;
                this._reRender();
                break;

            case 'addInactiveUser':
                this._oUsers[oAction.oData.sUserID] = oAction.oData.sUserName;
                break;

            case 'removeUser':
                delete this._oCurrentUsers[oAction.oData.sUserID];
                this._reRender();
                break;

            case 'newChatMessage':
                this._addNewChatMessage(oAction.oData.sUserID, oAction.oData.sMessage);
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
        for (var sID in this._oCurrentUsers)
            aViewingUserNames.push(this._oUsers[sID]);

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

            if (jTarget.is('#chat-box') && iKeyCode == 13)
            {
                this._sendNewMessage($('#chat-box').val());
                $('#chat-box').val('');
                oEvent.preventDefault();
            }
        });
    }
});

