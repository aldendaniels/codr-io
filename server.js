
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
    // TODO
});

// Forking entrypoint.
oApp.get(/^\/fork\/([a-z0-9]+)\/?$/, function(req, res)
{
    var sID = req.params[0];

    var redirect = function(sNewID)
    {
        res.redirect('/' + sNewID);
    }

    if (sID in g_oDocuments)
    {
        g_oDocuments[sID].fork(redirect);
    }
    else
    {
        // Get the parent document.
        oDatabase.getDocument(sID, this, function(oErr, oDocument)
        {
            // Fork the documents.
            forkDocument(oDocument, false, function(sNewID)
            {
                // We don't need to save the parent document because we don't
                // update the children array for editable forks.
                redirect(sNewID);
            });
        });
    }
})

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

var g_oDocuments = {}; // sID to Document instance.

var Document = oHelpers.createClass(
{
    // Data
    _oAceDocument: null,
    _oDocument: null,
    _sID: '',

    // State
    _aClients: null,
    _bInitialized: false,
    _aOnInitCallbacks: null,
    _iSaveTimeout: null,
    _oCurrentEditingClient: null,
    _oLastSelEvent: null,
    _fnOnReleaseEditRights: null,
    
    __init__: function(sID)
    {
        this._sID = sID;
        this._aOnInitCallbacks = [];
        this._aClients = [];
        
        oDatabase.documentExists(sID, this, function(bExists)
        {
            if (bExists)
                oDatabase.getDocument(sID, this, this._onInit);
            else
            {
                this._onInit('', new oDatabase.Document(this._sID, {}));
            }
        });
    },

    onLoad: function(oScope, fnCallback)
    {
        var fnCallback = oHelpers.createCallback(oScope, fnCallback);
        if (this._bInitialized)
            fnCallback(this);
        else
            this._aOnInitCallbacks.push(fnCallback);
    },

    registerClient: function(oClient)
    {
        this._assertInit();

        if (!this._oCurrentEditingClient)
            this._oCurrentEditingClient = oClient;

        // Create client.
        this._aClients.push(oClient);
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
        if (this._oDocument.getReadOnly())
            return;
        
        // TODO: This is special.
        if (oEvent.oEventData.sType == 'requestEditRights')
        {
            if (this._oDocument.getReadOnly())
                return;

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
            this.flushEventQueue();
            forkDocument(this._oDocument, true, oHelpers.createCallback(this, function(sNewID)
            {
                oEvent.oClient.sendEvent({sType: 'newSnapshotUrl', sUrl: '/' + sNewID});
                this._ensureSaveTimeout();
            }));
            return;
        }
        
        if (oEvent.oEventData.sType == 'languageChange')
        {
            this._oDocument.setLanguage(oEvent.oEventData.sLang);
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

    fork: function(fnOnResponse)
    {
        this.flushEventQueue();
        forkDocument(this._oDocument, false, fnOnResponse);
    },

    flushEventQueue: function()
    {
        this._oDocument.setText(this._oAceDocument.getValue());
    },
    
    getText: function()
    {
        this._assertInit();
        this.flushEventQueue();
        return this._oDocument.getText();
    },

    getID: function()
    {
        this._assertInit();
        return this._sID;
    },
    
    save: function(fnOnResponse)
    {
        this._assertInit();
                
        this._clearSaveTimeout();
        this.flushEventQueue();
        oDatabase.saveDocument(this._oDocument, this, fnOnResponse || function(){});
    },

    setClientInitialValue: function(oClient)
    {
        // Set as primary editor.
        var bIsEditing = oClient === this._oCurrentEditingClient;
            
        // Show selection to non-primary (readonly) editors.
        if (!bIsEditing && this._oLastSelEvent)
            oClient.sendEvent(this._oLastSelEvent.oEventData);

        // Send text.
        oClient.sendEvent(
        {
            'sType': 'setInitialValue',
            'sText': this.getText(),
            'bIsEditing': bIsEditing
        });

        // Set language.
        oClient.sendEvent(
        {
            'sType': 'languageChange',
            'sLang': this._oDocument.getLanguage()
        });
        
    },
    
    _setSaveTimeout: function()
    {
        this._assertInit();
        
        oHelpers.assert(this._iSaveTimeout === null);
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

    _ensureSaveTimeout: function()
    {
        if (this._iSaveTimeout === null)
            this._setSaveTimeout();
    },
    
    _onInit: function(oErr, oDocument)
    {
        this._oDocument = oDocument;
        this._oAceDocument = new oAceDocument(oDocument.getText());

        this._bInitialized = true;        
        for (var i = 0; i < this._aOnInitCallbacks.length; i++)
        {
            this._aOnInitCallbacks[i](this);
            
        }
        this._aOnInitCallbacks = [];
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
    _bCreatedDocument: false,
    
    __init__: function(oSocket)
    {
        this._oSocket = oSocket;
        
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
        if (oEventData.sType == 'createDocument')
        {
            oHelpers.assert(!this._oDocument, 'Client already connected.');
            oDatabase.generateNewDocumentID(this, function(sNewID)
            {
                this._bCreatedDocument = true;
                g_oDocuments[sNewID] = new Document(sNewID);
                g_oDocuments[sNewID].onLoad(this, this._onDocumentLoad);
            });
        }
        else if (oEventData.sType == 'openDocument')
        {
            oHelpers.assert(!this._oDocument, 'Client already connected.');

            // Open the document.
            if (!oEventData.sID in g_oDocuments)
                g_oDocuments[sNewID] = new Document(sNewID);

            g_oDocuments[sNewID].onLoad(this, this.onDocumentLoad);
            this._bCreatedDocument = false;
        }
        else
        {
            if (oEventData.sType == 'selectionChange')
                oEventData.sPeerID = this._sID;

            // Send event to document.
            this._oDocument.onClientEvent(
            {
                oClient: this,
                oEventData: oEventData
            });
        }
    },

    _onDocumentLoad: function(oDocument)
    {        
        oHelpers.assert(!this._oDocument, 'Client already connected to a document.');
        this._oDocument = oDocument;

        if (this._bCreatedDocument)
        {
            this.sendEvent({
                'sType': 'setDocumentID',
                'sID': this._oDocument.getID()
            });
        }
        else
        {
            this._oDocument.setClientInitialValue(this);
        }
    
    }
});


function forkDocument(oDocument, bReadOnly, fnOnResponse)
{
    oDatabase.generateNewDocumentID(this, function(sNewID)
    {
        // Create the fork.
        var oNewDocument = oDocument.fork(sNewID, bReadOnly);

        // Save the new document.
        oDatabase.saveDocument(oNewDocument, this, function()
        {
            fnOnResponse(sNewID);
        });
    });
}

require('./test').runTests();
