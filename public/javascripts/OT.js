/* Thoughts (Nov 24, 2013)
 * 
 * INSERTIONS
 * OT should never modify the size of an insertion range: only the location of that range.
 * The end point of the range will always differ from the start by the number of lines/chars 
 * inserted. Therefore, we should ONLY apply OT to the start point and then move the end 
 * point accordingly.
 *
 * Before, we were separately applying OT to the endpoint. This creates the following (unverified) bug:
 *  DOCUMENT START: ab          state = 0
 *  USER 1:         abC         state = 0 > 1
 *  USER 2:         aTESTb      state = 0 > 2
 *  ------------------------
 *  USER 2 range = 1 - 6 instead of 1 - 5
 *
 * DELETIONS
 * The deletion range should be modified (starting and ending) to reflect previous actions.
 * Additionally, the stored deleted lines should be updating to reflect previous asctions 
 * as well. Up until now, we did not delta the deleted lines. This meant that when the delete
 * action was reverted, the inserted text did not match the text actually deleted post-OT.
 *
 * UNDO / REDO
 * The correction of the above bugs should help insertions.
 *
 * Right now, we dedect groups of similar deltas and undo/redo the entire
 * group together by sequentially undoing/redoing each delta independantly. 
 * This means that that level of undo-granularity differs between pasting in
 * "Hello world" and typing it. 
 *
 * Example (typing):
 *  DOCUMENT START: 1
 *  USER 1:         12
 *  USER 1:         123
 *  USER 1:         1234
 *  USER 2:         124
 *  USER 2:         12_4
 *  USER 1 (undo)   12_ // Undo 4
 *  USER 1 (undo)   12_ // Undo 3, noop, becasue the 3 was already deleted
 *  USER 1 (undo)   1_  // Undo 2
 *
 *  Example (Paste):
 *   DOCUMENT START: 1 
 *   USER 1:         1234 // Paste
 *   USER 2:         124
 *   USER 2:         12_4
 *   USER 1 (undo)   1
 *
 *  We think that the paste-level granularity is really nicer, because the "_" 
 *  left around in the first example is unintuitive. However, on redo, we'd like
 *  the "_" to come back (doesn't happen with paste today). The "Deletions" bug-fix
 *  can help.
 *
 *  On undo/redo, we'd like to construct a single event representing the entire group
 *  (like paste!) Then we'd like to OT the whole thing at once and (thanks to the "deletions" 
 *  fix) we expect the other user's implicated changes to get correctly baked in. Magic!
 *
 *  THIS FILE IS BROKEN. ON PURPOSE!
 * */


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
                // Transform deletion range.
                var oNewRange  = this.getTransformedRange(oDelta1, oRange2);
                oDelta2.oRange = oNewRange;
                
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
                
                // Add text that delta1 inserted into delta2's deleted text.
                else if (this._pointsInOrder(oRange2.oStart, oRange1.oStart, false) &&
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
        },
        
        getTransformedRange: function(oDelta, oRange)
        {
            // Note: For collapsed selections, we treat the both points as the "End of Range".
            //       This way, the a delta occuring at the same location as the collapsed range
            //       won't push the range around unnecessarily.
            var bIsCollapsed = oRange.oStart.iRow == oRange.oEnd.iRow && oRange.oStart.iCol == oRange.oEnd.iCol;
            return (
            {
                oStart: this._getTransformedPoint(oDelta, oRange.oStart , bIsCollapsed),
                oEnd:   this._getTransformedPoint(oDelta, oRange.oEnd   , true)
            });
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
