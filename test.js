var EventQueue = require('./eventQueue').EventQueue;

var iSuccesses = 0;
var iErrors = 0;
var oErrors = {};
var oEventQueue = null;
    
function assertStrEqual(sVal1, sVal2)
{
    if (sVal1 != sVal2)
        throw '\'' + sVal1 + '\' != \'' + sVal2 + '\'';
}

function insertText(sUser, sText, iPos, iState)
{
    oEventQueue.push(
    {
        'oClient': sUser, // TODO: Use an actual user id.
        'oEventData': {
            'sType': 'insertText',
            'oRange': createRange(0, iPos, 0, iPos + sText.length),
            'iState': iState,
            'sText': sText
        }
    });
}

function insertLines(sUser, aLines, iRow, iState)
{
    oEventQueue.push(
    {
        'oClient': sUser,
        'oEventData':
        {
            'sType': 'insertLines',
            'oRange': createRange(iRow, 0, iRow + aLines.length, 0),
            'iState': iState,
            'aLines': aLines
        },
    });
}

function removeText(sUser, iStartRow, iStartCol, iEndRow, iEndCol, iState)
{
    oEventQueue.push(
    {
        'oClient': sUser,
        'oEventData':
        {
            'sType': 'removeText',
            'oRange': createRange(iStartRow, iStartCol, iEndRow, iEndCol),
            'iState': iState
        },
    });
}

function removeLines(sUser, iStartRow, iEndRow, iState)
{
    oEventQueue.push(
    {
        'oClient': sUser,
        'oEventData':
        {
            'sType': 'removeLines',
            'oRange': createRange(iStartRow, 0, iEndRow, 0),
            'iState': iState
        }
    });
}

function createRange(iStartRow, iStartCol, iEndRow, iEndCol)
{
    return {
        'oStart':
        {
            'iRow': iStartRow,
            'iColumn': iStartCol
        },
        'oEnd':
        {
            'iRow': iEndRow,
            'iColumn': iEndCol
        }
    };
}

function runTest(sTestName)
{
    oEventQueue = new EventQueue();
    try
    {
        oTests[sTestName]();
    }
    catch (e)
    {
        return e || 'Unknown Error';
    }
    return ''; // success.
}

function runTests()
{
    var iNumTestsFailed = 0;
    var iNumTestsPassed = 0;
    for (var sTestName in oTests)
    {
        var sError = runTest(sTestName);
        if (sError)
        {
            console.log(sTestName, ': ', sError);
            iNumTestsFailed++;
        }
        else
            iNumTestsPassed++;
    }

    var numTests = iNumTestsFailed + iNumTestsPassed;
    console.log('UnitTests: ' + iNumTestsFailed + ' failed of ' + numTests + ' tests.')
}

var oTests = {
    
    testSimpleInsertText: function()
    {
        insertText('me', 'abc', 0, 0);
        insertText('me', '\nnew line\n', 1, 1);
        
        assertStrEqual('a\nnew line\nbc', oEventQueue.getText());
    },
    
    testSimpleInsertLines: function()
    {
        insertText('me', 'Line One\nLine Four', 0, 0);
        insertLines('me', ['Line Two', 'Line Three'], 1, 1);
        
        assertStrEqual('Line One\nLine Two\nLine Three\nLine Four', oEventQueue.getText());
    },
    
    testSimpleRemoveText: function()
    {
        insertText('me', 'Hello World', 0, 0);
        removeText('me', 0, 2, 0, 5, 1);
        assertStrEqual('He World', oEventQueue.getText());
        
        insertLines('me', ['Line Two', 'Line Three', 'Line Four'], 1, 2);
        removeText('me', 0, 6, 2, 5, 3);
        assertStrEqual('He WorThree\nLine Four', oEventQueue.getText());
    },
    
    testSimpleRemoveLines: function()
    {
        insertLines('me', ['Line One', 'Line Two', 'Line Three', 'Line Four'], 0);
        removeLines('me', 1, 3, 1);
        assertStrEqual('Line One\nLine Four', oEventQueue.getText());
    },

    testMergeInserts: function()
    {
        insertText('me', 'abc', 0, 0);
        insertText('me', '123', 0, 1);
        insertText('you', 'ABC', 1, 0);

        assertStrEqual('123aABCbc', oEventQueue.getText());
    },
    
};

module.exports =
{
    "runTests": runTests
};