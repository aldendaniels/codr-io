var fs = require('fs');
var oHelpers = require('./helpers');
var assert = require('assert');

function validateFileID(sID)
{
    return sID.match('^[a-z0-9]+$')
}

function _generateNewDocumentID(oDatabase, fnOnResponse)
{
    // Create a random 7 character alpha numeric string.
    var sID = "";
    var sChars = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 7; i++ )
        sID += sChars.charAt(Math.floor(Math.random() * sChars.length));

    // Try recursively until we get a free one to avoid collisions.
    oDatabase.documentExists(sID, this, function(bExists)
    {
        if (!bExists)
            oHelpers.createCallback(oDatabase, fnOnResponse)(sID);
        else
            _generateNewDocumentID(oDatabase, fnOnResponse);
    });
}

var Document = oHelpers.createClass(
{
    _sID: '',
    _bReadOnly: false,
    _aChildrenIDs: null,
    _sParentID: '',
    _sLanguage: '',
    _sText: '',

    __init__: function(sID, oJSON)
    {
        this._sID = sID;
        this._bReadOnly = oJSON.bReadOnly || false;
        this._aChildrenIDs = oJSON.aChildrenIDs || [];
        this._sParentID = oJSON.sParentID || '';
        this._sLanguage = oJSON.sLanguage || '';
        this._sText = oJSON.sText || '';
    },

    serialize: function()
    {
        return {
            'bReadOnly': this._bReadOnly,
            'aChildrenIDs': this._aChildrenIDs,
            'sParentID': this._sParentID,
            'sLanguage': this._sLanguage,
            'sText': this._sText
        };
    },

    getID: function() { return this._sID; },
    getReadOnly: function() { return this._bReadOnly; },
    getChildrenIDs: function() { return this._aChildrenIDs; },
    getParentID: function() { return this._bReadOnly; },
    getLanguage: function() { return this._sLanguage; },
    getText: function() { return this._sText; },

    setID: function(sID)
    {
        assert(this._sID === '' && sID !== '');
        this._sID = sID;
    },

    setParentID: function(sParentID)
    {
        assert(this._sParentID === '');
        this._sParentID = sParentID;
    },

    setLanguage: function(sLanguage)
    {
        this._sLanguage = sLanguage;
    },

    setText: function(sText)
    {
        this._sText = sText;
    },

    fork: function(sNewID, bReadOnly)
    {
        if (bReadOnly)
            this._aChildrenIDs.push(sNewID);
        
        return new Document(sNewID, {
            'bReadOnly': bReadOnly,
            'aChildrenIDs': [],
            'sParentID': this._sID,
            'sLanguage': this._sLanguage,
            'sText': this._sText
        });
    }
});

var oFileDatabase = {

    createDocument: function(oScope, fnCallback)
    {
        fnCallback = oHelpers.createCallback(oScope, fnCallback);
        _generateNewDocumentID(this, function(sDocumentID)
        {
            var oDocument = new Document(sDocumentID, {});
            this.saveDocument(oDocument, this, function()
            {
                fnCallback(sDocumentID);
            });
        });
    },

    getDocument: function(sID, oScope, fnOnResponse)
    {
        fs.readFile(this._getPathFromID(sID), function(oErr, sDocument)
        {
            // TODO: handle error.
            var oDocument = new Document(sID, JSON.parse(sDocument));
            oHelpers.createCallback(oScope, fnOnResponse)(oDocument);
        });
    },

    saveDocument: function(oDocument, oScope, fnOnResponse)
    {
        var sJSONData = JSON.stringify(oDocument.serialize());
        fs.writeFile(this._getPathFromID(oDocument.getID()), sJSONData, oHelpers.createCallback(oScope, fnOnResponse));
    },
    
    documentExists: function(sID, oScope, fnOnResponse)
    {
        fs.exists(this._getPathFromID(sID), oHelpers.createCallback(oScope, fnOnResponse));
    },

    _getPathFromID: function(sID)
    {
        if (!validateFileID(sID))
            throw 'Invalid File ID: ' + sID;

        return './data/' + sID;
    }
};

var oMemoryDatabase =
{
    
    oData: {},
    
    createDocument: function(oScope, fnCallback)
    {
        fnCallback = oHelpers.createCallback(oScope, fnCallback);
        _generateNewDocumentID(this, function(sDocumentID)
        {
            var oDocument = new Document(sDocumentID, {});
            this.saveDocument(oDocument, this, function()
            {
                fnCallback(sDocumentID);
            });
        });
    },

    getDocument: function(sID, oScope, fnOnResponse)
    {
        if (!(sID in this.oData))
            throw new Error('File Not Found');
        oHelpers.createCallback(oScope, fnOnResponse)(this.oData[sID]);
    },

    saveDocument: function(oDocument, oScope, fnOnResponse)
    {
        // Do a full copy
        var sID = oDocument.getID();
        this.oData[sID] = new Document(sID, oDocument.serialize());
        oHelpers.createCallback(oScope, fnOnResponse)('');
    },

    // Calls fnOnResposne with (true)
    documentExists: function(sID, oScope, fnOnResponse)
    {
        oHelpers.createCallback(oScope, fnOnResponse)(sID in this.oData);
    }
};

module.exports = oMemoryDatabase;
