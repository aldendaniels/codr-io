
// Include Libraries.
var oExpress = require('express');
var oWS = require('ws');
var oHTTP = require('http');
var oHelpers = require('helpers');

// Create express app.
var oApp = oExpress();
oApp.use(oExpress.static(__dirname + '/static'));

// Instantiate server.
var oServer = oHTTP.createServer(oApp);
oServer.listen(8080);

// Instantiate websocket listener.
var oWsServer = new oWS.Server({server: oServer});
oWsServer.on('connection', function(oSocket)
{
    // Create new doc (if necessary).
    var sID = 'abcd'; // Get this from URL.
    if (!(sID in g_oDocuments))
        g_oDocuments[sID] = new Document();

    // Register client.
    g_oDocuments[sID].registerClient(oSocket);    
});

var g_oDocuments = {}; // sID to Document instance.


var Document = oHelpers.createClass(
{
    _aLines: [],
    _oEventQueue: null,
    _aClients: [],
    
    __init__: function()
    {
        this._oEventQueue = new EventQueue();
    },
    
    registerClient: function(oSocket)
    {
        this._aClients.push(new Client(oSocket, this));
    },
    
    removeClient: function(oClient)
    {
        var iIndex = this._aClients.indexOf(oClient);
        this._aClients.splice(iIndex, 1);
    },
    
    onClientEvent: function(oEvent)
    {
        this._oEventQueue.push(oEvent);
        for (var i = 0; i < this._aClients.length; i++)
        {
            var oClient = this._aClients[i];
            if(oEvent.oClient == oClient)
            {
                if (oEvent.sType != 'selectionChange')
                    oClient.notifyEventProcessed();
            }
            else
            {
                oClient.sendEvent(oEvent)
            }
        }
    }
});

var EventQueue = oHelpers.createClass({

    _aEvents: [],

    push: function(oEvent)
    {
        this._aEvents.push(oEvent);
        // TODO: Do magic here.
    },
});

var Client = oHelpers.createClass({

    _oSocket: null,
    _oDocument: null,
    _sID: '1234',
    
    __init__: function(oSocket, oDocument)
    {
        this._oSocket = oSocket;
        this._oDocument = oDocument;
        
        oSocket.on('message', oHelpers.createCallback(this, this._onClientEvent));
        oSocket.on('close', oHelpers.createCallback(this, function()
        {
            this._oDocument.removeClient(this);
        }));
    },
    
    sendEvent: function(oEvent)
    {
        this._send(oEvent.oEventData);
    },
    
    notifyEventProcessed: function()
    {
        this._send(
        {
            sType: 'eventProcessed',
            oData: ''
        });
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