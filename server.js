
// Include Libraries.
var oExpress = require('express');
var oWS = require('ws');
var oHTTP = require('http');
var oHelpers = require('./helpers');
var oAceDocument = require('./aceDocument').Document;
var oDatabase = require('./database');

// Create express app.
var oApp = oExpress();

// Handle landing on the root.
oApp.get('^/$', function(req, res)
{
    res.sendfile('static/index.html');
});

// Normal entrypoint.
oApp.get('/[a-z0-9]+/?$', function(req, res)
{
    res.sendfile('static/index.html');
});

// Static files.
oApp.use('/static/', oExpress.static(__dirname + '/static', {
    /* maxAge: 86400000 /* one day*/
}));

// Instantiate server.
var oServer = oHTTP.createServer(oApp);
oServer.listen(8080);

// Instantiate websocket listener.
var oWsServer = new oWS.Server({server: oServer});
oWsServer.on('connection', function(oSocket)
{
    new Client(oSocket);
});

var g_oWorkspaces = {}; // sID to Document instance.

var Client = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,
    _bCreatedDocument: false,
    
    __init__: function(oSocket)
    {
        this._oSocket = oSocket;
        oSocket.on('message', oHelpers.createCallback(this, this._onClientAction));
        oSocket.on('close', oHelpers.createCallback(this, function()
        {
            this._oWorkspace.removeClient(this);
        }));        
    },
    
    onDocumentLoad: function()
    {
        if (this._bCreatedDocument)
            this._oWorkspace.setClientDocumentID(this);
        else
            this._oWorkspace.setClientInitialValue(this);
    },
    
    sendAction: function(sType, oData)
    {
        this._oSocket.send(JSON.stringify(
        {
            sType: sType,
            oData: oData
        }));
    },

    _onClientAction: function(sJSONAction)
    {
        var oAction = JSON.parse(sJSONAction);
        switch(oAction.sType)
        {
            case 'createDocument':
                this._bCreatedDocument = true;
                oDatabase.createDocument(JSON.stringify(oAction.oData), this, function(sDocumentID)
                {
                    this._addToWorkspace(sDocumentID);
                });
                break;
            
            case 'openDocument':
                this._addToWorkspace(oAction.oData.sDocumentID);
                break;
            
            default:
                this._oWorkspace.onClientAction(this, oAction);
        }
    },
    
    _addToWorkspace: function(sDocumentID)
    {
        oHelpers.assert(!this._oWorkspace, 'Client already connected.');        
        if (sDocumentID in g_oWorkspaces)
            this._oWorkspace = g_oWorkspaces[sDocumentID];
        else
            this._oWorkspace = new Workspace(sDocumentID);
        this._oWorkspace.addClient(this);
    }
});

var Workspace = oHelpers.createClass(
{
    // Data
    _oAceDocument: null,
    _oDocument: null,
    _sDocumentID: '',

    // Loading state
    _bDocumentLoaded: false,
    
    // Audo save
    _iAutoSaveTimeoutID: null,
    _iAutoSaveTimeoutLength: 30, /* auto save every 30 seconds */
    
    // Editing
    _aClients: null,
    _oCurrentEditingClient: null,
    _oLastSelAction: null,
    _fnOnReleaseEditRights: null,
    
    __init__: function(sDocumentID)
    {
        g_oWorkspaces[sDocumentID] = this;
        this._sDocumentID = sDocumentID;
        this._aClients = [];
        
        oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
        {
            // Save pointer to document.
            this._oDocument = new Document(sDocumentJSON);
            this._oAceDocument = new oAceDocument(this._oDocument.get('sText'));
            this._bDocumentLoaded = true;
            
            // Fire client "load" callbacks.
            for (var i in this._aClients)
                this._aClients[i].onDocumentLoad();
        });
    },

    addClient: function(oClient)
    {
        this._aClients.push(oClient);
        this._oCurrentEditingClient = this._oCurrentEditingClient || oClient;
        if (this._bDocumentLoaded)
            oClient.onDocumentLoad();
    },
    
    removeClient: function(oClient)
    {
        // Remove the client.
        var iIndex = this._aClients.indexOf(oClient);
        this._aClients.splice(iIndex, 1);

        // Remove editing rights.
        if (oClient == this._oCurrentEditingClient)
            this._oCurrentEditingClient = null;

        // Close the document (if no editors left).
        if (this._aClients.length === 0)
        {
            this._save(oHelpers.createCallback(this, function()
            {
                if (this._aClients.length === 0)
                    delete g_oWorkspaces[this._sDocumentID];
            }));
        }
    },

    setClientInitialValue: function(oClient)
    {
        this._assertDocumentLoaded();
        this._updateDocumentText();
        oClient.sendAction('setDocumentData',
        {
            sText: this._oDocument.get('sText'),
            sMode: this._oDocument.get('sMode'),
            bIsEditing: this._oCurrentEditingClient == oClient
        });
    },
    
    setClientDocumentID: function(oClient)
    {
        this._assertDocumentLoaded();
        oClient.sendAction('setDocumentID',
        {
            sDocumentID: this._sDocumentID
        });
    },
  
    onClientAction: function(oClient, oAction)
    {
        this._assertDocumentLoaded();
        switch(oAction.sType)
        {
            case 'requestEditRights':
                this._oCurrentEditingClient = oClient;                
                if (this._oCurrentEditingClient)
                    this._oCurrentEditingClient.sendAction('removeEditRights');
                else
                    oClient.sendAction('editRightsGranted');                                
                break;
        
            case 'releaseEditRights':
                if (this._fnOnReleaseEditRights)
                    this._fnOnReleaseEditRights();
                this._oCurrentEditingClient.sendAction('editRightsGranted');
                break;
            
            case 'setMode':
                this._oDocument.set('sMode', oAction.oData.sMode);
                break;
                
            case 'setSelection':
                this._broadcastAction(oClient, oAction);
                this._oLastSelAction = oAction;
                break;
            
            case 'aceDelta':
                this._broadcastAction(oClient, oAction);
                this._oAceDocument.applyDeltas([oAction.oData]);
                this._setAutoSaveTimeout();
                break;
        }
    },

    _broadcastAction: function(oSendingClient, oAction)
    {
        // Send actions to all other clients.
        this._assertDocumentLoaded();
        for (var i = 0; i < this._aClients.length; i++)
        {
            var oClient = this._aClients[i];
            if(oClient != oSendingClient)
                oClient.sendAction(oAction)
        }
    },

    _save: function()
    {
        this._assertDocumentLoaded();
        this._updateDocumentText();
        this._clearAutoSaveTimeout();
        oDatabase.saveDocument(this._sDocumentID, this._oDocument.toJSON(), this, function(sError)
        {
            // Handle save errors.
        });
    },
    
    _setAutoSaveTimeout: function()
    {
        if (this._iAutoSaveTimeout === null)
        {
            var fnSave = oHelpers.createCallback(this, this._save);
            this._iAutoSaveTimeoutID = setTimeout(fnSave, this._iAutoSaveTimeoutLength);
        }        
    },
    
    _clearAutoSaveTimeout: function()
    {
        clearTimeout(this._iAutoSaveTimeoutID);
        this._iAutoSaveTimeoutID = null;        
    },
    
    _updateDocumentText: function()
    {
        this._oDocument.set('sText', this._oAceDocument.getValue());
    },
    
    _assertDocumentLoaded: function()
    {
        oHelpers.assert(this._bDocumentLoaded, 'Document not yet initialized.');
    }
});


var Document = oHelpers.createClass(
{
    _bReadOnly:     false,
    _aChildrenIDs:  null,
    _sParentID:     '',
    _sMode:         '',
    _sText:         '',

    __init__: function(sJSON)
    {
        var oData = JSON.parse(sJSON);
        for (sKey in oData)
            this.set(sKey, oData[sKey]);
    },
    
    set: function(sKey, oValue)
    {
        var sProp = '_' + sKey;
        oHelpers.assert (sProp in this, 'Invalid key: ' + sKey);
        oHelpers.assert (typeof(oValue) == typeof(this[sProp]), 'Invalid type!');
        this[sProp] = oValue;
    },
    
    get: function(sKey)
    {
        var sProp = '_' + sKey;
        oHelpers.assert (sProp in this, 'Invalid key: ' + sKey);
        return JSON.parse(JSON.stringify(this[sProp])); // Deep clone.
    },

    toJSON: function()
    {
        var oData = {};
        for (sProp in this)
        {
            if (sProp.charAt(0) == '_' && typeof(this[sProp]) != 'function')
                oData[sProp.substr(1)] = this[sProp];
        }
        return JSON.stringify(oData);
    }
});
