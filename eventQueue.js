var oHelpers = require('./helpers');

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

module.exports = {
    "EventQueue": EventQueue
};