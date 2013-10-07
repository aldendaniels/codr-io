var oHelpers    = require('./public/javascripts/helpers/helpers');
var EditSession = require('./edit-session');
var Document    = require('./document');
var oDatabase   = require('./database');

module.exports = oHelpers.createClass(
{
    _oSocket: null,
    _oEditSession: null,
    _bCreatedDocument: false,
    _aPreInitActionQueue: null,
    _bInitialized: false,
    _bClosed: false,
    _sClientID: '',
    _oLastSelRange: null,
    _sUsername: '',
    _bLoggedIn: false,
    
    __init__: function(oSocket, sUsername)
    {
        // Init objects.
        this._aPreInitActionQueue = [];
        this._oSocket = oSocket;
        this._sUsername = sUsername;
        
        // Initial selection at start of document.
        this._oLastSelRange = {
            oStart: {iRow: 0, iCol: 0},
            oEnd:   {iRow: 0, iCol: 0}
        };
        
        // Attach socket events.
        oSocket.on('message', oHelpers.createCallback(this, this._onClientAction));
        oSocket.on('close', oHelpers.createCallback(this, function()
        {
            if (this._oEditSession)
                this._oEditSession.removeClient(this);
            else
                this._bClosed = true;
        }));        
    },
    
    setClientID: function(sClientID)
    {
        oHelpers.assert(!this._bLoggedIn, "You can\'t set the client ID for a client with a user account.");

        if (this._sUsername != "" && sClientID.indexOf(this._sUsername) === 0 && this._sClientID == "")
            this._bLoggedIn = true;

        this._sClientID = sClientID;
    },

    getClientID: function()
    {
        oHelpers.assert(this._sClientID, 'The username is not yet initialized.')
        return this._sClientID;
    },

    getUsername: function()
    {
        return this._sUsername;
    },

    getLoggedIn: function()
    {
        return this._bLoggedIn;
    },
    
    getSelectionRange: function()
    {
        return this._oLastSelRange;
    },
    
    setSelectionRange: function(oRange)
    {
        this._oLastSelRange = oRange;
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
            this._oSocket.send(oHelpers.toJSON(
            {
                sType: param1,
                oData: param2
            }));     
        }
        else
        {
            oHelpers.assert(typeof(param1) == 'object', 'Invalid parameter type');
            this._oSocket.send(oHelpers.toJSON(param1));
        }
    },

    abort: function(sMessage)
    {
        this.sendAction('error', {'sMessage': sMessage});
        this._oSocket.close();
    },

    _onClientAction: function(sJSONAction)
    {
        var oAction = oHelpers.fromJSON(sJSONAction);
        switch(oAction.sType)
        {
            case 'createDocument':
                this._bCreatedDocument = true;
                var oNewDocument = new Document(oAction.oData);
                oDatabase.createDocument(oNewDocument.toJSON(), this, function(sDocumentID)
                {
                    this._addToEditSession(sDocumentID);
                });
                break;
            
            case 'openDocument':
                this._addToEditSession(oAction.oData.sDocumentID);
                break;
            
            default:
                if (this._bInitialized )
                    this._oEditSession.onClientAction(this, oAction);
                else
                    this._aPreInitActionQueue.push(sJSONAction);
        }
    },
    
    _addToEditSession: function(sDocumentID)
    {
        // Validate.
        oHelpers.assert(!this._oEditSession, 'Client already connected.');
        if (this._bClosed)
            return;
                        
        // Get or add workspace.
        if (sDocumentID in g_oEditSessions)
        {
            this._oEditSession = g_oEditSessions[sDocumentID];
            this._oEditSession.addClient(this);
        }
        else
        {
            // TODO (AldenD 06-29-2013): On document creation we could tell the workspace
            // not to go to the database and directly give it the mode.
            this._oEditSession = new EditSession(sDocumentID, this);
        }
    }
});
