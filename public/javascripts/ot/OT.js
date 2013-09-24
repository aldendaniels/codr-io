try
{
    var AceRange = require('./../../../aceDocument/range').Range;
}
catch (err)
{
    var AceRange = ace.require('ace/range').Range;
}

function transformAceDelta(oTransOp, oAceDelta)
{
    oAceDelta = _normalizeAceDelta(oAceDelta);
    var oStart = _applyTransOp(oAceDelta.range.start.row, oAceDelta.range.start.column, oTransOp, false);
    var oEnd =   _applyTransOp(oAceDelta.range.end.row,   oAceDelta.range.end.column,   oTransOp, true);
    oAceDelta.range = AceRange.fromPoints(oStart, oEnd);
    return oAceDelta;
}

function getTransOpFromAceDelta(oAceDelta)
{
    oAceDelta = _normalizeAceDelta(oAceDelta);
    if (oAceDelta.action == 'insertText')
    {
        return _transOpInsert(oAceDelta.range.start.row, oAceDelta.range.start.column, 
                              oAceDelta.range.end.row,   oAceDelta.range.end.column);
    }
    else if (oAceDelta.action == 'removeText')
    {
        return _transOpDelete(oAceDelta.range.start.row, oAceDelta.range.start.column, 
                             oAceDelta.range.end.row,   oAceDelta.range.end.column);
    }

    oHelpers.assert(false, 'Can only create a trans op for delta types insertText and removeText');
}

function _normalizeInsertTextDelta(oInsertTextDelta)
{
    var asLines = oInsertTextDelta.text.split('\n');
    var iStartRow = oInsertTextDelta.range.start.row;
    var iStartCol = oInsertTextDelta.range.start.column;
    var iEndRow = 0;
    var iEndCol = 0;
    if (asLines.length > 1)
    {
        iEndRow = iStartRow + asLines.length - 1;
        iEndCol = asLines[asLines.length - 1].length;
    }
    else if (asLines.length == 1)
    {
        iEndRow = iStartRow;
        iEndCol = iStartCol + asLines[0].length;
    }
    else
    {
        iEndRow = iStartRow;
        iEndCol = iStartCol;
    }

    oInsertTextDelta.range = new AceRange(iStartRow, iStartCol,
                                          iEndRow, iEndCol);
    return oInsertTextDelta;
}

function _normalizeAceDelta(oAceDelta)
{
    var oRange = oAceDelta.range;

    switch (oAceDelta.action)
    {
        case 'insertText':
            return _normalizeInsertTextDelta(oAceDelta);

        case 'removeText':
            return oAceDelta;

        case 'insertLines':
            if (oAceDelta.lines.length === 0)
            {
                return {
                    action: 'insertText',
                    range: new Range(0,0,0,0),
                    text: ''
                };
            }

            return {
                action: 'insertText',
                range: new AceRange(oRange.start.row, 0, oRange.start.row + oAceDelta.lines.length, 0),
                text: oAceDelta.lines.join(oAceDelta.nl) + oAceDelta.nl
            };
            
        case 'removeLines':
            return {
                action: 'removeText',
                range: new AceRange(oRange.start.row, 0, oRange.end.row, 0)
            };
            
        default:
            oHelpers.assert(false, 'Invalid AceDelta type.');
    }
}

function _transOpDelete(iStartLine, iStartCol, iEndLine, iEndCol)
{
    return ({
        iStartLine: iStartLine, 
        iStartCol: iStartCol,
        iEndLine: iEndLine,
        iEndCol: iEndCol,
        iLineShift: - (iEndLine - iStartLine),
        iColShift: - (iEndCol - iStartCol)
    });
}

function _transOpInsert(iStartLine, iStartCol, iEndLine, iEndCol)
{
    return ({
        iStartLine: iStartLine, 
        iStartCol: iStartCol,
        iEndLine: iStartLine,
        iEndCol: iStartCol,
        iLineShift: iEndLine - iStartLine,
        iColShift: iEndCol - iStartCol
    });
}

function _applyTransOp(iLine, iCol, oTransOp, bIsEndPoint)
{
    // The trans op happens later, we don't need to change.
    if ( (iLine < oTransOp.iStartLine) || ( iLine == oTransOp.iStartLine && iCol < oTransOp.iStartCol ) )
        return {row: iLine, column: iCol};
        

    // The trans op happened before us.
    var bColIsAfter = bIsEndPoint ? iCol > oTransOp.iEndCol : iCol >= oTransOp.iEndCol;
    if( (iLine > oTransOp.iEndLine) || ( iLine == oTransOp.iEndLine && bColIsAfter ) )
    {
        return {
            row:    iLine + oTransOp.iLineShift, 
            column: iCol + (iLine == oTransOp.iEndLine ? oTransOp.iColShift : 0)
        }
    }
    
    // We are part of the trans op range (trans op must be a delete btw). Move us to the delete start point.
    return {row: oTransOp.iStartLine, column: oTransOp.iStartCol};
}

try
{
    module.exports = {
        transformAceDelta: transformAceDelta,
        getTransOpFromAceDelta: getTransOpFromAceDelta
    };
} catch (err) {}

