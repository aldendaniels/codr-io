var oHelpers  = require('./helpers');
var Workspace = require('./workspace');
var Document  = require('./document');
var oDatabase = require('./database');

module.exports = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,
    _bCreatedDocument: false,
    _aPreInitActionQueue: null,
    _bInitialized: false,
    _bClosed: false,
    _sClientID: '',
    _oLastSelAction: null,
    
    __init__: function(oSocket)
    {
        this._aPreInitActionQueue = [];
        this._oSocket = oSocket;
        oSocket.on('message', oHelpers.createCallback(this, this._onClientAction));
        oSocket.on('close', oHelpers.createCallback(this, function()
        {
            if (this._oWorkspace)
                this._oWorkspace.removeClient(this);
            else
                this._bClosed = true;
        }));
    },
    
    setClientID: function(sClientID)
    {
        this._sClientID = sClientID;
    },

    getClientID: function()
    {
        oHelpers.assert(this._sClientID, 'The username is not yet initialized.')
        return this._sClientID;
    },
    
    getLastSelAction: function()
    {
        return this._oLastSelAction;  
    },
    
    clientCreatedDocument: function()
    {
        return this._bCreatedDocument;
    },
    
    onDocumentLoad: function()
    {    
        // Send queued actions.
        this._bInitialized = true;
        while (this._aPreInitActionQueue.length)
        {
            this._onClientAction(this._aPreInitActionQueue.pop());
        }
    },
    
    sendAction: function(param1, param2) /* either sendAction(sType, oData) or sendAction(oAction)*/
    {
        if (typeof(param1) == 'string')
        {
            this._oSocket.send(JSON.stringify(
            {
                sType: param1,
                oData: param2
            }));     
        }
        else
        {
            oHelpers.assert(typeof(param1) == 'object', 'Invalid parameter type');
            this._oSocket.send(JSON.stringify(param1));
        }
    },

    abort: function(sMessage)
    {
        this.sendAction('error', {'sMessage': sMessage});
        this._oSocket.close();
    },

    _onClientAction: function(sJSONAction)
    {
        var oAction = JSON.parse(sJSONAction);
        switch(oAction.sType)
        {
            case 'createDocument':
                this._bCreatedDocument = true;
                var oNewDocument = new Document(oAction.oData);
                oDatabase.createDocument(oNewDocument.toJSON(), this, function(sDocumentID)
                {
                    this._addToWorkspace(sDocumentID);
                });
                break;
            
            case 'openDocument':
                this._addToWorkspace(oAction.oData.sDocumentID);
                break;
            
            case 'setSelection':
                oAction.sType = 'setRemoteSelection';
                oAction.oData.sClientID = this._sClientID;
                this._oLastSelAction = oAction;
            
            default:
                if (this._bInitialized )
                    this._oWorkspace.onClientAction(this, oAction);
                else
                    this._aPreInitActionQueue.push(sJSONAction);
        }
    },
    
    _addToWorkspace: function(sDocumentID)
    {
        // Validate.
        oHelpers.assert(!this._oWorkspace, 'Client already connected.');
        if (this._bClosed)
            return;
                
        // Get or add workspace.
        if (sDocumentID in g_oWorkspaces)
        {
            this._oWorkspace = g_oWorkspaces[sDocumentID];
            this._oWorkspace.addClient(this);
        }
        else
        {
            // TODO (AldenD 06-29-2013): On document creation we could tell the workspace
            // not to go to the database and directly give it the mode.
            this._oWorkspace = new Workspace(sDocumentID, this);
        }
    }
});
