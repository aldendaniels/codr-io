
// Include Libraries.
var oExpress = require('express');
var oWS = require('ws');
var oHTTP = require('http');
var oHelpers = require('./helpers');
var EventQueue = require('./eventQueue').EventQueue;
var oAceDocument = require('./aceDocument').Document;
var oDatabase = require('./database');

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
    var sChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 6; i++ )
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
    _aLines: [],
    _oEventQueue: null,
    _aClients: [],
    _oAceDocument: null,
    _bInitialized: false,
    _sID: '',
    _aPreInitClients: null,
    _oLastSavedTime: null,
    _iSaveTimeout: null,
    
    __init__: function(sID)
    {
        this._sID = sID;
        this._oEventQueue = new EventQueue();
        this._aPreInitClients = [];
        
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
            this._aPreInitClients.push(oSocket);
        else
            this._aClients.push(new Client(oSocket, this));
    },
    
    removeClient: function(oClient)
    {
        this._assertInit();
        var iIndex = this._aClients.indexOf(oClient);
        this._aClients.splice(iIndex, 1);

        if (this._aClients.length === 0)
        {
            this.save(oHelpers.createCallback(this, function(){
                if (this._aClients.length === 0)
                {
                    if (this._iSaveTimeout)
                        clearTimeout(this._iSaveTimeout);
                    delete g_oDocuments[this._sID];
                }
            }));
        }
    },
    
    onClientEvent: function(oEvent)
    {
        this._assertInit();
        
        var oMungeredEvent = this._oEventQueue.push(oEvent);
        for (var i = 0; i < this._aClients.length; i++)
        {
            var oClient = this._aClients[i];
            if(oMungeredEvent.oClient != oClient)
                oClient.sendEvent(oMungeredEvent)
        }
        if (oMungeredEvent.oEventData.sType == 'aceDelta')
        {
            this._oAceDocument.applyDeltas([oMungeredEvent.oEventData.oDelta.data]);
            
            if (this._iSaveTimeout === null)
            {
                this._iSaveTimeout = setTimeout(oHelpers.createCallback(this, function(){
                    this.save(oHelpers.createCallback(this, function(oErr){
                        this._iSaveTimeout = null;
                    }));
                }), 30000);
            }
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
        
        function fnOnSave(oErr)
        {
            this._oLastSavedTime = new Date();
            fnOnResponse(oErr);
        }
        
        oDatabase.saveDocument(this._sID, this.getText(), this, fnOnResponse || function(){});
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
    
    __init__: function(oSocket, oDocument)
    {
        this._oSocket = oSocket;
        this._oDocument = oDocument;
        
        oSocket.on('message', oHelpers.createCallback(this, this._onClientEvent));
        oSocket.on('close', oHelpers.createCallback(this, function()
        {
            this._oDocument.removeClient(this);
        }));
        
        oSocket.send(JSON.stringify({
            'sType': 'setInitialValue',
            'sData': this._oDocument.getText()
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
