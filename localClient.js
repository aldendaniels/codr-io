var oFs = require('fs');
var oPath = require('path');
var oWs = require('ws');
var oAceDocumentClass = require('./aceDocument').Document;

var sHelp = "Usage: node localClient.js ../my_file.txt";

// Check input
if (process.argv.length != 3)
{
    console.log('Incorrect parameters.', sHelp);
    process.exit();
}

// Check the file exists.
var sFileToShare = oPath.resolve(process.argv[2]);
if (!oFs.existsSync(sFileToShare))
{
    console.log('Could not find file: "' + sFileToShare + '".');
    process.exit();
}

var oSocket = null;
var oAceDocument = null;
var sLastSavedText = '';

//////////////////// Helpers
function socketSend(sEventType, oEventData)
{
    oSocket.send(JSON.stringify(
    {
        'sType': sEventType,
        'oData': oEventData || {}
    }));
}

function getModeFromFilePath()
{
    return 'javascript';
}

function onMessage(oEvent)
{
    var oAction = JSON.parse(oEvent.data);
    switch (oAction.sType)
    {
        case 'removeEditRights':
            socketSend('releaseEditRights'); // Notify server of action receipt.
            break;
        
        case 'aceDelta':
            oAceDocument.applyDeltas([oAction.oData]);
            break;
        
        case 'setDocumentID': // Fired after creating a new document.
            console.log('Your url is: codr.io/' + oAction.oData.sDocumentID);
            var sTitle = oPath.basename(sFileToShare);
            socketSend('setDocumentTitle', { 'sTitle': sTitle });
            break;

        case 'editRightsGranted':
        {
            // Reload the document.
            var sNewText = oFs.readFileSync(sFileToShare).toString();
            oAceDocument.setValue(sNewText);

            // The only time we get edit rights is when pushing our version of the file to the server.
            // Send a clear command.
            socketSend('aceDelta', {
                'action': 'removeText',
                'range': {'start': {'row': 0, 'column': 0}, 'end': {'row': 1000000000, 'column': 1000000000}}
            });

            // Send the new data.
            socketSend('aceDelta', {
                'action': 'insertText',
                'range': {'start': {'row': 0, 'column': 0}, 'end': {'row': 0, 'column': 0}},
                'text': sNewText
            });

            sLastSavedText = sNewText;
            break;
        }
    }
}

function save()
{
    if (oFs.readFileSync(sFileToShare).toString() == sLastSavedText)
    {
        // Do save.
        var sText = oAceDocument.getValue();
        oFs.writeFileSync(sFileToShare, sText);
        sLastSavedText = sText;
    }
    else
    {
        console.log('The file on disk changed. Stealing edit control to upload the new version.');
        socketSend('requestEditRights');
    }
}

function main()
{
    var sInitialText = oFs.readFileSync(sFileToShare).toString();
    sLastSavedText = sInitialText;

    //oSocket = new oWs('ws://localhost:8080');
    oSocket = new oWs('ws://codr.io');
    oAceDocument = new oAceDocumentClass([sInitialText]);

    oSocket.onmessage = onMessage;
    oSocket.onopen = function()
    {
        socketSend('createDocument',
        {
            sText: sInitialText,
            sMode: getModeFromFilePath()
        });            
    };

    setInterval(save, 1000);
}

main();