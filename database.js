var fs = require('fs');
var oHelpers = require('./helpers');
var assert = require('assert');

function validateFileID(sID)
{
    return sID.match('^[a-z0-9]+$')
}

function _generateNewDocumentID(oDatabase, oScope, fnOnResponse)
{
    var sID = "";
    var sChars = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 7; i++ )
        sID += sChars.charAt(Math.floor(Math.random() * sChars.length));

    oDatabase.documentExists(sID, this, function(bExists)
    {
        if (!bExists)
            oHelpers.createCallback(oScope, fnOnResponse)(sID);
        else
            generateIDAndRedirect(oDatabase, oScope, fnOnResponse);
    });
}

var Document = oHelpers.createClass({
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

    getDocument: function(sID, oScope, fnOnResponse)
    {
        fs.readFile(this._getPathFromID(sID), function(oErr, sDocument)
        {
            var oDocument = new Document(sID, JSON.parse(sDocument));
            oHelpers.createCallback(oScope, fnOnResponse)(oErr, oDocument);
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

    generateNewDocumentID: function(oScope, fnOnResponse)
    {
        _generateNewDocumentID(this, oScope, fnOnResponse);
    },
    
    _getPathFromID: function(sID)
    {
        if (!validateFileID(sID))
            throw 'Invalid File ID: ' + sID;

        return './data/' + sID;
    },
    Document: Document
};

var oMemoryDatabase = {
    oData: {},

    getDocument: function(sID, oScope, fnOnResponse)
    {
        if (!(sID in this.oData))
            throw 'File Not Found'
        oHelpers.createCallback(oScope, fnOnResponse)('', this.oData[sID]);
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
    },

    generateNewDocumentID: function(oScope, fnOnResponse)
    {
        _generateNewDocumentID(this, oScope, fnOnResponse);
    },
    Document: Document
};

module.exports = oMemoryDatabase;
