
// Include helper libraries.
var oOS                 = require('os');
var oPath               = require('path');
var oFS                  = require('fs');
var oUrl                = require('url');
var oExpress            = require('express');
var oWS                 = require('ws');
var oHTTP               = require('http');
var oLessMiddleware     = require('less-middleware');
var oUglifyJSMiddleware = require('uglify-js-middleware');
var oHelpers            = require('./helpers');
var oAceDocument        = require('./aceDocument').Document;
var oDatabase           = require('./database');

// Error handling.
// TODO: This is a horrible hack.
process.on('uncaughtException', function (err)
{
    console.error(err); // Keep node from exiting.
});

// Set/validation production environmental variables.
GLOBAL.g_oConfig = (function()
{
    // Get arguments.
    var oArgs = {};
    for (var i = 2; i < process.argv.length; i++)
    {
        var aParts = process.argv[i].split('=');
        oArgs[aParts[0].trim()] = aParts[1].trim();
    }
    
    // Populate Config object.
    var oConfig = {};
    oConfig.bIsProd   =  (oArgs.is_prod == '1');
    oConfig.bUglify =  (oArgs.uglify == '1' || oConfig.bIsProd);
    oConfig.bCompress =  (oArgs.compress == '1' || oConfig.bIsProd);
    oConfig.iPort     =  (oArgs.port      ? parseInt(oArgs.port) : (oConfig.bIsProd ? 80 : 8080));
    oConfig.sDataPath =  (oArgs.data_path ? oArgs.data_path : function()
                            {
                                if (oConfig.bIsProd)
                                    return '/home/ubuntu/data';
                                else
                                {
                                    var sDataPath = oPath.join(oOS.tmpDir(), 'data');
                                    if(!oFS.existsSync(sDataPath))
                                        oFS.mkdirSync(sDataPath);
                                    return sDataPath;
                                }
                            }());
    return oConfig;
}());

// Create empty codr_static directory.
var sCodrStaticOutputPath = oPath.join(oOS.tmpDir(), 'codr_static');
if (oFS.existsSync(sCodrStaticOutputPath))
{
    oHelpers.emptyDirSync(sCodrStaticOutputPath);
}
else
{
    oFS.mkdirSync(sCodrStaticOutputPath);
}

// Create express app.
var oApp = oExpress();
oApp.configure(function()
{
    oApp.set('port', g_oConfig.iPort);
    
    if (g_oConfig.bCompress)
    {
        oApp.use(oExpress.compress());
    }

    // Configure LESS middleware.
    oApp.use(oLessMiddleware(
    {
        src: __dirname + '/public',
        dest: sCodrStaticOutputPath
    }));
    
    // Configure UglifyJS middleware in Production.
    if (g_oConfig.bUglify)
    {
        oApp.use(oUglifyJSMiddleware(
        {
            src : __dirname + '/public',
            dest: sCodrStaticOutputPath,
            uglytext: false,
            mangle: true,
            squeeze: true
        }));
    }
    
    oApp.use(oExpress.static(sCodrStaticOutputPath));
    oApp.use(oExpress.static(oPath.join(__dirname, 'public')));

    /* Save static index.html */
    oApp.get('^/$',                     function(req, res) { res.sendfile('public/index.html'); });
    oApp.get('^/[a-z0-9]+/?$',          function(req, res) { res.sendfile('public/index.html'); });
    oApp.get('^/v/[a-z0-9]+/?$',        function(req, res) { res.sendfile('public/index.html'); });

    oApp.get('^/ajax/:DocumentID([a-z0-9]+)/?$', function(req, res) {

        function send(oDocument)
        {
            res.set('Content-Type', 'text/json');

            if (oDocument.bIsSnapshot)
            {
                res.send(JSON.stringify(
                {
                    'sText': oDocument.sText,
                    'sMode': oDocument.sMode,
                    'sTitle': oDocument.sTitle
                }));
            }
            else
            {
                var sError = 'The document has not been published. Please click <a href="/' + sDocumentID + '/">here</a> to see the original.';
                res.send(JSON.stringify({'sError': sError}));
            }

        }

        var sDocumentID = req.params['DocumentID'];
        if (sDocumentID in g_oWorkspaces)
        {
            send(g_oWorkspaces[sDocumentID].getDocument());
        }
        else
        {
            oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
            {
                send(parseDocument(sDocumentJSON));
            });
        }
    });
    
    /* Preview files as HTML. */
    oApp.get('/:DocumentID([a-z0-9]+)/preview/?$', function(req, res)
    {   
        // Set response headers for HTML preview.
        res.set('Content-Type', 'text/html');
        
        // Send document text.
        var oDocument = null;
        var sDocumentID = req.params['DocumentID'];
        if (sDocumentID in g_oWorkspaces)
        {
            oDocument = g_oWorkspaces[sDocumentID].getDocument();
            res.send(oDocument.sText);
        }
        else
        {
            oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
            {
                res.send(parseDocument(sDocument.JSON).sText);
            });
        }
    });
    
    /* Download file */
    oApp.get(':ignore(/v)?/:DocumentID([a-z0-9]+)/download/?$', function(req, res)
    {
        // Parse the url and get the file name
        var sFilename = oUrl.parse(req.url, true).query.filename;
        // Sanitize file name
        sFilename = sFilename.replace(/[^a-z0-9_\.\-]/gi, '');
        
        // Set response headers for file download.
        // Default to plain text in case there is no file name.
        res.set('Content-Type', 'text/plain');
        
        // Content-Type is automatically determined if there is a file name.
        res.attachment(sFilename);
        
        // Send document text.
        var oDocument = null;
        var sDocumentID = req.params['DocumentID'];
        console.log(sDocumentID);
        if (sDocumentID in g_oWorkspaces)
        {
            oDocument = g_oWorkspaces[sDocumentID].getDocument();
            res.send(oDocument.sText);
        }
        else
        {
            oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
            {
                oDocument = parseDocument(sDocumentJSON);
                res.send(oDocument.sText);
            });
        }
    });
});

// Instantiate server.
var oServer = oHTTP.createServer(oApp);
oServer.listen(oApp.get('port'), function()
{
    console.log("Express server listening on port " + oApp.get('port'));
});

// Instantiate websocket listener.
var oWsServer = new oWS.Server({server: oServer});
oWsServer.on('connection', function(oSocket)
{
    new Client(oSocket);
});

var g_oWorkspaces = {}; // DocumentID to Workspace instance.

var Client = oHelpers.createClass(
{
    _oSocket: null,
    _oWorkspace: null,
    _bCreatedDocument: false,
    _aPreInitActionQueue: null,
    _bInitialized: false,
    _bClosed: false,
    _sUsername: '',
    
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
    
    setUsername: function(sUsername)
    {
        this._sUsername = sUsername;
    },

    getUsername: function()
    {
        oHelpers.assert(this._sUsername, 'The username is not yet initialized.')
        return this._sUsername;
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
                oDatabase.createDocument(serializeDocument(oAction.oData), this, function(sDocumentID)
                {
                    this._addToWorkspace(sDocumentID);
                });
                break;
            
            case 'openDocument':
                this._addToWorkspace(oAction.oData.sDocumentID);
                break;
            
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
    _oRequestEditingInfo: null,
    _oCurrentEditingClient: null,
    _oLastSelAction: null,

    // PeoplePane
    _iGeneratedClientNames: 0,
    _aCurrentlyTyping: null,
    
    __init__: function(sDocumentID, oClient)
    {
        g_oWorkspaces[sDocumentID] = this;
        this._sDocumentID = sDocumentID;
        this._aClients = [];
        this._aCurrentlyTyping = [];
        
        // Add the intial client.
        this.addClient(oClient);
        
        // Open document.
        oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
        {
            // Save pointer to document.
            this._oDocument = parseDocument(sDocumentJSON);
            this._oAceDocument = new oAceDocument(this._oDocument.sText);
            this._oAceDocument.setNewLineMode('windows'); // TODO (Will 6/29/2013) test in other environments
            this._bDocumentLoaded = true;

            if (this._oDocument.bIsSnapshot)
            {
                var sErrorMessage = 'This document has been published and can not be edited.' +
                                    'To see the published version click <a href="/v/' + sDocumentID + '">here</a>.';
                for (var i = 0; i < this._aClients.length; i++)
                    this._aClients[i].abort(sErrorMessage);

                delete g_oWorkspaces[this._sDocumentID];

                return;
            }
            
            // Fire client "load" callbacks.
            for (var i in this._aClients)
            {
                this._setClientInitialValue(this._aClients[i]);
                this._aClients[i].onDocumentLoad();
            }
        });
    },

    addClient: function(oClient)
    {
        // Assign the client a username.
        oClient.setUsername(this._generateNewClientName());
        
        // Add the client: Automatically allow editing if you're the only client.
        this._aClients.push(oClient);
        if (this._aClients.length == 1)
        {
            this._oCurrentEditingClient = oClient;
        }
        
        // Initialize client.
        if (this._bDocumentLoaded)
        {
            this._setClientInitialValue(oClient);
            oClient.onDocumentLoad();
        }
                
        // Propagate to the other clients.
        if (this._bDocumentLoaded)
        {
            this._broadcastAction(oClient, {
                'sType': 'addUser',
                'oData': {
                    'sUsername': oClient.getUsername()
                }
            });            
        }
    },
    
    removeClient: function(oClient)
    {
        // Remove the client first thing, so we don't accidentally send him events.
        var iIndex = this._aClients.indexOf(oClient);
        this._aClients.splice(iIndex, 1);
        
        // Remove editing rights.
        if (oClient == this._oCurrentEditingClient)
        {
            this._removeEditRights();
        }

        
        // Close the document (if no editors left).
        if (this._aClients.length === 0)
        {
            this._save(oHelpers.createCallback(this, function()
            {
                if (this._aClients.length === 0)
                    delete g_oWorkspaces[this._sDocumentID];
            }));
        }
        
        // Update other clients (if document loaded).
        else if (this._bDocumentLoaded)
        {
            if (this._aCurrentlyTyping.indexOf(oClient) >= 0)
            {
                this._broadcastAction(oClient,
                {
                    'sType': 'endTyping',
                    'oData': {'sUsername': oClient.getUsername()}
                });
                this._aCurrentlyTyping.splice(this._aCurrentlyTyping.indexOf(oClient), 1);
            }
            
            this._broadcastAction(oClient,
            {
                'sType': 'removeUser',
                'oData': {'sUsername': oClient.getUsername()}
            });            
        }
    },

    _setClientInitialValue: function(oClient)
    {
        this._assertDocumentLoaded();

        // Send username.
        oClient.sendAction('connect',
        {
            'sUsername': oClient.getUsername()
        });
        
        // Send documentID on document creation.
        if (oClient.clientCreatedDocument())
        {
            oClient.sendAction('setDocumentID',
            {
                sDocumentID: this._sDocumentID
            });

            oClient.sendAction('setCurrentEditor',
            {
                sUsername: oClient.getUsername()
            });
        }
        
        // Otherwise, Send current document state.
        else
        {
            // Set editor text.
            oClient.sendAction('setDocumentData',
            {
                sText: this._oAceDocument.getValue()
            });
            
            // Grant edit perms.
            oClient.sendAction('setCurrentEditor',
            {
                sUsername: this._oCurrentEditingClient ? this._oCurrentEditingClient.getUsername() : null
            });

            // Set selection.
            if (this._oLastSelAction)
            {
                oClient.sendAction(this._oLastSelAction);
            }
    
            // Set mode (language.)
            oClient.sendAction('setMode',
            {
                sMode: this._oDocument.sMode
            });
    
            // Set title.
            oClient.sendAction('setDocumentTitle', 
            {
                sTitle: this._oDocument.sTitle
            });
            
            // Set currently viewing.
            for (var iClientIndex in this._aClients)
            {
                var oOtherClient = this._aClients[iClientIndex];
                if (oOtherClient != oClient)
                {
                    oClient.sendAction('addUser',
                    {
                        'sUsername': oOtherClient.getUsername()
                    });
                }
            }
            
            // Set currently typing users.
            for (var i = 0; i < this._aCurrentlyTyping.length; i++)
            {
                oClient.sendAction('startTyping',
                {
                    'sUsername': this._aCurrentlyTyping[i].getUsername()
                });
            }
            
            // Set chat history.
            for (var i = 0; i < this._oDocument.aChatHistory.length; i++)
            {
                oClient.sendAction('newChatMessage',
                {
                    'sUsername': this._oDocument.aChatHistory[i].sUsername,
                    'sMessage':  this._oDocument.aChatHistory[i].sMessage
                });
            }
        }

        for (var i = 0; i < this._oDocument.aSnapshots.length; i++)
        {
            var oSnapshot = this._oDocument.aSnapshots[i];
            oClient.sendAction('addSnapshot', oSnapshot);
        }
    },
    
    getDocument: function()
    {
        this._assertDocumentLoaded();
        this._updateDocumentText();
        return this._oDocument;
    },
  
    onClientAction: function(oClient, oAction)
    {
        oHelpers.assert(!this._oDocument.bIsSnapshot, 'Clients can\'t send actions to a published document.');

        this._assertDocumentLoaded();
		
		var bClientHasEditRights = this._oCurrentEditingClient == oClient;
		switch(oAction.sType)
        {
            case 'requestEditRights':
                if (this._oCurrentEditingClient)
                {
                    this._oCurrentEditingClient.sendAction('removeEditRights');
                    this._oRequestEditingInfo = {oClient: oClient, oSelection: oAction.oData};
                }
                else
                {
                    this._grantEditRights(oClient, oAction.oData);
                }
                break;
        
            case 'releaseEditRights':
                if (this._oRequestEditingInfo)
                {
                    this._grantEditRights( this._oRequestEditingInfo.oClient,
                                           this._oRequestEditingInfo.oSelection);
                    this._oRequestEditingInfo = null;
                }
                else
                {
                    this._removeEditRights();
                }
                break;
            
            case 'setMode':
                this._broadcastAction(oClient, oAction);
                this._oDocument.sMode = oAction.oData.sMode;
                break;
                
            case 'setSelection':
                if(bClientHasEditRights)
				{
					this._broadcastAction(oClient, oAction);
					this._oLastSelAction = oAction;
				}
                break;
            
            case 'setDocumentTitle':
				if(bClientHasEditRights)
				{
					this._broadcastAction(oClient, oAction);
					this._oDocument.sTitle = oAction.oData.sTitle;
				}
				break;
            
            case 'aceDelta':
                if(bClientHasEditRights)
                {
                    this._broadcastAction(oClient, oAction);
                    this._oAceDocument.applyDeltas([oAction.oData]);
                    this._setAutoSaveTimeout();
                }
                break;

            // People Pane
            case 'newChatMessage':
                var oNewAction = {
                    'sType': 'newChatMessage',
                    'oData': {
                        'sUsername': oClient.getUsername(),
                        'sMessage': oAction.oData.sMessage
                    }
                };
                this._broadcastAction(oClient, oNewAction);
                this._oDocument.aChatHistory.push(oNewAction.oData);
                this._setAutoSaveTimeout();
                break;

            case 'changeUsername':
                var sNewUsername = oAction.oData.sUsername;

                // Check for errors
                var sError = '';
                if (!sNewUsername)
                    sError = 'Username may not be blank.';

                for (var i = 0; i < this._aClients.length; i++)
                {
                    if (this._aClients[i] != oClient && this._aClients[i].getUsername() == sNewUsername)
                        sError = 'This username has already been taken.';
                }

                // Handle errors
                if (sError)
                {
                    oClient.sendAction('invalidUsernameChange',
                    {
                        'sReason': sError
                    });
                    break;
                }

                // Remove old user
                // TODO: This is a bit of a hack.
                this._broadcastAction(oClient, {
                    'sType': 'removeUser',
                    'oData': {'sUsername': oClient.getUsername()}
                });

                // Tell client his new name.
                oClient.sendAction('newUsernameAccepted', 
                {
                    'sUsername': sNewUsername
                });                
                oClient.setUsername(sNewUsername);

                // Change the name of the current editing client.
                if (this._oCurrentEditingClient == oClient)
                {
                    this._broadcastAction(null,
                    {
                        sType: 'setCurrentEditor',
                        oData: {'sUsername': sNewUsername}
                    })
                }

                // Add the new client to the list of viewing people.
                this._broadcastAction(oClient, {
                    'sType': 'addUser',
                    'oData': {'sUsername': oClient.getUsername()}
                });
                break;

            case 'startTyping':
                this._aCurrentlyTyping.push(oClient);
                this._broadcastAction(oClient,
                {
                    'sType': 'startTyping',
                    'oData': {'sUsername': oClient.getUsername()}
                });
                break;

            case 'endTyping':
                this._aCurrentlyTyping.splice(this._aCurrentlyTyping.indexOf(oClient), 1);
                this._broadcastAction(oClient,
                {
                    'sType': 'endTyping',
                    'oData': {'sUsername': oClient.getUsername()}
                });
                break;

            case 'snapshotDocument':

                this._assertDocumentLoaded();
                this._updateDocumentText();

                // Silly way to copy the document.... But it works.
                var oNewDocument = parseDocument(serializeDocument(this._oDocument));
                oNewDocument.bIsSnapshot = true;
                oNewDocument.aSnapshots = [];
                oNewDocument.oDateCreated = new Date();

                oDatabase.createDocument(serializeDocument(oNewDocument), this, function(sID)
                {
                    var oSnapshot = {
                        sID: sID,
                        oDateCreated: oNewDocument.oDateCreated
                    };
                    this._oDocument.aSnapshots.push(oSnapshot);
                    this._broadcastAction(null,
                    {
                        sType: 'addSnapshot', 
                        oData: oSnapshot
                    });
                });

                break;
            default:
                oHelpers.assert(false, 'Unrecognized event type: "' + oAction.sType + '"');
        }
    },

    _generateNewClientName: function()
    {
        this._iGeneratedClientNames++;
        return 'User ' + this._iGeneratedClientNames;
    },

    _broadcastAction: function(oSendingClient /*May be null*/, oAction)
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
    
    _grantEditRights: function(oClient, oSelection)
    {
        this._broadcastAction(null,
        {
            sType: 'setCurrentEditor',
            oData: {'sUsername': oClient.getUsername()}
        });
        this._oCurrentEditingClient = oClient;
        this._broadcastAction(oClient,
        {
            sType: 'setSelection',
            oData: oSelection
        });
    },
    
    _removeEditRights: function()
    {
        oHelpers.assert(this._oCurrentEditingClient, 'You can\'t remove a selection if there\'s no editing client.')
        this._broadcastAction(null,
        {
            sType: 'setCurrentEditor',
            oData: {'sUsername': null}
        });

        this._oCurrentEditingClient = null
        this._oLastSelAction = null;
    },

    _save: function()
    {
        if (this._oDocument.bIsSnapshot)
            return;
        
        this._assertDocumentLoaded();
        this._updateDocumentText();
        this._clearAutoSaveTimeout();

        oDatabase.saveDocument(this._sDocumentID, serializeDocument(this._oDocument), this, function(sError)
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
        this._oDocument.sText = this._oAceDocument.getValue();
    },
    
    _assertDocumentLoaded: function()
    {
        oHelpers.assert(this._bDocumentLoaded, 'Document not yet initialized.');
    }
});

function parseDocument(sJSON)
{
    return _normalizeDocument(JSON.parse(sJSON));
}

function _normalizeDocument(oDocument)
{
    var oBlankDocument = {
        bReadOnly: false,
        aSnapshots: [],
        sParentID: '',
        sMode: '',
        sText: '',
        sTitle: 'Untitled',
        aChatHistory: [],
        bIsSnapshot: false,
        oDateCreated: new Date()
    };

    for (var sKey in oDocument)
        oBlankDocument[sKey] = oDocument[sKey];

    oBlankDocument.oDateCreated = new Date(oBlankDocument.oDateCreated);
    return oBlankDocument;
}

function serializeDocument(oDocument)
{
    return JSON.stringify(_normalizeDocument(oDocument));
}
