var fs = require('fs');
var oOS = require('os');
var oPath = require('path');
var oHelpers = require('./helpers');

var oFileDatabase =
{   
    createDocument: function(sData, oScope, fnOnResponse)
    {
        generateNewDocumentID(this, function(sID)
        {
            this.saveDocument(sID, sData, this, function()
            {
                oHelpers.createCallback(oScope, fnOnResponse)(sID);
            });
        });
    },

    getDocument: function(sID, oScope, fnOnResponse)
    {
        this.documentExists(sID, this, function(bExists)
        {
            oHelpers.assert(bExists, 'Document does not exist');  
            fs.readFile(oPath.join(g_oConfig.sDataPath, sID), function (sIgnoredErr, oFileData) //oFileData is a raw buffer
            {
                oHelpers.createCallback(oScope, fnOnResponse)(oFileData);
            });
        });
    },

    saveDocument: function(sID, sData, oScope, fnOnResponse)
    {
        fs.writeFile(oPath.join(g_oConfig.sDataPath, sID), sData, oHelpers.createCallback(oScope, fnOnResponse));
    },

    documentExists: function(sID, oScope, fnOnResponse)
    {
        fs.exists(oPath.join(g_oConfig.sDataPath, sID), oHelpers.createCallback(oScope, fnOnResponse))
    },

    saveUser: function(sUsername, sData, oScope, fnOnResponse)
    {
        fs.writeFile(oPath.join(g_oConfig.sUserDataPath, sUsername), sData, oHelpers.createCallback(oScope, fnOnResponse));
    },

    getUser: function(sUsername, oScope, fnOnResponse)
    {
        fs.readFile(oPath.join(g_oConfig.sUserDataPath, sUsername), function(sIgnoredErr, oFileData)
        {
            oHelpers.createCallback(oScope, fnOnResponse)(oFileData);
        });
    },

    userExists: function(sUsername, oScope, fnOnResponse)
    {
        fs.exists(oPath.join(g_oConfig.sUserDataPath, sUsername), oHelpers.createCallback(oScope, fnOnResponse));
    }
};

//////////////// HELPERS //////////////////

function validateFileID(sID)
{
    return sID.match('^[a-z0-9]+$');
}

function generateNewDocumentID(oDatabase, fnOnResponse)
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
            generateNewDocumentID(oDatabase, fnOnResponse);
    });
}

/////////////////////////////////////////////////

module.exports = oFileDatabase;
