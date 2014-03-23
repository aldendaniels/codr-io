define('preview-standalone', function(require)
{
    // Dependencies.
    var oHelpers                   = require('helpers/helpers-web'),
        Socket                     = require('helpers/socket'),
        oHtmlPreviewFrameConnector = require('html-preview-frame-connector');

    // Init Socket.
    var bIsSnapshot = /^\/v\//.test(window.location.pathname);
    var sSocketURL = 'ws://' + window.document.location.host + '/';
    var oSocket  = new Socket(bIsSnapshot ? null : sSocketURL);

    // Init HTML Preview connector.
    oHtmlPreviewFrameConnector.init();
    oHtmlPreviewFrameConnector.sendMessage('play');
    
    // Set preview content for snpashot.
    if (bIsSnapshot)
    {
        var sDocumentID = /^\/v\/([a-z0-9]+)\/preview\/?$/.exec(document.location.pathname)[1];
        $.get('/ajax/' + sDocumentID + '/', oHelpers.createCallback(this, function(oResponse)
        {
            oHelpers.assert(!oResponse.sError, oResponse.sError);
            oHtmlPreviewFrameConnector.sendMessage('setSnapshotLines',
            {
                aLines: oResponse.aLines
            });
            oHelpers.setTitleWithHistory(oResponse.sTitle);
        }));
    }
    
    
    oSocket.bind('message', null, function(oAction)
    {
        // Handle title updates.
        if (oAction.sType == 'setDocumentTitle')
        {
            oHelpers.setTitleWithHistory(oAction.oData.sTitle);
            return true;
        }
        
        // Forward server messags to preview frame.
        oHtmlPreviewFrameConnector.sendMessage('serverMessage', oAction);
        
        // Treat all events as handled since we don't need all events
        // for standalone preview.
        return true;
    });
    
    // Open document.
    var sDocumentID = /^(\/v)?\/([a-z0-9]+)\/preview\/?$/.exec(document.location.pathname)[2];
    oSocket.send('openDocument',
    {
        sDocumentID: sDocumentID,
        bIsPreview: true
    });
});

// Start.
require(['preview-standalone']);