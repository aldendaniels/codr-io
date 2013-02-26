var Range = ace.require('ace/range').Range;

// Globals.
var g_oEditor = null;
var g_oEditSession = null;
var g_iRemoteCursorMarkerID = null;
var g_oSocket = null;
var g_oDocument = null;
var g_bApplyingExternalEvent = false;
var g_bIsEditing = false;
var g_bIsReadOnly = true;

$(document).on('ready', function()
{
    // Create editor.
    g_oEditor = ace.edit("editor");
    g_oEditSession = g_oEditor.getSession();
    g_oEditor.setTheme("ace/theme/monokai");
    setLang('text');
    setEditMode(false);
    
    // Set initial text.
    var sDocText = '';
    g_oDocument = g_oEditSession.getDocument();
    g_oDocument.setValue(sDocText);
    
    // Receive events.
    g_oSocket = new WebSocket('ws://' + window.document.location.host + window.document.location.pathname);
    g_oSocket.onmessage = onSocketMessage;

    // Dom Events.
    $('#editButton').click(function()
    {
        g_oSocket.send(JSON.stringify(
        {
            'sType': 'requestEditRights'
        }));
    });
    
    // Change mode.
    $('#mode').on('change', function()
    {
        setLang($(this).val());
        g_oSocket.send(JSON.stringify(
        {
            'sType': 'languageChange',
            'sLang': $(this).val()
        }));
    });
    
    $('#fork').click(function()
    {
        document.location.pathname = '/fork' + document.location.pathname;
    });

    $('#snapshot').click(function()
    {
        g_oSocket.send(JSON.stringify(
        {
            sType: 'generateSnapshot'
        }));
    });
});

// SERVER EVENTS //////////////////////////////
function onSocketMessage(oMessage, bForce)
{
    var oEvent = JSON.parse(oMessage.data);
    if (oEvent.sType == 'setInitialValue')
    {
        g_bApplyingExternalEvent = true;
        g_oDocument.setValue(oEvent.sData);
        g_bApplyingExternalEvent = false;
        g_bIsReadOnly = oEvent.bReadOnly;
        setEditMode(oEvent.bIsEditing);
        if (g_bIsReadOnly)
            showReadOnlyMsg()
    }
    else if (oEvent.sType == 'selectionChange')
    {
        onRemoteCursorMove(oEvent);
    }
    else if (oEvent.sType == 'languageChange')
    {
        setLang(oEvent.sLang);
    }
    else if (oEvent.sType == 'removeEditRights')
    {
        setEditMode(false);        
        // Notify server of event receipt.
        g_oSocket.send(JSON.stringify(
        {
            sType: 'releaseEditRights'
        }));
    }
    else if (oEvent.sType == 'editRightsGranted')
    {
        setEditMode(true);
    }
    else if (oEvent.sType == 'newSnapshotUrl')
    {
        window.alert('yourNewSnapshotUrl: ' + document.location.host + oEvent.sUrl);
    }
    else
    {
        g_bApplyingExternalEvent = true;
        g_oDocument.applyDeltas([oEvent.oDelta.data]);
        g_bApplyingExternalEvent = false;
    }
}

function onRemoteCursorMove(oEvent)
{
    // Remove old selection.
    g_oEditSession.removeMarker(g_iRemoteCursorMarkerID);
    
    // Add new.
    var oStart = oEvent.oRange.start;
    var oEnd = oEvent.oRange.end;
    var oNewRange = new Range(oStart.row, oStart.column, oEnd.row, oEnd.column);

    // Set new selection.
    if (oStart.row == oEnd.row && oStart.column == oEnd.column)
    {
        oNewRange.end.column += 1;
        g_iRemoteCursorMarkerID = g_oEditSession.addMarker(oNewRange, 'codr_peer_selection_collapsed', 'text', true);
    }
    else
    {
        g_iRemoteCursorMarkerID = g_oEditSession.addMarker(oNewRange, 'codr_peer_selection', 'text', true);   
    }
}

// EDITOR EVENTS ///////////////////////////////////////
var oLastSelectionRange = null;
function onSelectionChange()
{
    var oSelectionRange = g_oEditor.getSelectionRange();
    if (!oLastSelectionRange || !oSelectionRange.isEqual(oLastSelectionRange))
    {
        g_oSocket.send(JSON.stringify(
        {
            sType: 'selectionChange',
            oRange: oSelectionRange
        }));
        oLastSelectionRange = oSelectionRange;
    }
    
}

function onDocumentChange(oEvent)
{
    if (g_bApplyingExternalEvent)
        return;
    
    var oNormEvent = {
        sType: 'aceDelta',
        oDelta: oEvent
    }
    g_oSocket.send(JSON.stringify(oNormEvent));
}

function setEditMode(bIsEditing)
{
    bIsEditing = bIsEditing && !g_bIsReadOnly;
    g_oEditor.setReadOnly(!bIsEditing);
    g_bIsEditing = bIsEditing;
    
    if (bIsEditing)
    {
        // Remove remote cursor.
        g_oEditSession.removeMarker(g_iRemoteCursorMarkerID);
        g_iRemoteCursorMarkerID = null;

        // Attach editor events.
        g_oEditor.on("change", onDocumentChange);
        g_oEditor.selection.on("changeCursor", onSelectionChange);
        g_oEditor.selection.on("changeSelection", onSelectionChange);

        // Update UI.
        $('#editButtonWrapper').addClass('inEditMode');
        $('#editButtonWrapper').removeClass('inReadonlyMode');
        $('#mode').prop('disabled', false);
        
        // Notify server of selection position.
        onSelectionChange();
    }
    else
    {
        // Detach editor events.
        g_oEditor.removeListener("change", onDocumentChange);
        g_oEditor.selection.removeListener("changeCursor", onSelectionChange);
        g_oEditor.selection.removeListener("changeSelection", onSelectionChange);

        // Update UI.
        $('#editButtonWrapper').addClass('inReadonlyMode');
        $('#editButtonWrapper').removeClass('inEditMode');
        $('#mode').prop('disabled', true);
    }
}

function setLang(sLang)
{
    g_oEditSession.setMode("ace/mode/" + sLang);
    if ($('#mode').val() != sLang)
        $('#mode').val(sLang);    
}

function showReadOnlyMsg()
{
    $('body').addClass('readOnly');
    g_oSocket.close();
}
