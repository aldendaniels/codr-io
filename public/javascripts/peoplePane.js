
var PeoplePane = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,

    __init__: function(oWorkspace, oSocket)
    {
        this._oSocket = oSocket;
        this._oWorkspace = oWorkspace;

        this._oSocket.bind('message', this, this._handleServerAction);
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
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
        alert('User ' + sUserID + ' says: ' + sMessage);
    },

    _sendNewMessage: function(sMessage)
    {
        this._oSocket.send('newChatMessage',
        {
            'sMessage': sMessage
        });
    }
});

