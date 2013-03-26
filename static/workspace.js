var Workspace = oHelpers.createClass({
    _oSocket: null,
    _oEditor: null,
    _sTitle: '',

    __init__: function()
    {
        this._oEditor = new Editor();
    },

    connect: function(oSocket)
    {
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerAction);

        if (IS_NEW_DOCUMENT)
        {
            this._oSocket.send('createDocument',
            {
                sText: this._oEditor.getText(),
                sMode: this._oEditor.getMode()
            });            
        }
        else
        {
            this._oSocket.send('openDocument',
            {
                sDocumentID: window.location.pathname.substr(1)
            });
        }

        $('#documentTitleWrapper').on('click', oHelpers.createCallback(this, function()
        {
            var sNew = prompt("Please enter the new document title.", this._sTitle);
            if (sNew === null)
                return;

            this._sTitle = sNew;
            this._oSocket.send('setDocumentTitle', {
                'sTitle': this._sTitle
            });
            $('#codr-toolbar #documentTitle').text(this._sTitle);
        }));

        this._oEditor.connect(oSocket);
    },

    setMode: function(sMode)
    {
        this._oEditor.setMode(sMode);
        $('#codr-toolbar #documentMode').text(sMode);
    },

    focusEditor: function()
    {
        this._oEditor.focusEditor();
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'setDocumentTitle':
                $('#codr-toolbar #documentTitle').text(oAction.oData.sTitle);
                this._sTitle = oAction.oData.sTitle;
                break;

            case 'setMode':
                $('#codr-toolbar #documentMode').text(oAction.oData.sMode);
                break;

            case 'removeEditRights':
                this._oEditor.setIsEditing(false);        
                this._oSocket.send('releaseEditRights'); // Notify server of action receipt.
                break;

            case 'editRightsGranted':
                this._oEditor.setIsEditing(true);
                break;

            case 'setDocumentID': // Fired after creating a new document.
                this._setDocumentID(oAction.oData.sDocumentID);
                break;
 
            default:
                return false;
        }

        return true;
    },

    _setDocumentID: function(sID)
    {
        window.history.replaceState(null, '', '/' + sID);
    }
});
