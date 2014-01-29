// Makes importable via node.
// See http://requirejs.org/docs/node.html
if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function(require)
{
    // Dependencies.
    var oHelpers = require('./helpers/helpers-core'); // Rel. path for use in nodejs.
    var fnApplyDelta = require('./apply-delta');
    
    return (
    {
        transformDelta: function(oDelta1, oDelta2)
        {
            // Quick access.
            var oRange1 = oDelta1.oRange;
            var oRange2 = oDelta2.oRange;
            
            if (oDelta2.sAction == 'insert')
            {
                // Transformed start point.
                var oOldStartPoint = oRange2.oStart;
                oRange2.oStart = this._getTransformedPoint(oDelta1, oDelta2.oRange.oStart, false);
                
                // Increment end point the same amount (to contain inserted text).
                oRange2.oEnd.iRow += (oRange2.oStart.iRow - oOldStartPoint.iRow);
                if (oRange2.oStart.iRow == oRange2.oEnd.iRow)
                    oRange2.oEnd.iCol += (oRange2.oStart.iCol - oOldStartPoint.iCol);
            }
            else
            {
                // Remove the text from delta2 that delta1 already deleted.
                if (oDelta1.sAction == 'delete')
                {
                    // Find the intersection of the two ranges.
                    var oIntersectStartPoint = this._pointsInOrder(oRange1.oStart, oRange2.oStart) ? oRange2.oStart : oRange1.oStart; // Max start point
                    var oIntersectEndPoint   = this._pointsInOrder(oRange1.oEnd,   oRange2.oEnd)   ? oRange1.oEnd   : oRange2.oEnd;   // Min end point
                    
                    // Munger oDelta2.aLines to reflect the intersecting changes
                    fnApplyDelta(oDelta2.aLines,
                    {
                        sAction: 'delete',
                        oRange:
                        {           // Make points relative to delta2's aLines.
                            oStart: this._getDecrementedPoint(oRange2.oStart, oIntersectStartPoint),
                            oEnd:   this._getDecrementedPoint(oRange2.oStart, oIntersectEndPoint)
                        }
                    });                    
                }
                else
                {
                    // Add text that delta1 inserted into delta2's deleted text.
                    if (this._pointsInOrder(oRange2.oStart, oRange1.oStart, false) &&
                        this._pointsInOrder(oRange1.oStart, oRange2.oEnd  , false))
                    {
                        fnApplyDelta(oDelta2.aLines,
                        {
                            sAction: 'insert',
                            oRange:
                            {           // Make points relative to delta2's aLines.
                                oStart: this._getDecrementedPoint(oRange2.oStart, oRange1.oStart),
                                oEnd:   this._getDecrementedPoint(oRange2.oStart, oRange1.oEnd)
                            },
                            aLines: oDelta1.aLines
                        });
                    }
                }
                
                // Transform deletion range.
                this.transformRange(oDelta1, oRange2);
            }
        },
        
        transformRange: function(oDelta, oRange, bPushEqualPoints)
        {
            // Note: For collapsed selections, we treat the both points as the "End of Range".
            //       This way, the a delta occuring at the same location as the collapsed range
            //       won't push the range around unnecessarily.
            var bIsCollapsed = oRange.oStart.iRow == oRange.oEnd.iRow && oRange.oStart.iCol == oRange.oEnd.iCol;
            oRange.oStart = this._getTransformedPoint(oDelta, oRange.oStart , !bPushEqualPoints && bIsCollapsed);
            oRange.oEnd   = this._getTransformedPoint(oDelta, oRange.oEnd   , !bPushEqualPoints && true);
        },
        
        _getTransformedPoint: function(oDelta, oPoint, bPointIsEndOfRange)
        {
            // Get delta info.
            var bDeltaIsInsert = (oDelta.sAction == 'insert')
            var iDeltaRowShift = (bDeltaIsInsert ? 1 : -1) * (oDelta.oRange.oEnd.iRow - oDelta.oRange.oStart.iRow);
            var iDeltaColShift = (bDeltaIsInsert ? 1 : -1) * (oDelta.oRange.oEnd.iCol - oDelta.oRange.oStart.iCol);
            var oDeltaStart    = oDelta.oRange.oStart;
            var oDeltaEnd      = (bDeltaIsInsert ? oDeltaStart : oDelta.oRange.oEnd); // Collapse insert range.
            
            // DELTA AFTER POINT: No change needed.
            if (this._pointsInOrder(oPoint, oDeltaStart, bPointIsEndOfRange))
            {
                return (
                {
                    iRow: oPoint.iRow,
                    iCol: oPoint.iCol
                });
            }
            
            // DELTA BEFORE POINT: Move point by delta shift.
            if (this._pointsInOrder(oDeltaEnd, oPoint, !bPointIsEndOfRange))
            {
                return (
                {
                    iRow: oPoint.iRow + iDeltaRowShift,
                    iCol: oPoint.iCol + (oPoint.iRow == oDeltaEnd.iRow ? iDeltaColShift : 0)
                });
            }
            
            // DELTA ENVELOPS POINT (delete only): Move point to delta start.
            oHelpers.assert(oDelta.sAction == 'delete', 'Delete action expected.');
            return (
            {
                iRow: oDeltaStart.iRow,
                iCol: oDeltaStart.iCol
            });
        },
        
        _pointsInOrder: function(oPoint1, oPoint2, bEqualPointsInOrder)
        {
            var bColIsAfter = bEqualPointsInOrder ? oPoint1.iCol <= oPoint2.iCol : oPoint1.iCol < oPoint2.iCol;
            return (oPoint1.iRow < oPoint2.iRow) || (oPoint1.iRow == oPoint2.iRow && bColIsAfter);
        },
        
        _getDecrementedPoint: function(oPoint1, oPoint2) // Decrement oPoint2 by oPoint1
        {
            oNewPoint = oHelpers.cloneObj(oPoint2);
            
            oNewPoint.iRow -= oPoint1.iRow;
            if (oPoint2.iRow == oPoint1.iRow)
                oNewPoint.iCol -= oPoint1.iCol;
            
            return oNewPoint;
        }
    });
});