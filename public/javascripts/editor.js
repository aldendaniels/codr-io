
// Elem IDs.
var EDITOR_ID  = 'edit';
var TOOLBAR_ID = 'toolbar';

var Range = ace.require('ace/range').Range;

// Editor object.
var Editor = oHelpers.createClass(
{
    // Connection state.
    _oSocket: null,
    
    // Ace editor objects.
    _oAceEditor: null,
    _oAceEditorSession: null,
    _oAceDocument: null,

    // Editor state.
    _oMode: null,
    _bIsEditing: false,
    
    // Other.
    _iRemoteCursorMarkerID1: null,
	_iRemoteCursorMarkerID2: null,
    _oLastSelectionRange: null,

    __init__: function(bIsEditing)
    {
        // Save editing state.
        this._bIsEditing = bIsEditing;
        
        // Create ace editor.
        this._oAceEditor = ace.edit(EDITOR_ID);
        this._oAceEditSession = this._oAceEditor.getSession();
        this._oAceDocument = this._oAceEditSession.getDocument();
        
        // Set initial settings.
        this._oAceEditor.setFontSize(14);
        this._oAceEditor.setShowPrintMargin(false);
		this._oAceEditor.commands.removeCommand('gotoline');
        this.setIsEditing(this._bIsEditing);
        
        // Attach events.
        this._attachDOMEvents();
        
        // Set focus & notify server of selection position.
        this.focusEditor();
    },
    
    focusEditor: function()
    {
        this._oAceEditor.focus();
    },
    
    connect: function(oSocket)
    {
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerAction);

        this._attachAceEvents();
        if (this._bIsEditing)
            this._onAceSelectionChange();
    },
    
    setMode: function(oMode)
    {
        this._oAceEditSession.setMode(oMode.getPath());
		this._oMode = oMode;
    },
	
	getSelection: function()
	{
		return this._oAceEditor.getSelectionRange()
	},

    getMode: function()
    {
        return this._oMode;
    },

    getText: function()
    {
        return this._oAceDocument.getValue();
    },
	
	isFocused: function()
	{
		return this._oAceEditor.isFocused();
	},
	
	isEditing: function()
	{
		return this._bIsEditing;
	},

    resize: function()
    {
        this._oAceEditor.resize();
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'setDocumentData': // Fired after opening an existing document.
                this._setText(oAction.oData.sText);
                break;
	
            case 'setSelection':
                this._onRemoteCursorMove(oAction.oData);
                break;
            
            case 'removeSelection':
				this._removeRemoteSelection();
                break;
            
            case 'setMode':
                this.setMode(g_oModes.oModesByName[oAction.oData.sMode]);
                break;
            
            case 'aceDelta':
                this._oAceDocument.applyDeltas([oAction.oData]);
                break;
            
            default:
                return false;
        }

        return true;
    },

    _onRemoteCursorMove: function(oSel)
    {
		this._removeRemoteSelection();
        var oNewRange = new Range(oSel.start.row, oSel.start.column, oSel.end.row, oSel.end.column);
        if (oSel.start.row == oSel.end.row && oSel.start.column == oSel.end.column)
        {
            oNewRange.end.column += 1; // Hack: Zero-width selections are not visible.
            this._iRemoteCursorMarkerID1 = this._oAceEditSession.addMarker(oNewRange, 'remote-selection-collapsed', 'text', true);
            this._iRemoteCursorMarkerID2 = this._oAceEditSession.addMarker(oNewRange, 'remote-selection-collapsed-hat', 'text', true);
        }
        else
        {
            this._iRemoteCursorMarkerID1 = this._oAceEditSession.addMarker(oNewRange, 'remote-selection', 'text', true);   
        }
    },
	
	_removeRemoteSelection: function()
	{
        // Remove old selection.
		if (this._iRemoteCursorMarkerID1)
		{
			this._oAceEditSession.removeMarker(this._iRemoteCursorMarkerID1);
			this._iRemoteCursorMarkerID1 = null;
		}
		if (this._iRemoteCursorMarkerID2)
		{
			this._oAceEditSession.removeMarker(this._iRemoteCursorMarkerID2);
			this._iRemoteCursorMarkerID2 = null;
		}
	},

    _attachAceEvents: function()
    {
        this._oAceEditor.on('change',          oHelpers.createCallback(this, this._onAceDocumentChange ));
        this._oAceEditor.on('changeCursor',    oHelpers.createCallback(this, this._onAceSelectionChange));
        this._oAceEditor.on('changeSelection', oHelpers.createCallback(this, this._onAceSelectionChange));
		this._oAceEditor.on('blur', function(oEvent){ oEvent.preventDefault(); });
    },

    _attachDOMEvents: function()
    {
        // TODO: ...
    },
    
    _onAceSelectionChange: function()
    {
        if (this._bIsEditing)
        {
            var oSelectionRange = this._oAceEditor.getSelectionRange();
            if (!this._oLastSelectionRange || !this._oLastSelectionRange.isEqual(oSelectionRange))
            {
                this._oSocket.send('setSelection', oSelectionRange);
                this._oLastSelectionRange = oSelectionRange;
            }            
        }
    },
    
    _onAceDocumentChange: function(oAceDelta)
    {
        if (this._bIsEditing)
            this._oSocket.send('aceDelta', oAceDelta.data);
    },

    setIsEditing: function(bIsEditing)
    {
        this._bIsEditing = bIsEditing;
        this._oAceEditor.setReadOnly(!bIsEditing);

        if (bIsEditing)
        {
            // Hide remove cursor & send set the cursor position.
			this._removeRemoteSelection();
            if (this._oSocket)
                this._onAceSelectionChange();
        }
    },

    _setText: function(sText)
    {
        this._oAceDocument.setValue(sText);
        this._oAceEditor.moveCursorTo(0, 0);
    }
});
