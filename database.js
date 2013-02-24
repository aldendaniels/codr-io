var fs = require('fs');
var oHelpers = require('./helpers');

function validateFileID(sID)
{
    return sID.match('^[a-z0-9]+$')
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
        this.oData[sID] = oData;
        oHelpers.createCallback(oScope, fnOnResponse)('');
    },

    // Calls fnOnResposne with (true)
    documentExists: function(sID, oScope, fnOnResponse)
    {
        oHelpers.createCallback(oScope, fnOnResponse)(sID in this.oData);
    }
};

module.exports = oMemoryDatabase;
