var oFS      = require('fs');
var oPath    = require('path');

var oHelpers = require('./public/javascripts/helpers/helpers-core');
oHelpers.extendObj(oHelpers,
{
    emptyDirSync: function(sPath)
    {
        if (oFS.existsSync(sPath))
        {
            oFS.readdirSync(sPath).forEach(function(sFile, iFileIndex)
            {
                var sCurPath = oPath.join(sPath, sFile);
                if(oFS.statSync(sCurPath).isDirectory())
                {
                    oHelpers.emptyDirSync(sCurPath); // Recurse.
                    oFS.rmdirSync(sCurPath); // Delete dir.
                }
                else
                {
                    oFS.unlinkSync(sCurPath); // Delete file.
                }
            });
        }
    }
});

module.exports = oHelpers;