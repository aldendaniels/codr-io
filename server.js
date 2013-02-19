
// Include Libraries.
var oExpress = require('express');
var oWS = require('ws');
var oHTTP = require('http');
var oHelpers = require('helpers');

// Create express app.
var oApp = oExpress();
oApp.use(oExpress.static(__dirname + '/static'));

// Instantiate server.
var oServer = oHTTP.createServer(oApp);
oServer.listen(8080);

// Instantiate websocket listener.
var oWsServer = new oWS.Server({server: oServer});
oWsServer.on('connection', function(oSocket)
{
    // Create new doc (if necessary).
    var sID = 'abcd'; // Get this from URL.
    if (!(sID in g_oDocuments))
        g_oDocuments[sID] = new Document();

    // Register client.
    g_oDocuments[sID].registerClient(oSocket);    
});

var g_oDocuments = {}; // sID to Document instance.


var Document = oHelpers.createClass(
{
    _aLines: [],
    _oEventQueue: null,
    _aClients: [],
    
    __init__: function()
    {
        this._oEventQueue = new EventQueue();
    },
    
    registerClient: function(oSocket)
    {
        this._aClients.push(new Client(oSocket, this));
    },
    
    removeClient: function(oClient)
    {
        var iIndex = this._aClients.indexOf(oClient);
        this._aClients.splice(iIndex, 1);
    },
    
    onClientEvent: function(oEvent)
    {
        this._oEventQueue.push(oEvent);
        for (var i = 0; i < this._aClients.length; i++)
        {
            var oClient = this._aClients[i];
            if(oEvent.oClient == oClient)
            {
                if (oEvent.sType != 'selectionChange')
                    oClient.notifyEventProcessed();
            }
            else
            {
                oClient.sendEvent(oEvent)
            }
        }
    }
});

var EventQueue = oHelpers.createClass({

    _aEvents: null,
    
    __init__: function()
    {
        this._aEvents = [];
    },

    push: function(oEvent)
    {
        this._aEvents.push(oEvent);
        // TODO: Do magic here.
    },
    
    getText: function(oEvent)
    {
        var aLines = [];
        for (var iEvent = 0; iEvent < this._aEvents.length; iEvent++)
        {
            var oDelta = this._aEvents[iEvent].oEventData;
            if (oDelta.sType == 'insertLines')
            {
                this.insertLines(aLines, oDelta.aLines, oDelta.oRange.oStart.iRow);
            }
            else if (oDelta.sType == 'insertText')
            {
                var oStart = oDelta.oRange.oStart;
                var sLine = aLines[oStart.iRow] || '';
                var sNewLine = sLine.substring(0, oStart.iColumn) + oDelta.sText + sLine.substring(oStart.iColumn);
                
                var aNewLines = sNewLine.split('\n');
                var sFirstLine = aNewLines[0];
                aLines[oStart.iRow] = sFirstLine;
                
                if (aNewLines.length > 1)
                    this.insertLines(aLines, aNewLines.slice(1), oStart.iRow + 1);
            }
        }
        return aLines.join('\n');
//        else if (delta.action == "removeLines")
//        else if (delta.action == "removeText")
    },
    
    insertLines: function (aDocument, aNewLines, iRow)
    {
        var args = [iRow, 0];
        args.push.apply(args, aNewLines);
        aDocument.splice.apply(aDocument, args);
    }
});

var Client = oHelpers.createClass({

    _oSocket: null,
    _oDocument: null,
    _sID: '1234',
    
    __init__: function(oSocket, oDocument)
    {
        this._oSocket = oSocket;
        this._oDocument = oDocument;
        
        oSocket.on('message', oHelpers.createCallback(this, this._onClientEvent));
        oSocket.on('close', oHelpers.createCallback(this, function()
        {
            this._oDocument.removeClient(this);
        }));
    },
    
    sendEvent: function(oEvent)
    {
        this._send(oEvent.oEventData);
    },
    
    notifyEventProcessed: function()
    {
        this._send(
        {
            sType: 'eventProcessed',
            oData: ''
        });
    },
    
    _onClientEvent: function(sEventData)
    {
        // Get event data.
        var oEventData = JSON.parse(sEventData);
        if (oEventData.sType == 'selectionChange')
            oEventData.sPeerID = this._sID;
        
        // Send event to document.
        this._oDocument.onClientEvent(
        {
            oClient: this,
            oEventData: oEventData
        });
    },
    
    _send: function(oEvent)
    {
        this._oSocket.send(JSON.stringify(oEvent));
    }
});

var UnitTest = oHelpers.createClass({
    iSuccesses: 0,
    iErrors: 0,
    oErrors: {},
    oEventQueue: null,
    
    testSimpleInsertText: function()
    {
        this.insertText('me', 'abc', 0, 0);
        this.insertText('me', '\nnew line\n', 1, 1);
        
        this.assertEqual('a\nnew line\nbc', this.oEventQueue.getText());
    },
    
    testSimpleInsertLines: function()
    {
        this.insertText('me', 'Line One\nLine Four', 0, 0);
        this.insertLines('me', ['Line Two', 'Line Three'], 1, 1);
        
        this.assertEqual('Line One\nLine Two\nLine Three\nLine Four', this.oEventQueue.getText());
    },

    testMergeInserts: function()
    {
        this.insertText('me', 'abc', 0, 0);
        this.insertText('me', '123', 0, 1);
        this.insertText('you', 'ABC', 1, 0);

        this.assertEqual('123aABCbc', this.oEventQueue.getText());
    },
    
    assertEqual: function(left, right)
    {
        if (left != right)
            throw '\'' + left + '\' != \'' + right + '\'';
    },
    
    insertText: function(sUser, sText, iPos, iState)
    {
        this.oEventQueue.push({
            'oClient': sUser,
            'oEventData': {
                'sType': 'insertText',
                'oRange': {
                    'oStart': {
                        'iRow': 0,
                        'iColumn': iPos
                    },
                    'oEnd': {
                        'iRow': 0,
                        'iColumn': iPos + sText.length
                    }
                },
                'iState': iState,
                'sText': sText
            }
        });
    },

    insertLines: function(sUser, aLines, iRow, iState)
    {
        this.oEventQueue.push({
            'oClient': sUser,
            'oEventData': {
                'sType': 'insertLines',
                'oRange': {
                    'oStart': {
                        'iRow': iRow,
                        'iColumn': 0
                    },
                    'oEnd': {
                        'iRow': iRow + aLines.length,
                        'iColumn': 0
                    }
                },
                'iState': iState,
                'aLines': aLines
            }
        });
    },
    
    _setup: function()
    {
        this.oEventQueue = new EventQueue();
    },
    
    _tearDown: function()
    {
        this.oEventQueue = null;
    },
    
    _run: function(sTest)
    {
        this._setup();
        var bSuccess = false;
        try
        {
            this[sTest]();
            bSuccess = true;
        }
        catch (e)
        {
            this.iErrors++;
            this.oErrors[sTest] = e;
        }
        if (bSuccess)
            this.iSuccesses++;

        this._tearDown();
    },
    
    run: function()
    {
        for (var sMethod in this)
            if (sMethod.indexOf('test') == 0)
                this._run(sMethod);
        
        console.log('UnitTests: ' + this.iSuccesses + ' succeeded and ' + this.iErrors + ' failed.')
        for (var sTest in this.oErrors)
            console.log(sTest, ': ', this.oErrors[sTest]);
    },

});

var tests = new UnitTest();
tests.run();