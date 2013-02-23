var fs = require('fs');
var oHelpers = require('./helpers');

function validateFileID(sID)
{
    return sID.match('^[a-zA-Z0-9]+$')
}

var oDatabase = {
    // Takes a document ID, and calls fnOnResponse with (oErr, sDocument)
    getDocument: function(sID, oScope, fnOnResponse)
    {
        fs.readFile(this._getPathFromID(sID), function(oErr, oDocument)
        {
            oHelpers.createCallback(oScope, fnOnResponse)(oErr, oDocument.toString());
        });
    },

    // Takes a document ID, document text, and calls fnOnResponse with (oErr)
    saveDocument: function(sID, sText, oScope, fnOnResponse)
    {
        fs.writeFile(this._getPathFromID(sID), sText, oHelpers.createCallback(oScope, fnOnResponse));
    },

        
    
    // Calls fnOnResposne with (true)
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

module.exports = oDatabase;
