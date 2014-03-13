// Makes importable via node.
// See http://requirejs.org/docs/node.html
if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function(require)
{   
    function throwDeltaError(oDelta, sErrorText)
    {
        console.log("Invalid Delta:", oDelta);
        throw "Invalid Delta: " + sErrorText;
    }
    
    function positionInDocument(aDocLines, oPos)
    {
        return oPos.iRow >= 0 && oPos.iRow <  aDocLines.length &&
               oPos.iCol >= 0 && oPos.iCol <= aDocLines[oPos.iRow].length;
    }
    
    function validateDelta(aDocLines, oDelta)
    {
        // Validate action string.
        if (oDelta.sAction != 'insert' && oDelta.sAction != 'delete')
            throwDeltaError(oDelta, 'oDelta.sAction must be "insert" or "delete".');
        
        // Validate lines type.
        if (!(oDelta.aLines instanceof Array))
            throwDeltaError(oDelta, 'oDelta.aLines must be an Array.');
            
        // Validate range type.
        if (!oDelta.oRange.oStart || !oDelta.oRange.oEnd)
           throwDeltaError(oDelta, 'oDelta.oRange.oStart/oEnd must be defined.');        
        
        // Validate that the start point is contained in the document.
        var oStart = oDelta.oRange.oStart;
        if (!positionInDocument(aDocLines, oDelta.oRange.oStart))
            throwDeltaError(oDelta, "oDelta.oRange.oStart must be contained in the document.");
        
        // Validate that the end point is contained in the document (delete deltas only).
        var oEnd = oDelta.oRange.oEnd;
        if (oDelta.sAction == 'delete' && !positionInDocument(aDocLines, oEnd))
            throwDeltaError(oDelta, 'oDelta.oRange.oEnd must be contained in the document for "delete" actions.');
        
        // Validate that the size oDelta.oRange matches that of oDelta.aLines.
        var iNumRangeRows = oEnd.iRow - oStart.iRow;
        var iNumRangeLastLineChars = (oEnd.iCol - (iNumRangeRows == 0 ? oStart.iCol : 0));
        if (iNumRangeRows != oDelta.aLines.length - 1 || oDelta.aLines[iNumRangeRows].length != iNumRangeLastLineChars)
            throwDeltaError(oDelta, 'oDelta.oRange must match oDelta.aLines in size.');
    }
    
    return function(aDocLines, oDelta, doNotValidate)
    {
        // Validate delta.
        if (!doNotValidate)
            validateDelta(aDocLines, oDelta);
        
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
