define('preview', function(require)
{
    // Dependencies.
    var oHelpers              = require('helpers/helpers-web-no-jquery'),
        Socket                = require('helpers/socket'),
        fnApplyDelta          = require('apply-delta');
        
    var aDocLines = [];
    var ePreview  = document.getElementById('preview'); 
    
    // Init Socket.
    var sSocketURL = 'ws://' + window.document.location.host + '/';
    var oSocket  = new Socket(sSocketURL);
    oSocket.bind('message', null, handleServerAction);
    
    // Open existing document.
    var sDocumentID = /^(\/v)?\/([a-z0-9]+)\/preview\/?$/.exec(document.location.pathname)[2];
    oSocket.send('openDocument',
    {
        sDocumentID: sDocumentID,
        bIsPreview: true
    });            
    
    function handleServerAction(oAction)
    {
        switch(oAction.sType)
        {
            case 'setDocumentTitle':
                oHelpers.setTitleWithHistory(oAction.oData.sTitle);
                break;
            
            case 'setDocumentData':
                aDocLines = oAction.oData.aLines;
                updatePreview();
                break;
                
            case 'docChange':
                console.log('DocChange');
                fnApplyDelta(aDocLines, oAction.oData.oDelta);
                updatePreview();
                break;
            
            case 'error':
                document.write(oAction.oData.sMessage);
                break;
                
            default:
                return true; // Ignore other events.
        }
        return true;
    }
    
    function updatePreview()
    {
        ePreview.contentDocument.childNodes[0].innerHTML = aDocLines.join('\n');
    }
});

// Start App.
require(['preview']);