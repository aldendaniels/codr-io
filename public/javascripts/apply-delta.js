// Makes importable via node.
// See http://requirejs.org/docs/node.html
if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function(require)
{
    var fnValidateDelta = require('./validate-delta');
    
    return function(aDocLines, oDelta, doNotValidate)
    {
        // Validate delta.
        if (!doNotValidate)
            fnValidateDelta(aDocLines, oDelta);
        
        // Cache values (shortcuts).
        var iStartRow  = oDelta.oRange.oStart.iRow;
        var iStartCol  = oDelta.oRange.oStart.iCol;
        var iEndRow    = oDelta.oRange.oEnd.iRow;
        var iEndCol    = oDelta.oRange.oEnd.iCol;
        var sStartLine = aDocLines[iStartRow];
        
        // Apply delta.
        switch (oDelta.sAction)
        {
            case 'insert':
                if (iStartRow == iEndRow)
                {
                    aDocLines[iStartRow] = sStartLine.substring(0, iStartCol) + oDelta.aLines[0] + sStartLine.substring(iStartCol);
                }
                else
                {
                    aDocLines.splice.apply(aDocLines, [iStartRow, 1].concat(oDelta.aLines));
                    aDocLines[iStartRow] = sStartLine.substring(0, iStartCol) + aDocLines[iStartRow];
                    aDocLines[iStartRow + oDelta.aLines.length - 1] += sStartLine.substring(iStartCol);
                }
                break;
                
            case 'delete':
                if (iStartRow == iEndRow)
                {
                    aDocLines[iStartRow] = sStartLine.substring(0, iStartCol) + sStartLine.substring(iEndCol);
                }
                else
                {
                    aDocLines.splice(
                        iStartRow, iEndRow - iStartRow + 1,
                        sStartLine.substring(0, iStartCol) + aDocLines[iEndRow].substring(iEndCol)
                    );
                }
                break;
                
            default:
                throw 'Invalid action'
        }
    }
});
