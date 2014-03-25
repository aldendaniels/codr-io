define(function(require)
{
    var oLocalStorage = require('local-storage');
    var sRecentFilesKey = 'recentfiles';

    return {
        _sID: null,
        _sUrl: null,
        insertRecentFiles: function(jParent)
        {
            if (!oLocalStorage.supportsLocalStorage())
            {
                jParent.addClass('unsupported');
                return;
            }

            var aFiles = oLocalStorage.getKey(sRecentFilesKey) || [];
            if (aFiles.length === 0)
            {
                jParent.addClass('nofiles');
                return;
            }

            for (var i = 0; i < aFiles.length; i++)
            {
                var jLink = $(document.createElement('A')).attr('class', 'recent-file');
                jLink.text(aFiles[i].sTitle);
                jLink.attr('href', aFiles[i].sUrl);
                jParent.append(jLink);
            }
        },

        registerThisFile: function(sID, sUrl)
        {
            this._sID = sID;
            this._sUrl = sUrl;
        },

        saveThisTitle: function(sTitle)
        {
            var aFiles = oLocalStorage.getKey(sRecentFilesKey) || [];
            for (var i = 0; i < aFiles.length; i++)
            {
                if (aFiles[i].sID == this._sID)
                {
                    aFiles.splice(i, 1);
                    break;
                }
            }

            aFiles.splice(0, 0, {
                sID: this._sID,
                sTitle: sTitle,
                sUrl: this._sUrl
            });

            oLocalStorage.setKey(sRecentFilesKey, aFiles);
        }
    };
});

