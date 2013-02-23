
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
    setReadonly(true);
    
    // Set initial text.
    var sDocText = '';
    oDocument = oEditSession.getDocument();
    oDocument.setValue(sDocText);
    
    // Receive events.
    oSocket = new WebSocket('ws://' + window.document.location.host + window.document.location.pathname);
    oSocket.onmessage = onSocketMessage;
    
    // Handle editor events.
    oEditor.on("change", onDocumentChange);
    oEditor.selection.on("changeCursor", onSelectionChange);
    oEditor.selection.on("changeSelection", onSelectionChange);


    // Dom Events.
    $('#editButton').click(function(){
        oSocket.send(JSON.stringify({
            'sType': 'requestEditRights'
        }));
    });
});

// SERVER EVENTS //////////////////////////////
function onSocketMessage(oMessage, bForce)
{
    var oEvent = JSON.parse(oMessage.data);
    if (oEvent.sType == 'setInitialValue')
    {
        bApplyingExternalEvent = true;
        oDocument.setValue(oEvent.sData);
        bApplyingExternalEvent = false;
        setReadonly(oEvent.bReadonly);
    }
    else if (oEvent.sType == 'selectionChange')
    {
        onPeerCursorMove(oEvent);
    }
    else if (oEvent.sType == 'removeEditRights')
    {
        setReadonly(true);
        oSocket.send(JSON.stringify({
            sType: 'releaseEditRights'
        }));
    }
    else if (oEvent.sType == 'editRightsGranted')
    {
        setReadonly(false);
    }
    else
    {
        bApplyingExternalEvent = true;
        oDocument.applyDeltas([oEvent.oDelta.data]);
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
    var oStart = oEvent.oRange.start;
    var oEnd = oEvent.oRange.end;
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
function onSelectionChange()
{
    var oSelectionRange = oEditor.getSelectionRange();
    if (!oLastSelectionRange || !oSelectionRange.isEqual(oLastSelectionRange))
    {
        oSocket.send(JSON.stringify(
        {
            sType: 'selectionChange',
            oRange: oSelectionRange
        }));
        oLastSelectionRange = oSelectionRange;
    }
    
}

function onDocumentChange(oEvent)
{
    if (bApplyingExternalEvent)
        return;
    
    var oNormEvent = {
        sType: 'aceDelta',
        oDelta: oEvent
    }
    oSocket.send(JSON.stringify(oNormEvent));
}

function setReadonly(bReadonly)
{
    oEditor.setReadOnly(bReadonly);
    if (bReadonly)
    {
        $('#editButtonWrapper').addClass('inReadonlyMode');
        $('#editButtonWrapper').removeClass('inEditMode');
    }
    else
    {
        $('#editButtonWrapper').addClass('inEditMode');
        $('#editButtonWrapper').removeClass('inReadonlyMode');
    }
}
