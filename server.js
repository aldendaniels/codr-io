
// Include Libraries.
var oExpress = require('express');
var oWS = require('ws');
var oHTTP = require('http');
var oHelpers = require('./helpers');

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
        if (oEvent.oEventData.sType == 'requestValidate') //Testing only, don't add to the Q.
        {
            var sDocument = this._oEventQueue.getText();
            for (var i = 0; i < this._aClients.length; i++)
            {
                this._aClients[i].sendEvent({
                    oEventData: {
                        sType: 'validateDocument',
                        sDocument: sDocument
                    }
                })
            }
            return;
        }
        
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
    },
    
    getText: function()
    {
        return this._oEventQueue.getText();
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
            else if (oDelta.sType == "removeText")
            {
                var oStart = oDelta.oRange.oStart;
                var oEnd = oDelta.oRange.oEnd;
                
                // Simple delete.
                if (oStart.iRow == oEnd.iRow)
                {
                    var sLine = aLines[oStart.iRow]
                    aLines[oStart.iRow] = sLine.substring(0, oStart.iColumn) + sLine.substring(oEnd.iColumn);
                }                
                // Handle a multi-line delete.
                else
                {
                    aLines[oStart.iRow] = aLines[oStart.iRow].substring(0, oStart.iColumn) + aLines[oEnd.iRow].substring(oEnd.iColumn);;
                    
                    // Remove the full middle lines.
                    aLines.splice(oStart.iRow + 1, oEnd.iRow - oStart.iRow)
                }
            }
            else if (oDelta.sType == 'removeLines')
            {
                aLines.splice(oDelta.oRange.oStart.iRow, oDelta.oRange.oEnd.iRow - oDelta.oRange.oStart.iRow);
            }
        }
        return aLines.join('\n');
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
        
        oSocket.send(JSON.stringify({
            'sType': 'setInitialValue',
            'sData': this._oDocument.getText()
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
    
    testSimpleRemoveText: function()
    {
        this.insertText('me', 'Hello World', 0, 0);
        this.removeText('me', 0, 2, 0, 5, 1);
        this.assertEqual('He World', this.oEventQueue.getText());
        
        this.insertLines('me', ['Line Two', 'Line Three', 'Line Four'], 1, 2);
        this.removeText('me', 0, 6, 2, 5, 3);
        this.assertEqual('He WorThree\nLine Four', this.oEventQueue.getText());
    },
    
    testSimpleRemoveLiens: function()
    {
        this.insertLines('me', ['Line One', 'Line Two', 'Line Three', 'Line Four'], 0);
        this.removeLines('me', 1, 3, 1);
        this.assertEqual('Line One\nLine Four', this.oEventQueue.getText());
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
                'oRange': this._createRange(0, iPos, 0, iPos + sText.length),
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
                'oRange': this._createRange(iRow, 0, iRow + aLines.length, 0),
                'iState': iState,
                'aLines': aLines
            },
        });
    },
    
    removeText: function(sUser, iStartRow, iStartCol, iEndRow, iEndCol, iState)
    {
        this.oEventQueue.push({
            'oClient': sUser,
            'oEventData': {
                'sType': 'removeText',
                'oRange': this._createRange(iStartRow, iStartCol, iEndRow, iEndCol),
                'iState': iState
            },
        });
    },
    
    removeLines: function(sUser, iStartRow, iEndRow, iState)
    {
        this.oEventQueue.push({
            'oClient': sUser,
            'oEventData': {
                'sType': 'removeLines',
                'oRange': this._createRange(iStartRow, 0, iEndRow, 0),
                'iState': iState
            }
        });
    },
    
    _createRange: function(iStartRow, iStartCol, iEndRow, iEndCol)
    {
        return {
            'oStart': {
                'iRow': iStartRow,
                'iColumn': iStartCol
            },
            'oEnd': {
                'iRow': iEndRow,
                'iColumn': iEndCol
            }
        };
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