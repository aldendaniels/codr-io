var fs = require('fs');
var oHelpers = require('./helpers');

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

function _fork(oDatabase, sID, bReadOnly, oScope, fnOnResponse)
{
    // Get the original document.
    oDatabase.getDocument(sID, this, function(oErr, oDocument)
    {

        // Get a new ID.
        oDatabase.generateNewDocumentID(this, function(sNewID)
        {

            // Create/Save the new document.
            var oNewDocument = oHelpers.deepClone(oDocument);
            oNewDocument.bReadOnly = bReadOnly;
            oNewDocument.sParentID = sID;
            oDatabase.saveDocument(sNewID, oDocument, this, function()
            {
                // Link the document to it's parent.
                oDocument.aChildren = oDocument.aChildren || [];
                oDocument.aChildren.push(sNewID);
                oDatabase.saveDocument(sID, oDocument, this, function()
                {
                    // Notify the caller.
                    oHelpers.createCallback(oScope, fnOnResponse)(sNewID);
                });
            });
        });

    });
}

var oFileDatabase = {

    getDocument: function(sID, oScope, fnOnResponse)
    {
        fs.readFile(this._getPathFromID(sID), function(oErr, oDocument)
        {
            var oData = JSON.parse(oDocument.toString());
            oHelpers.createCallback(oScope, fnOnResponse)(oErr, oData);
        });
    },

    saveDocument: function(sID, oData, oScope, fnOnResponse)
    {
        var sJSONData = JSON.stringify(oData);
        fs.writeFile(this._getPathFromID(sID), sJSONData, oHelpers.createCallback(oScope, fnOnResponse));
    },
    
    documentExists: function(sID, oScope, fnOnResponse)
    {
        fs.exists(this._getPathFromID(sID), oHelpers.createCallback(oScope, fnOnResponse));
    },

    fork: function(sID, bReadOnly, oScope, fnOnResponse)
    {
        _fork(this, sID, bReadOnly, oScope, fnOnResponse);
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
    }
};

var oMemoryDatabase = {
    oData: {},

    // Takes a document ID, and calls fnOnResponse with (oErr, sDocument)
    getDocument: function(sID, oScope, fnOnResponse)
    {
        oHelpers.createCallback(oScope, fnOnResponse)('', this.oData[sID] || null);
    },

    // Takes a document ID, document text, and calls fnOnResponse with (oErr)
    saveDocument: function(sID, oData, oScope, fnOnResponse)
    {
        // Do a full copy
        this.oData[sID] = oHelpers.deepClone(oData);
        oHelpers.createCallback(oScope, fnOnResponse)('');
    },

    // Calls fnOnResposne with (true)
    documentExists: function(sID, oScope, fnOnResponse)
    {
        oHelpers.createCallback(oScope, fnOnResponse)(sID in this.oData);
    },

    fork: function(sID, bReadOnly, oScope, fnOnResponse)
    {
        _fork(this, sID, bReadOnly, oScope, fnOnResponse);
    },

    generateNewDocumentID: function(oScope, fnOnResponse)
    {
        _generateNewDocumentID(this, oScope, fnOnResponse);
    }
};

module.exports = oMemoryDatabase;
