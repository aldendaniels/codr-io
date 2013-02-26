
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
    oDatabase.generateNewDocumentID(this, function(sNewID)
    {
        res.redirect('/' + sNewID);
    });
});

// Forking entrypoint.
oApp.get(/^\/fork\/([a-z0-9]+)\/?$/, function(req, res)
{
    var sID = req.params[0];

    forkDocument(sID, false, function(sNewID)
    {
        res.redirect('/' + sNewID);
    });
})

// Normal entrypoint.
oApp.get('/[a-z0-9]+/?$', function(req, res)
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
    var aMatch = oSocket.upgradeReq.url.match('^/([a-z0-9]+)/?$')
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
    _sLanguage: 'text',
    _bReadOnly: false,
    _aChildrenIDs: null,
    _sParentID: '',
    _fnOnReleaseEditRights: null,
    
    __init__: function(sID)
    {
        this._sID = sID;
        this._aPreInitClients = [];
        this._aClients = [];
        this._aChildrenIDs = [];
        
        oDatabase.documentExists(sID, this, function(bExists)
        {
            if (bExists)
                oDatabase.getDocument(sID, this, this._onInit);
            else
            {
                this._onInit('', this._getDocument(true));
            }
        });
    },

    registerClient: function(oSocket)
    {
        if (!this._bInitialized)
        {
            this._aPreInitClients.push(oSocket);
            return;
        }

        if (this._bReadOnly)
        {
            this._syncClient(new Client(oSocket, this), false);
            oSocket.close();
            return;
        }

        // Create client.
        var bIsEditing = !this._oCurrentEditingClient;
        var oNewClient = new Client(oSocket, this);
        this._aClients.push(oNewClient);
        
        // Set as primary editor.
        if (bIsEditing)
            this._oCurrentEditingClient = oNewClient;
            
        // Init client.
        this._syncClient(oNewClient, bIsEditing);

        // Show selection to non-primary (readonly) editors.
        if (!bIsEditing && this._oLastSelEvent)
            oNewClient.sendEvent(this._oLastSelEvent.oEventData);
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
        if (this._bReadOnly)
            return;
        
        // TODO: This is special.
        if (oEvent.oEventData.sType == 'requestEditRights')
        {
            if (this._oCurrentEditingClient)
            {
                this._oCurrentEditingClient.sendEvent({sType: 'removeEditRights'});                
            }
            else
            {
                oEvent.oClient.sendEvent({sType: 'editRightsGranted'});                
            }
            
            this._oCurrentEditingClient = oEvent.oClient;
            return;
        }
        
        // TODO: This is special.
        if (oEvent.oEventData.sType == 'releaseEditRights')
        {
            if (this._fnOnReleaseEditRights)
                this._fnOnReleaseEditRights();
            
            this._oCurrentEditingClient.sendEvent({sType: 'editRightsGranted'});
            return;
        }

        if (oEvent.oEventData.sType == 'generateSnapshot')
        {
            forkDocument(this._sID, true, function(sNewID)
            {
                oEvent.oClient.sendEvent({sType: 'newSnapshotUrl', sUrl: '/' + sNewID});
            });
            return;
        }
        
        if (oEvent.oEventData.sType == 'languageChange')
        {
            this._sLanguage = oEvent.oEventData.sLang;
        }

        // Send events to all other clients.
        for (var i = 0; i < this._aClients.length; i++)
        {
            var oClient = this._aClients[i];
            if(oEvent.oClient != oClient)
                oClient.sendEvent(oEvent.oEventData)
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
        oDatabase.saveDocument(this._sID, this._getDocument(), this, fnOnResponse || function(){});
    },

    reload: function()
    {
        if (this._oCurrentEditingClient)
        {
            this._oCurrentEditingClient.sendEvent({sType: 'removeEditRights'});                

            this._fnOnReleaseEditRights = oHelpers.createCallback(this, this._reload);
        }
        else
            this._reload();
    },

    _reload: function()
    {
        oDatabase.getDocument(this._sID, this, function(oErr, oDocument)
        {
            this._loadFromDocument(oDocument);
            for (var i = 0; i < this._aClients.length; i++)
                this._syncClient(this._aClients[i]);
        });
    },

    _syncClient: function(oClient, bIsEditing)
    {
        // Set language.
        oClient.sendEvent(
        {
            'sType': 'languageChange',
            'sLang': this._sLanguage
        });
        
        // Send text.
        oClient.sendEvent(
        {
            'sType': 'setInitialValue',
            'sData': this.getText(),
            'bIsEditing': bIsEditing,
            'bReadOnly': this._bReadOnly
        });
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
    
    _onInit: function(oErr, oDocument)
    {
        this._loadFromDocument(oDocument);

        // Register client.
        this._bInitialized = true;        
        var oSocket = this._aPreInitClients.pop();
        while (oSocket)
        {
            this.registerClient(oSocket);
            oSocket = this._aPreInitClients.pop();
        }
    },

    _getDocument: function(bEmpty)
    {
        if (bEmpty)
        {
            return {
                'sText': '',
                'sLanguage': this._sLanguage,
                'bReadOnly': false,
                'aChildren': [],
                'sParentID': ''
            }
        }
        return {
            'sText': this.getText(),
            'sLanguage': this._sLanguage,
            'bReadOnly': this._bReadOnly,
            'aChildren': this._aChildrenIDs,
            'sParentID': this._sParentID
        }
    },

    _loadFromDocument: function(oDocument)
    {
        // Load document data.
        this._oAceDocument = new oAceDocument(oDocument.sText);
        this._sLanguage = oDocument.sLanguage;
        this._bReadOnly = oDocument.bReadOnly;
        this._aChildrenIDs = oDocument.aChildren;
        this._sParentID = oDocument.sParentID;
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
    },
    
    sendEvent: function(oEvent)
    {
        this._oSocket.send(JSON.stringify(oEvent));
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
    }
});

function forkDocument(sID, bReadOnly, fnOnResponse)
{
    function doFork()
    {
        oDatabase.fork(sID, bReadOnly, this, function(sNewID)
        {
            // Reload the parent.
            if (sID in g_oDocuments)
                g_oDocuments[sID].reload();

            fnOnResponse(sNewID);
        });
    }

    var bDocInMemory = false;
    for (sKey in g_oDocuments)
    {
        if (sKey == sID)
        {
            g_oDocuments[sKey].save(doFork);
            bDocInMemory = true;
        }
    }

    if (!bDocInMemory)
        doFork();
}

require('./test').runTests();
