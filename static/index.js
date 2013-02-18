
$(document).on('ready', function()
{
    // Create editor.
    var oEditor = ace.edit("editor");
    oEditor.setTheme("ace/theme/monokai");
    oEditor.getSession().setMode("ace/mode/javascript");
    
    // Set initial text.
    var sDocText = 'function foo(items)\n{\n    var x = "All this is syntax highlighted";\n    return x;\n}'
    var oDocument = oEditor.getSession().getDocument();
    oDocument.setValue(sDocText);
    
    var bApplyingExternalEvent = false;
    
    // Reveive events.
    var oSocket = new WebSocket('ws://localhost:8080');
    oSocket.onmessage = function(oMessage)
    {
        var oEvent = JSON.parse(oMessage.data);
        if (oEvent.type != 'EVENT_PROCESSED')
        {
            bApplyingExternalEvent = true;
            oDocument.applyDeltas([oEvent]);
            bApplyingExternalEvent = false;
        }
        console.log(oEvent);
    };
    
    // Send events.
    oEditor.on("change", function(oEvent)
    {
        if (!bApplyingExternalEvent)
            oSocket.send(JSON.stringify(oEvent.data));
    });
});
