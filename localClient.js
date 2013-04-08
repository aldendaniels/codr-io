var oFs = require('fs');
var oPath = require('path');
var oWs = require('ws');
var oAceDocumentClass = require('./aceDocument').Document;

var sHelp = "Usage: node localClient.js ../my_file.txt [optional connection ID]";

// Check input
if (process.argv.length < 3 || process.argv.length > 4)
{
    console.log('Incorrect parameters.', sHelp);
    process.exit();
}

// Check the file exists.
var sFileToShare = oPath.resolve(process.argv[2]);
if (!(oFs.existsSync || oPath.existsSync)(sFileToShare))
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
    var sExt = oPath.extname(sFileToShare);
    switch (sExt.toLowerCase())
    {
        case '.c':
            return 'c_cpp';

        case '.cpp':
            return 'c_cpp';
        
        case '.coffee':
            return 'coffee';
        
        case '.css':
            return 'css';
        
        case '.diff':
            return 'diff';
        
        case '.html':
            return 'html';
        
        case '.java':
            return 'java';
        
        case '.js':
            return 'javascript';
        
        case '.json':
            return 'json';
        
        case '.less':
            return 'less';
        
        case '.make':
            return 'makefile';
                
        case '.perl':
            return 'perl';
        
        case '.php':
            return 'php';
        
        case '.txt':
            return 'text';
        
        case '.py':
            return 'python';
        
        case '.sh':
            return 'sh';
        
        case 'sql':
            return 'sql';
        
        case '.xml':
            return 'xml';
    }
        
    return 'text';
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

        case 'setDocumentData': // Fired after opening an existing document.
            console.log('Connected');
            oAceDocument.setValue(oAction.oData.sText);
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
    oAceDocument = new oAceDocumentClass(sInitialText);

    oSocket.onmessage = onMessage;
    oSocket.onopen = function()
    {
        if (process.argv.length == 4)
        {
            console.log('Connecting to document...')
            socketSend('openDocument',
            {
                sDocumentID: process.argv[3]
            });            
        }
        else
        {
            socketSend('createDocument',
            {
                sText: sInitialText,
                sMode: getModeFromFilePath()
            });            
        }
    };

    setInterval(save, 1000);
}

main();
