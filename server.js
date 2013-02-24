
// Include Libraries.
var oExpress = require('express');
var oWS = require('ws');
var oHTTP = require('http');
var oHelpers = require('./helpers');
var oAceDocument = require('./aceDocument').Document;
var oDatabase = require('./database');
var assert = require('assert');

// Create express app.
var oApp = oExpress();

// Handle landing on the root.
oApp.get('^/$', function(req, res)
{
    generateIDAndRedirect(res);
});

// Normal entrypoint.
oApp.get('/[a-zA-Z0-9]+/?$', function(req, res)
{
    res.sendfile('static/index.html');
});

// Static files.
oApp.use('/static/', oExpress.static(__dirname + '/static'));

// Instantiate server.
var oServer = oHTTP.createServer(oApp);
oServer.listen(8080);

// Instantiate websocket listener.
var oWsServer = new oWS.Server({server: oServer});
oWsServer.on('connection', function(oSocket)
{
    var aMatch = oSocket.upgradeReq.url.match('^/([a-zA-Z0-9]+)/?$')
    if (!aMatch)
    {
        oSocket.close();
        return;
    }

    var sID = aMatch[1];

    // Create new doc (if necessary).
    if (!(sID in g_oDocuments))
        g_oDocuments[sID] = new Document(sID);

    // Register client.
    g_oDocuments[sID].registerClient(oSocket);    
});

function generateIDAndRedirect(res)
{
    var sID = "";
    var sChars = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 7; i++ )
        sID += sChars.charAt(Math.floor(Math.random() * sChars.length));

    oDatabase.documentExists(sID, this, function(bExists)
    {
        if (!bExists)
            res.redirect('/' + sID);
        else
            generateIDAndRedirect(res);
    });
}

var g_oDocuments = {}; // sID to Document instance.

var Document = oHelpers.createClass(
{
    _aClients: null,
    _oAceDocument: null,
    _bInitialized: false,
    _sID: '',
    _aPreInitClients: null,
    _iSaveTimeout: null,
    _oCurrentEditingClient: null,
    _oLastSelEvent: null,
    
    __init__: function(sID)
    {
        this._sID = sID;
        this._aPreInitClients = [];
        this._aClients = [];
        
        oDatabase.documentExists(sID, this, function(bExists){
            if (bExists)
                oDatabase.getDocument(sID, this, this._onInit);
            else
                this._onInit('', '');
        });
    },
    
    registerClient: function(oSocket)
    {
        if (!this._bInitialized)
        {
            this._aPreInitClients.push(oSocket);
            return;
        }

        // Create client.
        var bIsEdting = !this._oCurrentEditingClient;
        var oNewClient = new Client(oSocket, this, bIsEdting);
        this._aClients.push(oNewClient);
        
        // Set as primary editor.
        if (bIsEdting)
            this._oCurrentEditingClient = oNewClient;
        
        // Show selection to non-primary (readonly) editors.
        if (!bIsEdting && this._oLastSelEvent)
        	oNewClient.sendEvent(this._oLastSelEvent);
    },
    
    removeClient: function(oClient)
    {
        this._assertInit();
        var iIndex = this._aClients.indexOf(oClient);
        this._aClients.splice(iIndex, 1);

        if (oClient == this._oCurrentEditingClient)
            this._oCurrentEditingClient = null;

        if (this._aClients.length === 0)
        {
            this.save(oHelpers.createCallback(this, function()
            {
                if (this._aClients.length === 0)
                    delete g_oDocuments[this._sID];
            }));
        }
    },
        
    onClientEvent: function(oEvent)
    {
        this._assertInit();
        
        // TODO: This is special.
        if (oEvent.oEventData.sType == 'requestEditRights')
        {
            if (this._oCurrentEditingClient)
            {
                this._oCurrentEditingClient.sendEvent(
                {
                    oClient: oEvent.oClient,
                    oEventData: {sType: 'removeEditRights'}
                });                
            }
            else
            {
                this._oCurrentEditingClient.sendEvent(
                {
                    oClient: oEvent.oClient,
                    oEventData: {sType: 'editRightsGranted'}
                });                
            }
            
            this._oCurrentEditingClient = oEvent.oClient;
            return;
        }
        
        // TODO: This is special.
        if (oEvent.oEventData.sType == 'releaseEditRights')
        {
            this._oCurrentEditingClient.sendEvent(
            {
                oClient: oEvent.oClient,
                oEventData: {sType: 'editRightsGranted'}
            });
            return;
        }

        // Send events to all other clients.
        for (var i = 0; i < this._aClients.length; i++)
        {
            var oClient = this._aClients[i];
            if(oEvent.oClient != oClient)
                oClient.sendEvent(oEvent)
        }
        
        // Update stored selection.
        if (oEvent.oEventData.sType == 'selectionChange')
        {
            this._oLastSelEvent = oEvent;
        }
        
        // Update stored document.
        if (oEvent.oEventData.sType == 'aceDelta')
        {
            this._oAceDocument.applyDeltas([oEvent.oEventData.oDelta.data]);
            
            if (this._iSaveTimeout === null)
                this._setSaveTimeout();
        }
    },
    
    getText: function()
    {
        this._assertInit();
        return this._oAceDocument.getValue();
    },
    
    save: function(fnOnResponse)
    {
        this._assertInit();
                
        this._clearSaveTimeout();
        oDatabase.saveDocument(this._sID, this.getText(), this, fnOnResponse || function(){});
    },
    
    _setSaveTimeout: function()
    {
        this._assertInit();
        
        assert(this._iSaveTimeout === null);
        this._iSaveTimeout = setTimeout(oHelpers.createCallback(this, function()
        {
            this.save(oHelpers.createCallback(this, this._clearSaveTimeout));
        }), 30000);
    },
    
    _clearSaveTimeout: function()
    {
        this._assertInit();
        
        if (this._iSaveTimeout)
            clearTimeout(this._iSaveTimeout);
    },
    
    _onInit: function(oErr, sDocument)
    {
        this._oAceDocument = new oAceDocument(sDocument);
        this._bInitialized = true;
        
        var oSocket = this._aPreInitClients.pop();
        while (oSocket)
        {
            this.registerClient(oSocket);
            oSocket = this._aPreInitClients.pop();
        }
    },
    
    _assertInit: function()
    {
        if (!this._bInitialized)
            throw 'Document not yet initialized.';
    }
});

var Client = oHelpers.createClass({

    _oSocket: null,
    _oDocument: null,
    _sID: '1234',
    
    __init__: function(oSocket, oDocument, bIsEdting)
    {
        this._oSocket = oSocket;
        this._oDocument = oDocument;
        
        oSocket.on('message', oHelpers.createCallback(this, this._onClientEvent));
        oSocket.on('close', oHelpers.createCallback(this, function()
        {
            this._oDocument.removeClient(this);
        }));
        
        oSocket.send(JSON.stringify(
        {
            'sType': 'setInitialValue',
            'sData': this._oDocument.getText(),
            'bIsEdting': bIsEdting
        }));
    },
    
    sendEvent: function(oEvent)
    {
        this._send(oEvent.oEventData);
    },
    
    _onClientEvent: function(sEventData)
    {
        // Get event data.
        var oEventData = JSON.parse(sEventData);
        if (oEventData.sType == 'selectionChange')
            oEventData.sPeerID = this._sID;
        
        // Send event to document.
        this._oDocument.onClientEvent(
        {
            oClient: this,
            oEventData: oEventData
        });
    },
    
    _send: function(oEvent)
    {
        this._oSocket.send(JSON.stringify(oEvent));
    }
});

require('./test').runTests();
