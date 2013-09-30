var oHelpers     = require('./public/javascripts/helpers/helpers');
var oOT          = require('./public/javascripts/OT');
var Client       = require('./client');
var Document     = require('./document');
var oDatabase    = require('./database');

module.exports = oHelpers.createClass(
{
    // Data
    _oDocument: null,
    _sDocumentID: '',

    // Loading state
    _bDocumentLoaded: false,
    
    // Audo save
    _iAutoSaveTimeoutID: null,
    _iAutoSaveTimeoutLength: 30, /* auto save every 30 seconds */
    
    _aClients: null,

    // PeoplePane
    _iGeneratedClientNames: 0,
    _aCurrentlyTyping: null,

    // OT
    _aPastDeltas: null, // Uses for OT transformation.
    _iServerState: 0,
    
    __init__: function(sDocumentID, oClient)
    {
        // Save to global map.
        g_oEditSessions[sDocumentID] = this;
        
        // Initialize members.
        this._sDocumentID = sDocumentID;
        this._aClients = [];
        this._aCurrentlyTyping = [];
        this._aPastDeltas = [];
        
        // Add the intial client.
        this.addClient(oClient);
        
        // Open document.
        oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
        {
            // Save pointer to document.
            this._oDocument = new Document(sDocumentJSON);
            this._bDocumentLoaded = true;

            if (this._oDocument.get('bIsSnapshot'))
            {
                var sErrorMessage = 'This document has been published and can not be edited.' +
                                    'To see the published version click <a href="/v/' + sDocumentID + '">here</a>.';
                for (var i = 0; i < this._aClients.length; i++)
                    this._aClients[i].abort(sErrorMessage);

                delete g_oEditSessions[this._sDocumentID];

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
        // Assign the client an ID (username).
        oClient.setClientID(this._generateNewClientID(oClient.getUsername()));
        
        // Add the client: Automatically allow editing if you're the only client.
        this._aClients.push(oClient);
        
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
                    'sClientID': oClient.getClientID()
                }
            });            
        }
    },
    
    removeClient: function(oClient)
    {
        // Remove the client first thing, so we don't accidentally send him events.
        var iIndex = this._aClients.indexOf(oClient);
        this._aClients.splice(iIndex, 1);
        
        // Close the document (if no editors left).
        if (this._aClients.length === 0)
        {
            this._save(oHelpers.createCallback(this, function()
            {
                if (this._aClients.length === 0)
                    delete g_oEditSessions[this._sDocumentID];
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
                    'oData': {'sClientID': oClient.getClientID()}
                });
                this._aCurrentlyTyping.splice(this._aCurrentlyTyping.indexOf(oClient), 1);
            }
            
            this._broadcastAction(oClient,
            {
                'sType': 'removeUser',
                'oData': {'sClientID': oClient.getClientID()}
            });            
        }
    },

    _setClientInitialValue: function(oClient)
    {
        this._assertDocumentLoaded();

        // Send ID (Username).
        oClient.sendAction('connect',
        {
            'sClientID': oClient.getClientID(),
            'bCanChangeID': oClient.getCanChangeClientID()
        });
        
        // Send documentID on document creation.
        if (oClient.clientCreatedDocument())
        {
            oClient.sendAction('setDocumentID',
            {
                sDocumentID: this._sDocumentID
            });
        }
        
        // Otherwise, Send current document state.
        else
        {
            // Set document text.
            oClient.sendAction('setDocumentData',
            {
                aLines: this._oDocument.get('aLines'),
                iServerState: this._iServerState
            });

            // Set mode (language.)
            oClient.sendAction('setMode',
            {
                sMode: this._oDocument.get('sMode')
            });
    
            // Set title.
            oClient.sendAction('setDocumentTitle', 
            {
                sTitle: this._oDocument.get('sTitle')
            });

            // Set currently viewing.
            for (var iClientIndex in this._aClients)
            {
                var oOtherClient = this._aClients[iClientIndex];
                if (oOtherClient != oClient)
                {
                    oClient.sendAction('addUser',
                    {
                        'sClientID': oOtherClient.getClientID()
                    });
                }
            }            
            
            // Set selection.
            for (var i in this._aClients)
            {
                var oOtherClient = this._aClients[i];
                if (oClient != oOtherClient)
                {
                    var oLastSelAction = oOtherClient.getLastSelAction();
                    if (oLastSelAction)
                        oClient.sendAction(oLastSelAction);
                }
            }
                        
            // Set currently typing users.
            for (var i = 0; i < this._aCurrentlyTyping.length; i++)
            {
                oClient.sendAction('startTyping',
                {
                    'sClientID': this._aCurrentlyTyping[i].getClientID()
                });
            }
            
            // Set chat history.
            for (var i = 0; i < this._oDocument.get('aChatHistory').length; i++)
            {
                oClient.sendAction('newChatMessage',
                {
                    'sClientID': this._oDocument.get('aChatHistory')[i].sClientID,
                    'sMessage':  this._oDocument.get('aChatHistory')[i].sMessage
                });
            }
        }

        for (var i = 0; i < this._oDocument.get('aSnapshots').length; i++)
        {
            var oSnapshot = this._oDocument.get('aSnapshots')[i];
            oClient.sendAction('addSnapshot', oSnapshot);
        }
    },
    
    getDocument: function()
    {
        this._assertDocumentLoaded();
        return this._oDocument;
    },
  
    onClientAction: function(oClient, oAction)
    {
        oHelpers.assert(!this._oDocument.get('bIsSnapshot'), 'Clients can\'t send actions to a published document.');

        this._assertDocumentLoaded();
		
		switch(oAction.sType)
        {            
            case 'setMode':
                this._broadcastAction(oClient, oAction);
                this._oDocument.set('sMode', oAction.oData.sMode);
                break;
                
            case 'setRemoteSelection':
                this._broadcastAction(oClient, oAction);
                break;
            
            case 'setDocumentTitle':
                this._broadcastAction(oClient, oAction);
                this._oDocument.set('sTitle', oAction.oData.sTitle);
				break;
            
            case 'docChange':
                
                // Transform delta range.
                var oDelta = oAction.oData.oDelta;
                var iCatchUp = this._iServerState - oAction.oData.iState;
                for (var i = this._aPastDeltas.length - iCatchUp; i < this._aPastDeltas.length; i++)
                {
                    if (this._aPastDeltas[i].oClient != oClient)
                        oDelta.oRange = oOT.transformRange(this._aPastDeltas[i].oDelta, oDelta.oRange);
                }
                
                // Save to transOps.
                this._aPastDeltas.push(
                {
                    oClient: oClient,
                    oDelta: oDelta
                });
                this._iServerState++;

                // Brodcast.
                this._broadcastAction(oClient, {
                    sType: 'docChange',
                    oData: {
                        oDelta: oDelta,
                        iServerState: this._iServerState
                    }
                });

                // Notify send of receipt.
                oClient.sendAction('eventReciept',
                {
                    iServerState: this._iServerState
                });
                
                // Apply locally.
                this._oDocument.applyDelta(oDelta);
                this._setAutoSaveTimeout();
                break;
            
            // People Pane
            case 'newChatMessage':
                var oNewAction = {
                    'sType': 'newChatMessage',
                    'oData': {
                        'sClientID': oClient.getClientID(),
                        'sMessage': oAction.oData.sMessage
                    }
                };
                this._broadcastAction(oClient, oNewAction);
                this._oDocument.get('aChatHistory').push(oNewAction.oData);
                this._setAutoSaveTimeout();
                break;

            case 'changeClientID':
                var sNewClientID = oAction.oData.sClientID;

                // Check for errors
                var sError = '';
                if (!sNewClientID)
                    sError = 'ClientID may not be blank.';

                for (var i = 0; i < this._aClients.length; i++)
                {
                    if (this._aClients[i] != oClient && this._aClients[i].getClientID() == sNewClientID)
                        sError = 'This username has already been taken.';
                }

                if (!oClient.getCanChangeClientID())
                    sError = "You can not change your username if you have an account.";

                // Handle errors
                if (sError)
                {
                    oClient.sendAction('invalidClientIDChange',
                    {
                        'sReason': sError
                    });
                    break;
                }

                // Remove old user
                // TODO: This is a bit of a hack.
                this._broadcastAction(oClient, {
                    'sType': 'removeUser',
                    'oData': {'sClientID': oClient.getClientID()}
                });

                // Tell client his new name.
                oClient.sendAction('newClientIDAccepted', 
                {
                    'sClientID': sNewClientID
                });                
                oClient.setClientID(sNewClientID);

                // Add the new client to the list of viewing people.
                this._broadcastAction(oClient,
                {
                    'sType': 'addUser',
                    'oData': {'sClientID': oClient.getClientID()}
                });
                break;

            case 'startTyping':
                this._aCurrentlyTyping.push(oClient);
                this._broadcastAction(oClient,
                {
                    'sType': 'startTyping',
                    'oData': {'sClientID': oClient.getClientID()}
                });
                break;

            case 'endTyping':
                this._aCurrentlyTyping.splice(this._aCurrentlyTyping.indexOf(oClient), 1);
                this._broadcastAction(oClient,
                {
                    'sType': 'endTyping',
                    'oData': {'sClientID': oClient.getClientID()}
                });
                break;
            
            case 'snapshotDocument':
                
                this._assertDocumentLoaded();
                
                // Copy document.
                var oNewDocument = this._oDocument.clone(true);
                
                // Save document copy.
                oDatabase.createDocument(oNewDocument.toJSON(), this, function(sID)
                {
                    var oSnapshot = {
                        sID: sID,
                        oDateCreated: oNewDocument.get('oDateCreated')
                    };
                    this._oDocument.get('aSnapshots').push(oSnapshot);
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

    _generateNewClientID: function(sOptionalPrefix)
    {
        if (sOptionalPrefix)
        {
            var iNumFound = 0;
            for (var i = 0; i < this._aClients.length; i++)
            {
                if (this._aClients[i].getClientID().indexOf(sOptionalPrefix) === 0);
                    iNumFound++;
            }
            if (iNumFound > 0)
                return sOptionalPrefix + ' (' + iNumFound + ')';
            else
                return sOptionalPrefix;

        }

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
    
    _save: function()
    {
        if (this._oDocument.get('bIsSnapshot'))
            return;
        
        this._assertDocumentLoaded();
        this._clearAutoSaveTimeout();

        oDatabase.saveDocument(this._sDocumentID, this._oDocument.toJSON(), this, function(sError)
        {
            // TODO: Handle save errors.
            oHelpers.assert(!sError, 'Save Error: ' + sError);
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
    
    _assertDocumentLoaded: function()
    {
        oHelpers.assert(this._bDocumentLoaded, 'Document not yet initialized.');
    }
});