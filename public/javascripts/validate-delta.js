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
    
    return function validateDelta(aDocLines, oDelta)
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
});