define('preview-standalone', function(require)
{
    // Dependencies.
    var oHelpers = require('helpers/helpers-web-no-jquery'),
        Socket   = require('helpers/socket')
        oPreview = require('preview');
        
    var bIsSnapshot = /^\/v\//.test(window.location.pathname);
    
    var sSocketURL = null;
    if (bIsSnapshot)
    {
        // Set Ccontent.
        var sDocumentID = /^\/v\/([a-z0-9]+)\/preview\/?$/.exec(document.location.pathname)[1];
        $.get('/ajax/' + sDocumentID + '/', oHelpers.createCallback(this, function(oResponse)
        {
            oHelpers.assert(!oResponse.sError, oResponse.sError);
            oPreview.setSnapshotLines(oResponse.aLines);
            oHelpers.setTitleWithHistory(oResponse.sTitle);
        }));
    }
    else
    {
        sSocketURL = 'ws://' + window.document.location.host + '/';
    }
    
    // Init Socket.
    var oSocket  = new Socket(sSocketURL);
    
    // Init preview.
    oPreview.init(oSocket);
    
    // Handle title updates.
    oSocket.bind('message', null, function(oAction)
    {
        if (oAction.sType == 'setDocumentTitle')
        {
            oHelpers.setTitleWithHistory(oAction.oData.sTitle);
            return true;
        }
        return false; // Not handled.
    });
    
    // Open document.
    var sDocumentID = /^(\/v)?\/([a-z0-9]+)\/preview\/?$/.exec(document.location.pathname)[2];
    oSocket.send('openDocument',
    {
        sDocumentID: sDocumentID,
        bIsPreview: true
    });
});

// Start App.
require(['preview-standalone']);
