
var PeoplePane = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,
    _oUsers: null,

    __init__: function(oWorkspace, oSocket)
    {
        this._oSocket = oSocket;
        this._oWorkspace = oWorkspace;

        this._oSocket.bind('message', this, this._handleServerAction);
        
        var oUserInfo = this._oWorkspace.getUserInfo();
        this._oUsers = {};
        this._oUsers[oUserInfo.sUserID] = oUserInfo.sUserName;
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'addUser':
                this._oUsers[oAction.oData.sUserID] = oAction.oData.sUserName;
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
        alert(this._oUsers[sUserID] + ' says: ' + sMessage);
    },

    _sendNewMessage: function(sMessage)
    {
        this._oSocket.send('newChatMessage',
        {
            'sMessage': sMessage
        });
    }
});

