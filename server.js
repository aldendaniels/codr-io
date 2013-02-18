
// Include Libraries.
var oExpress = require('express');
var oWS = require('ws');
var oHTTP = require('http');
var oClass = require('class');

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
    if (sID in g_oDocuments)
        g_oDocuments[sID] = new Document(sID);
    
    // Register client.
    oDocuments[sID].registerClient(oSocket);    
});

var g_oDocuments = {}; // sID to Document instance.


var Document = oClass.create(
{
    _aLines: [],
    _oEventQueue: null,
    _aClients: [],
    
    __init__: function()
    {
        // TODO
    },
    
    registerClient: function(oSocket)
    {
        this.aClients.push(new Client(oSocket, this));
    },
    
    onClientEvent: function(oEvent, )
    {
        this._oEventQueue.push(oEvent);
        for (var i = 0; i < aClients.length; i++)
        {
            var oClient = aClients[i];
            if(oEvent.oClient == oClient)
                oClient.notifyEventProcessed();
            else
                oClient.send(oEvent)
        }
    }
});

var EventQueue = oClass.create({

    _aEvents: [],

    push: function(oEvent)
    {
        this._aEvents.push(oEvent);
        // TODO: Do magic here.
    },
});

var Client = pClass.create({

    _oSocket: null,
    _oDocument: null,
    
    __init__: function(oSocket, oDocument)
    {
        this._oSocket = oSocket;
        this._oDocument = oDocument;
        this._sID = Math.random(0, 1) + '';
        
        oSocket.on('message', helpers.createCallback(this, this._onClientEvent));
    },
    
    sendEvent: function(oEvent)
    {
        socket.send(oEvent);
    },
    
    notifyEventProcessed: function()
    {
        this._oSocket.send(
        {
            type: 'EVENT_PROCESSED'
            data: ''
        });
    },
    
    _onClientEvent: function(oEventData)
    {
        this._oDocument.onClientEvent(
        {
            oClient: this,
            oEventData: oEventData
        });
    }

});