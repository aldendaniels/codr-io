
var oEditor = null;
var oEditSession = null;
var iRemoteCursorMarkerID = null;
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
    setEditMode(false);
    
    // Set initial text.
    var sDocText = '';
    oDocument = oEditSession.getDocument();
    oDocument.setValue(sDocText);
    
    // Receive events.
    oSocket = new WebSocket('ws://' + window.document.location.host + window.document.location.pathname);
    oSocket.onmessage = onSocketMessage;

    // Dom Events.
    $('#editButton').click(function()
    {
        oSocket.send(JSON.stringify(
        {
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
        setEditMode(oEvent.bIsEdting);
    }
    else if (oEvent.sType == 'selectionChange')
    {
        onRemoteCursorMove(oEvent);
    }
    else if (oEvent.sType == 'removeEditRights')
    {
        setEditMode(false);        
        // Notify server of event receipt.
        oSocket.send(JSON.stringify(
        {
            sType: 'releaseEditRights'
        }));
    }
    else if (oEvent.sType == 'editRightsGranted')
    {
        setEditMode(true);
    }
    else
    {
        bApplyingExternalEvent = true;
        oDocument.applyDeltas([oEvent.oDelta.data]);
        bApplyingExternalEvent = false;
    }
}

function onRemoteCursorMove(oEvent)
{
    // Remove old selection.
    oEditSession.removeMarker(iRemoteCursorMarkerID);
    
    // Add new.
    var oStart = oEvent.oRange.start;
    var oEnd = oEvent.oRange.end;
    var oNewRange = new Range(oStart.row, oStart.column, oEnd.row, oEnd.column);

    // Set new selection.
    if (oStart.row == oEnd.row && oStart.column == oEnd.column)
    {
        oNewRange.end.column += 1;
        iRemoteCursorMarkerID = oEditSession.addMarker(oNewRange, 'codr_peer_selection_collapsed', 'text', true);
    }
    else
    {
        iRemoteCursorMarkerID = oEditSession.addMarker(oNewRange, 'codr_peer_selection', 'text', true);   
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

function setEditMode(bIsEdting)
{
    oEditor.setReadOnly(!bIsEdting);
    if (bIsEdting)
    {
        // Remove remote cursor.
        oEditSession.removeMarker(iRemoteCursorMarkerID);
        iRemoteCursorMarkerID = null;

        // Attach editor events.
        oEditor.on("change", onDocumentChange);
        oEditor.selection.on("changeCursor", onSelectionChange);
        oEditor.selection.on("changeSelection", onSelectionChange);

        // Update UI.
        $('#editButtonWrapper').addClass('inEditMode');
        $('#editButtonWrapper').removeClass('inReadonlyMode');
        
        // Notify server of selection position.
        onSelectionChange();
    }
    else
    {
        // Detach editor events.
        oEditor.removeListener("change", onDocumentChange);
        oEditor.selection.removeListener("changeCursor", onSelectionChange);
        oEditor.selection.removeListener("changeSelection", onSelectionChange);

        // Update UI.
        $('#editButtonWrapper').addClass('inReadonlyMode');
        $('#editButtonWrapper').removeClass('inEditMode');
    }
}
