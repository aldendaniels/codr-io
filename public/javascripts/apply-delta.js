// Makes importable via node.
// See http://requirejs.org/docs/node.html
if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function(require)
{
    // Dependencies.
    var oHelpers = require('./helpers/helpers-core'); // Rel. path for use in nodejs.

    function splitLine(asLines, oPoint)
    {
        var sText = asLines[oPoint.iRow];
        asLines[oPoint.iRow] = sText.slice(0, oPoint.iCol);
        asLines.splice(oPoint.iRow + 1, 0, sText.slice(oPoint.iCol));
    }
    
    function joinLineWithNext(asLines, iRow)
    {
        asLines[iRow] += asLines[iRow + 1];
        asLines.splice(iRow + 1, 1);            
    }
    
    return function(asLines, oDelta)
    {
        switch (oDelta.sAction)
        {
            case 'insert':
                splitLine(asLines, oDelta.oRange.oStart);
                for (var i = 0; i < oDelta.aLines.length; i++)
                {
                    var iDocLine = oDelta.oRange.oStart.iRow + 1 + i;
                    asLines.splice(iDocLine, 0, oDelta.aLines[i]);
                }
                joinLineWithNext(asLines, oDelta.oRange.oStart.iRow);
                joinLineWithNext(asLines, oDelta.oRange.oEnd.iRow);
                break;
            
            case 'delete':
                splitLine(asLines, oDelta.oRange.oEnd);
                splitLine(asLines, oDelta.oRange.oStart);
                asLines.splice(
                    oDelta.oRange.oStart.iRow + 1,                           // Where to start deleting
                    oDelta.oRange.oEnd.iRow - oDelta.oRange.oStart.iRow + 1  // Num lines to delete.
                );
                joinLineWithNext(asLines, oDelta.oRange.oStart.iRow);
                break;
            
            default:
                oHelpers.assert(false, 'Invalid delta type: ' + oDelta.sAction);
        }
    }
});

