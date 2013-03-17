
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

    if (sID in g_oWorkspaces)
    {
        g_oWorkspaces[sID].fork(redirect);
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

var g_oWorkspaces = {}; // sID to Document instance.

var Client = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,
    _bCreatedDocument: false,
    
    __init__: function(oSocket)
    {
        this._oSocket = oSocket;
        oSocket.on('message', oHelpers.createCallback(this, this._onClientEvent));
        oSocket.on('close', oHelpers.createCallback(this, function()
        {
            this._oWorkspace.removeClient(this);
        }));        
    },
    
    onDocumentLoad: function()
    {
        if (this._bCreatedDocument)
        {
            this.sendEvent(
            {
                'sType': 'setDocumentID',
                'sID': this._oWorkspace.getDocumentID()
            });
        }
        else
            this._oWorkspace.setClientInitialValue(this);
    },
    
    sendEvent: function(oEvent)
    {
        this._oSocket.send(JSON.stringify(oEvent));
    },

    _onClientEvent: function(sJSONEvent)
    {
        var oEvent = JSON.parse(sJSONEvent);
        switch(oEvent.sType)
        {
            case 'createDocument':
                this._bCreatedDocument = true;
                oDatabase.createDocument(this, function(sDocumentID)
                {
                    this._addToWorkspace(sDocumentID);
                });
                break;
            
            case 'openDocument':
                this._addToWorkspace(oEvent.sID);
                break;
            
            default:
                this._oWorkspace.onClientEvent(this, oEvent);
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
    
    // Editing
    _aClients: null,
    _iSaveTimeout: null,
    _oCurrentEditingClient: null,
    _oLastSelEvent: null,
    _fnOnReleaseEditRights: null,
    
    __init__: function(sDocumentID)
    {
        g_oWorkspaces[sDocumentID] = this;
        this._sDocumentID = sDocumentID;
        this._aClients = [];
        
        oDatabase.getDocument(sDocumentID, this, function(oDocument)
        {
            // Save pointer to document.
            this._oDocument = oDocument;
            this._oAceDocument = new oAceDocument(oDocument.getText());
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
            this.save(oHelpers.createCallback(this, function()
            {
                if (this._aClients.length === 0)
                    delete g_oWorkspaces[this._sDocumentID];
            }));
        }
    },
        
    onClientEvent: function(oClient, oEvent)
    {
        this._assertDocumentLoaded();
        if (this._oDocument.getReadOnly())
            return;
        
        switch(oEvent.sType)
        {
            case 'requestEditRights':
                this._oCurrentEditingClient = oClient;                
                if (this._oCurrentEditingClient)
                    this._oCurrentEditingClient.sendEvent({sType: 'removeEditRights'});                
                else
                    oClient.sendEvent({sType: 'editRightsGranted'});                                
                break;
        
            case 'releaseEditRights':
                if (this._fnOnReleaseEditRights)
                    this._fnOnReleaseEditRights();
                this._oCurrentEditingClient.sendEvent({sType: 'editRightsGranted'});
                break;
            
            case 'generateSnapshot':
                this.flushEventQueue();
                forkDocument(this._oDocument, true, oHelpers.createCallback(this, function(sNewID)
                {
                    oClient.sendEvent({sType: 'newSnapshotUrl', sUrl: '/' + sNewID});
                    this._ensureSaveTimeout();
                }));
                break;
            
            case 'languageChange':
                this._oDocument.setLanguage(oEvent.oData.sLang);
                break;
                
            case 'selectionChange':
                this._broadcastEvent(oClient, oEvent);
                this._oLastSelEvent = oEvent;
                break;
            
            case 'aceDelta':
                this._broadcastEvent(oClient, oEvent);
                this._oAceDocument.applyDeltas([oEvent.oData]);
                if (this._iSaveTimeout === null)
                    this._setSaveTimeout();
                break;
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
        this._assertDocumentLoaded();
        this.flushEventQueue();
        return this._oDocument.getText();
    },

    getDocumentID: function()
    {
        this._assertDocumentLoaded();
        return this._sDocumentID;
    },
    
    save: function(fnOnResponse)
    {
        this._assertDocumentLoaded();
                
        this._clearSaveTimeout();
        this.flushEventQueue();
        oDatabase.saveDocument(this._oDocument, this, fnOnResponse || function(){});
    },

    setClientInitialValue: function(oClient)
    {
        // Set as primary editor.
        var bIsEditing = oClient === this._oCurrentEditingClient;
        
        // Set language.
        oClient.sendEvent(
        {
            'sType': 'languageChange',
            'sLang': this._oDocument.getLanguage()
        });
        
        // Send text.
        oClient.sendEvent(
        {
            'sType': 'setInitialValue',
            'sText': this.getText(),
            'bIsEditing': bIsEditing
        });
                    
        // Show selection to non-primary (readonly) editors.
        if (!bIsEditing && this._oLastSelEvent)
            oClient.sendEvent(this._oLastSelEvent.oEventData);
    },
    
    _broadcastEvent: function(oSendingClient, oEvent)
    {
        // Send events to all other clients.
        for (var i = 0; i < this._aClients.length; i++)
        {
            var oClient = this._aClients[i];
            if(oClient != oSendingClient)
                oClient.sendEvent(oEvent)
        }
    },
    
    _setSaveTimeout: function()
    {
        this._assertDocumentLoaded();
        
        oHelpers.assert(this._iSaveTimeout === null);
        this._iSaveTimeout = setTimeout(oHelpers.createCallback(this, function()
        {
            this.save(oHelpers.createCallback(this, this._clearSaveTimeout));
        }), 30000);
    },
    
    _clearSaveTimeout: function()
    {
        this._assertDocumentLoaded();
        
        if (this._iSaveTimeout)
            clearTimeout(this._iSaveTimeout);
    },

    _ensureSaveTimeout: function()
    {
        if (this._iSaveTimeout === null)
            this._setSaveTimeout();
    },
    
    _assertDocumentLoaded: function()
    {
        oHelpers.assert(this._bDocumentLoaded, 'Document not yet initialized.');
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
