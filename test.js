
var iSuccesses = 0;
var iErrors = 0;
var oErrors = {};

function assertStrEqual(sVal1, sVal2)
{
    if (sVal1 != sVal2)
        throw '\'' + sVal1 + '\' != \'' + sVal2 + '\'';
}

function runTest(sTestName)
{
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
    
    testSimple: function()
    {
        assertStrEqual('We need tests!', 'We need tests!');
    },
};

module.exports =
{
    "runTests": runTests
};