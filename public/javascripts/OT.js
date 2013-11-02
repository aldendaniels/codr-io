// Makes importable via node.
// See http://requirejs.org/docs/node.html
if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function(require)
{
    // Dependencies.
    var oHelpers = require('./helpers/helpers-core'); // Rel. path for use in nodejs.
    
    return {
        
        transformRange: function(oDelta, oRange)
        {
            // Verify delta action.
            oHelpers.assert(oDelta.sAction == 'insert' || oDelta.sAction == 'delete', 'Invalid delta action: ' + oDelta.sAction);
        
            // Transform delta.
            // Note: for collapsed selections, we treat both points as the start point.
            var bIsCollapsed = oRange.oStart.iRow == oRange.oEnd.iRow && oRange.oStart.iCol == oRange.oEnd.iCol;
            return {
                oStart: this._transformPoint(oDelta, oRange.oStart , false),
                oEnd:   this._transformPoint(oDelta, oRange.oEnd   , (bIsCollapsed ? false : true))
            }
        },
        
        _transformPoint: function(oDelta, oPoint, bIsEndPoint)
        {
            var bDeltaIsInsert = (oDelta.sAction == 'insert')
            var oDeltaStart    = oDelta.oRange.oStart;
            var oRealDeltaEnd  = oDelta.oRange.oEnd;
            var oDeltaEnd      = (bDeltaIsInsert ? oDeltaStart : oDelta.oRange.oEnd);
                
            // The trans op happens later, we don't need to change.
            if ( (oPoint.iRow < oDeltaStart.iRow) || ( oPoint.iRow == oDeltaStart.iRow && oPoint.iCol < oDeltaStart.iCol ) )
                return {iRow: oPoint.iRow, iCol: oPoint.iCol};
            
            // The trans op happened before us.
            var bColIsAfter = bIsEndPoint ? oPoint.iCol > oDeltaEnd.iCol : oPoint.iCol >= oDeltaEnd.iCol;
            if( (oPoint.iRow > oDeltaEnd.iRow) || ( oPoint.iRow == oDeltaEnd.iRow && bColIsAfter ) )
            {
                var iRowShift   = (bDeltaIsInsert ? 1 : -1) * (oRealDeltaEnd.iRow - oDeltaStart.iRow);
                var iColShift   = (bDeltaIsInsert ? 1 : -1) * (oRealDeltaEnd.iCol - oDeltaStart.iCol);
                return {
                    iRow: oPoint.iRow + iRowShift, 
                    iCol: oPoint.iCol + (oPoint.iRow == oDeltaEnd.iRow ? iColShift : 0)
                }
            }
            
            // We are part of the trans op range (trans op must be a delete btw). Move us to the delete start point.
            return {iRow: oDeltaStart.iRow, iCol: oDeltaStart.iCol};
        }
    }
});