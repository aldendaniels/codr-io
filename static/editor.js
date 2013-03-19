
// Elem IDs.
var EDITOR_ID  = 'codr-edit';
var TOOLBAR_ID = 'codr-toolbar';

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
    _sMode: '',
    _bIsEditing: false,
    
    // Other.
    _iRemoteCursorMarkerID: null,
    _oLastSelectionRange: null,
    _bIsInitialized: false,

    __init__: function(bIsEditing)
    {
        // Save editng state.
        this._bIsEditing = bIsEditing;
        
        // Create ace editor.
        this._oAceEditor = ace.edit(EDITOR_ID);
        this._oAceEditSession = this._oAceEditor.getSession();
        this._oAceDocument = this._oAceEditSession.getDocument();
        
        // Set initial settings.
        this._oAceEditor.setFontSize(14);
        this._setIsEditing(bIsEditing);
        
        // Attach events.
        this._attachDOMEvents();
        this._attachAceEvents();
        
        // Set focus & notify server of selection position.
        this.focusEditor();
        this._onAceSelectionChange();
    },
    
    focusEditor: function()
    {
        this._oAceEditor.focus();
    },
    
    connect: function(oSocket)
    {
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerAction);
        if (IS_NEW_DOCUMENT)
        {
            this._oSocket.send('createDocument',
            {
                sText: this._oAceDocument.getValue(),
                sMode: this._sMode
            });            
        }
        else
        {
            this._oSocket.send('openDocument',
            {
                sDocumentID: window.location.pathname.substr(1)
            });
        }
    },
    
    setMode: function(sMode)
    {
        this._oAceEditSession.setMode('ace/mode/' + sMode);
		this._sMode = sMode;
    },

    _handleServerAction: function(oAction)
    {
        // Verify initialization.
        if (oAction.sType == 'setDocumentData' || oAction.sType == 'setDocumentID')
            oHelpers.assert(!this._bIsInitialized);
        else
            oHelpers.assert(this._bIsInitialized);

        console.log('Action received:', oAction);

        switch(oAction.sType)
        {
            case 'setDocumentData': // Fired after opening an existing document.
                this._setText(oAction.oData.sText);
                this._setIsEditing(oAction.oData.bIsEditing);
                this.setMode(oAction.oData.sMode);
                if (oAction.oData.oSelection)
                    this._onRemoteCursorMove(oAction.oData.oSelection);
                this._bIsInitialized = true;
                break;

            case 'setDocumentID': // Fired after creating a new document.
                // TODO: Assert not init...
                this._setDocumentID(oAction.oData.sDocumentID);
                this._bIsInitialized = true;
                break;

            case 'setSelection':
                this._onRemoteCursorMove(oAction.oData);
                break;
            
            case 'removeSelection':
                this._oAceEditSession.removeMarker(this._iRemoteCursorMarkerID);
                break;
            
            case 'setMode':
                this.setMode(oAction.oData.sMode);
                break;
            
            case 'removeEditRights':
                this._setIsEditing(false);        
                this.sendAction('releaseEditRights'); // Notify server of action receipt.
                break;

            case 'editRightsGranted':
                this._setIsEditing(true);
                break;
            
            case 'aceDelta':
                this._oAceDocument.applyDeltas([oAction.oData]);
                break;
            
            default:
                oHelpers.assert(false, 'Invalid event type "' + oAction.sType + '".');
        }        
    },

    _onRemoteCursorMove: function(oSel)
    {
        // Remove old selection.
        this._oAceEditSession.removeMarker(this._iRemoteCursorMarkerID);
        
        // Set new selection.
        var oNewRange = new Range(oSel.start.row, oSel.start.column, oSel.end.row, oSel.end.column);
        if (oSel.start.row == oSel.end.row && oSel.start.column == oSel.end.column)
        {
            oNewRange.end.column += 1; // Hack: Zero-width selections are not visible.
            this._iRemoteCursorMarkerID = this._oAceEditSession.addMarker(oNewRange, 'codr-peer-selection-collapsed', 'text', true);
        }
        else
        {
            this._iRemoteCursorMarkerID = this._oAceEditSession.addMarker(oNewRange, 'codr-peer-selection', 'text', true);   
        }
    },

    _attachAceEvents: function()
    {
        this._oAceEditor.on('change',          oHelpers.createCallback(this, this._onAceDocumentChange ));
        this._oAceEditor.on('changeCursor',    oHelpers.createCallback(this, this._onAceSelectionChange));
        this._oAceEditor.on('changeSelection', oHelpers.createCallback(this, this._onAceSelectionChange));
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
                this.sendAction('setSelection', oSelectionRange);
                this._oLastSelectionRange = oSelectionRange;
            }            
        }
    },
    
    _onAceDocumentChange: function(oAceDelta)
    {
        if (this._bIsEditing)
            this.sendAction('aceDelta', oAceDelta.data);
    },

    _setIsEditing: function(bIsEditing)
    {
        this._bIsEditing = bIsEditing;
        this._oAceEditor.setReadOnly(!bIsEditing);

        if (bIsEditing)
        {
            // Hide remove cursor & send set the cursor position.
            this._oAceEditSession.removeMarker(this._iRemoteCursorMarkerID);
            this._iRemoteCursorMarkerID = null;
            this._onAceSelectionChange();
            
            // TODO: Update toolbar.
        }
        else
        {
            // TODO: Update toolbar.
        }
    },

    _setText: function(sText)
    {
        this._oAceDocument.setValue(sText);
        this._oAceEditor.moveCursorTo(0, 0);
    },

    _setDocumentID: function(sID)
    {
        window.history.replaceState(null, '', '/' + sID);
    },

    sendAction: function(sType, oData)
    {
        if (this._bIsInitialized)
            this._oSocket.send(sType, oData);
    }
});
