
var oEditor = null;
var oEditSession = null;
var oMarkers = {};
var oSocket = null;
var oDocument = null;
var Range = ace.require('ace/range').Range;
var bApplyingExternalEvent = false;

$(document).on('ready', function()
{
    // Create editor.
    oEditor = ace.edit("editor");
    oEditSession = oEditor.getSession();
    oEditor.setTheme("ace/theme/monokai");
    oEditSession.setMode("ace/mode/javascript");
    
    // Set initial text.
    var sDocText = 'function foo(items)\n{\n    var x = "All this is syntax highlighted";\n    return x;\n}'
    oDocument = oEditSession.getDocument();
    oDocument.setValue(sDocText);
    
    // Receive events.
    oSocket = new WebSocket('ws://localhost:8080');
    oSocket.onmessage = onSocketMessage;
    
    // Handle editor events.
    oEditor.on("change", onDocumentChange);
    oEditor.selection.on("changeCursor", onSelectionChange);
    oEditor.selection.on("changeSelection", onSelectionChange);
});

// SERVER EVENTS //////////////////////////////
function onSocketMessage(oMessage)
{
    var oEvent = JSON.parse(oMessage.data);
    if (oEvent.sType == 'selectionChange')
        onPeerCursorMove(oEvent);
    else if (oEvent.sType != 'eventProcessed')
    {
        bApplyingExternalEvent = true;
        oDocument.applyDeltas([getACEDeltaFromDelta(oEvent)]);
        bApplyingExternalEvent = false;
    }
}

function onPeerCursorMove(oEvent)
{
    // Remove old selection.
    if (oEvent.sPeerID in oMarkers)
    {
        var iOldMarkerID = oMarkers[oEvent.sPeerID];
        oEditSession.removeMarker(iOldMarkerID);
    }
    
    // Add new.
    var oStart = oEvent.oRange.oStart;
    var oEnd = oEvent.oRange.oEnd;
    var oNewRange = new Range(oStart.iRow, oStart.iColumn, oEnd.iRow, oEnd.iColumn);

    // Set new selection.
    if (oStart.iRow == oEnd.iRow && oStart.iColumn == oEnd.iColumn)
    {
        oNewRange.end.column += 1;
        oMarkers[oEvent.sPeerID] = oEditSession.addMarker(oNewRange, 'codr_peer_selection_collapsed', 'text', true);
    }
    else
    {
        oMarkers[oEvent.sPeerID] = oEditSession.addMarker(oNewRange, 'codr_peer_selection', 'text', true);   
    }
}

// EDITOR EVENTS ///////////////////////////////////////
var oLastSelectionRange = null;
function onSelectionChange()
{
    var oSelectionRange = oEditor.getSelectionRange();
    if (!oLastSelectionRange || !oSelectionRange.isEqual(oLastSelectionRange))
    {
        oSocket.send(JSON.stringify(
        {
            sType: 'selectionChange',
            oRange: normRange(oSelectionRange)
        }));
        oLastSelectionRange = oSelectionRange;
    }
    
}

function onDocumentChange(oACEEvent)
{
    if (bApplyingExternalEvent)
        return;
    
    var oNormEvent = {
        sType: oACEEvent.data.action,
        oRange: normRange(oACEEvent.data.range)
    }
    
    if (oACEEvent.data.action == 'insertText')
        oNormEvent.sText = oACEEvent.data.text;
    else if (oACEEvent.data.action == 'insertLines')
        oNormEvent.aLines = oACEEvent.data.lines;
    
    oSocket.send(JSON.stringify(oNormEvent));
}

function normRange(oACERange)
{
    return {
        oStart: {
            iRow: oACERange.start.row,
            iColumn: oACERange.start.column
        },
        oEnd: {
            iRow: oACERange.end.row,
            iColumn: oACERange.end.column
        }
    }
}

function getACEDeltaFromDelta(oDelta)
{
    var oACEDelta = {
        action: oDelta.sType,
        range: {
            start: {
                row: oDelta.oRange.oStart.iRow,
                column: oDelta.oRange.oStart.iColumn,
            },
            end: {
                row: oDelta.oRange.oEnd.iRow,
                column: oDelta.oRange.oEnd.iColumn,
            }
        }
    };
    
    if (oDelta.sType == 'insertText')
        oACEDelta.text = oDelta.sText;
    else if (oDelta.sType == 'insertLines')
        oACEDelta.lines = oDelta.aLines
        
    return oACEDelta;
}