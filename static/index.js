
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
    if (oEvent.type == 'selectionChange')
        onPeerCursorMove(oEvent);
    else if (oEvent.type != 'eventProcessed')
    {
        bApplyingExternalEvent = true;
        oDocument.applyDeltas([oEvent]);
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
    var oStart = oEvent.data.start;
    var oEnd = oEvent.data.end;
    var oNewRange = new Range(oStart.row, oStart.column, oEnd.row, oEnd.column);

    // Set new selection.
    if (oStart.row == oEnd.row && oStart.column == oEnd.column)
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
function onSelectionChange(oEvent)
{
    var oSelectionRange = oEditor.getSelectionRange();
    if (!oLastSelectionRange || !oSelectionRange.isEqual(oLastSelectionRange))
    {
        oSocket.send(JSON.stringify(
        {
            type: 'selectionChange',
            data: oSelectionRange
        }));
        oLastSelectionRange = oSelectionRange;
    }
    
}

function onDocumentChange(oEvent)
{
    if (!bApplyingExternalEvent)
        oSocket.send(JSON.stringify(oEvent.data));
}