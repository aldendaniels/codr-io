/*globals g_oEditSessions*/

var oHelpers    = require('./helpers-node');
var EditSession = require('./edit-session');
var Document    = require('./document');
var oDatabase   = require('./database');

var a_PREVIEW_ACTION_TYPES = ['setDocumentData', 'docChange', 'setDocumentTitle', 'error', 'setAutoRefreshPreview', 'refreshPreview'];

module.exports = oHelpers.createClass(
{
    _oSocket: null,
    _oEditSession: null,
    _bCreatedDocument: false,
    _bIsPreview: false,
    _aPreInitActionQueue: null,
    _bInitialized: false,
    _bClosed: false,
    _sClientID: '',
    _oLastSelRange: null,
    
    __init__: function(oSocket)
    {
        // Init objects.
        this._aPreInitActionQueue = [];
        this._oSocket = oSocket;
        
        // Initial selection at start of document.
        this._oLastSelRange = (
        {
            oStart: {iRow: 0, iCol: 0},
            oEnd:   {iRow: 0, iCol: 0}
        });
        
        // Attach socket events.
        oSocket.on('message', oHelpers.createCallback(this, this._onClientAction));
        oSocket.on('close', oHelpers.createCallback(this, this._onSocketClose));
    },
    
    setClientID: function(sClientID)
    {
        this._sClientID = sClientID;
    },

    getClientID: function()
    {
        oHelpers.assert(this._sClientID, 'The client ID is not yet initialized.');
        return this._sClientID;
    },

    getSelectionRange: function()
    {
        return this._oLastSelRange;
    },
    
    setSelectionRange: function(oRange)
    {
        this._oLastSelRange = oRange;
    },
    
    createdDocument: function()
    {
        return this._bCreatedDocument;
    },
    
    isPreview: function()
    {
        return this._bIsPreview;
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
        var oAction;
        if (typeof(param1) === 'string')
        {
            oAction = (
            {
                sType: param1,
                oData: param2
            });
        }
        else
        {
            oHelpers.assert(typeof(param1) === 'object', 'Invalid parameter type');
            oAction = param1;
        }
        
        // Only send relevent events to a preview client.
        if (!this._bIsPreview || oHelpers.inArray(oAction.sType, a_PREVIEW_ACTION_TYPES))
            this._oSocket.send(oHelpers.toJSON(oAction), oHelpers.createCallback(this, this._onSocketError));                
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
                this._bIsPreview = oAction.oData.bIsPreview || false;
                this._addToEditSession(oAction.oData.sDocumentID);
                break;
                
            case 'close':
                this._closeSocket();
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
    },
    
    _closeSocket: function()
    {
        // the .close() socket method does not trigger the "close" event.
        // as a result, we have to manually all the close handler.
        this._oSocket.close(); 
        this._onSocketClose();
    },
    
    _onSocketClose: function()
    {
        // WARNING: In IE, a closed socket sometimes gets resurrected by magic
        // when the user navigates away from the page via the back button and then
        // returns with the forward button. To handle this, we need to blank out
        // the edit session data so the client gets correctly added back to the
        // edit session.
        if (this._oEditSession)
        {
            this._oEditSession.removeClient(this);
            this._oEditSession = null;
        }
        this._bClosed = true;
    },
    
    _onSocketError: function(oError)
    {
        if (oError)
        {
            console.log('Socket Error: ', oError.message);
            this._closeSocket();                    
        }
    }
});
