define('preview-standalone', function(require)
{
    // Dependencies.
    var oHelpers = require('helpers/helpers-web-no-jquery'),
        Socket   = require('helpers/socket')
        oPreview = require('preview');
        
    // Init Socket.
    var sSocketURL = 'ws://' + window.document.location.host + '/';
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
