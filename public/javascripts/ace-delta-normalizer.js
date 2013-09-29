
var AceRange = ace.require('ace/range').Range;

var AceDeltaNormalizer = oHelpers.createClass(
{
    _oAceDocument: null,
    _sNewLineChar: '',
    
    __init__: function(oAceDocument)
    {
        this._oAceDocument = oAceDocument;
        this._sNewLineChar = oAceDocument.getNewLineCharacter();
    },
    
    normalizeAceDelta: function(oAceDelta)
    {
        // Save range offsets (for readibility).
        var oNormRange = this.normalizeAceRange(oAceDelta.range);
        var iStartRow  = oNormRange.oStart.iRow;
        var iStartCol  = oNormRange.oStart.iCol;
        var iEndRow    = oNormRange.oEnd.iRow;
        var iEndCol    = oNormRange.oEnd.iCol;
        
        // Normalize.
        switch (oAceDelta.action)
        {
            case 'insertText':
                return {
                    sAction: 'insert',
                    oRange: oNormRange,
                    aLines: oAceDelta.text.split(this._sNewLineChar)
                };
                
            case 'removeText':
                return {
                    sAction: 'delete',
                    oRange: oNormRange
                };
                
            case 'insertLines':
                return {
                    sAction: 'insert',
                    oRange: oNormRange,
                    aLines: oAceDelta.lines.concat([''])
                };
                
            case 'removeLines':
                return {
                    sAction: 'delete',
                    oRange: oNormRange
                };
                
            default:
                oHelpers.assert(false, 'Invalid AceDelta type: ' + oAceDelta.action);
        }
        return null;
    },
    
    normalizeAceRange: function(oAceRange)
    {
        return {
            oStart: { iRow: oAceRange.start.row, iCol: oAceRange.start.column },
            oEnd:   { iRow: oAceRange.end.row  , iCol: oAceRange.end.column   }
        };
    },
    
    denormalizeAceRange: function(oNormRange)
    {
        return new AceRange(oNormRange.oStart.iRow, oNormRange.oStart.iCol,
                            oNormRange.oEnd.iRow,   oNormRange.oEnd.iCol);
    },
    
    applyNormalizedDelta: function(oNormDelta)
    {
        var oAceRange = this.denormalizeAceRange(oNormDelta.oRange);
        switch (oNormDelta.sAction)
        {
            case 'insert':
                this._oAceDocument.insert(oAceRange.start, oNormDelta.aLines.join(this._sNewLineChar));
                break;            
            case 'delete':
                this._oAceDocument.remove(oAceRange);
                break;
            default:
                oHelpers.assert(false, 'Invalid delta type.');
        }
    }
});

