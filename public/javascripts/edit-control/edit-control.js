
var AceRange = ace.require('ace/range').Range;

var EditControl = oHelpers.createClass(
{
    // Ace info.
    _oAceEditor: null,
    _oAceEditSession: null,
    _oAceDocument: null,
    _sNewLineChar: '',
    
    /* Keep from sending too many selection change events. */
    _bApplyingDelta: false,
    _bDocumentJustChanged: false,
    _iSendSelEventTimeout: null,
    
    // State
    _oLastAceSelectionRange: null,
    _oAceMarkerIDMap: null,
    
    __type__: 'EditControl',
    
    __init__: function(sEditorID)
    {
        // Create ace editor.
        this._jEditorElem = $(sEditorID);
        this._oAceEditor = ace.edit(sEditorID);
        this._oAceEditSession = this._oAceEditor.getSession();
        this._oAceDocument = this._oAceEditSession.getDocument();
        this._sNewLineChar = this._oAceDocument.getNewLineCharacter();
        
        // Set initial ace editor settings.
        this._oAceEditor.setFontSize(14);
        this._oAceEditor.setShowPrintMargin(false);
        this._oAceEditor.setReadOnly(IS_SNAPSHOT);
        // TODO: Uncomment when ace is updated:
        // this._oAceEditor.setOption('vScrollbarAlwaysVisible', false); 
            
        // Attach Ace gotoline command to different shortcut
        this._oAceEditor.commands.bindKey('Ctrl-G|Command-G', 'gotoline');
        this._oAceEditor.commands.bindKey('Ctrl-L|Command-L', '');
		
		// Do not include white space in selection
		this._oAceEditor.setSelectionStyle('text');
        
        // Prevent bluring.
        this._oAceEditor.on('blur', function(oEvent)
        {
            oEvent.preventDefault();
        });
        
        this._oLastAceSelectionRange = new AceRange(0, 0, 0, 0);
        
        // Init marker ID map (maps specified marker ID to ace Marker ID).
        this._oAceMarkerIDMap = {};
    },
        
    applyDelta: function(oNormDelta)
    {
        this._bApplyingDelta = true;
        var oAceDelta = this._denormalizeDelta(oNormDelta);
        this._oAceDocument.applyDeltas([oAceDelta]);
        this._bApplyingDelta = false;
    },
    
    applyDeltas: function(aDeltas)
    {
        for (var i in aDeltas)
            this.applyDelta(aDeltas[i]);
    },
    
    revertDelta: function(oNormDelta)
    {
        var oAceDelta = this._denormalizeDelta(oNormDelta)
        this._oAceDocument.revertDeltas([oAceDelta]);
    },
    
    revertDeltas: function(aNormDeltas)
    {
        for (var i = aNormDeltas.length - 1; i >= 0; i--)
            this.revertDelta(aNormDeltas[i]);
    },
    
    setMode: function(oMode)
    {
        this._oAceEditSession.setMode(oMode.getPath());
    },
    
    setContent: function(aLines)
    {
        this._bApplyingDelta = true;
        this._oAceDocument.setValue(aLines.join(this._sNewLineChar));
        this._oAceEditor.moveCursorTo(0, 0);
        this._bApplyingDelta = false;
    },
    
    setSelectionMarker: function(oRange, sID, sClassName)
    {
        // Remove existing ranges (if exists)
        if (sID in this._oAceMarkerIDMap)
            this.removeSelectionMarker(sID);
        
        // Create Ace Range.
        var bIsCollapsed   = oRange.oStart.iRow == oRange.oEnd.iRow && oRange.oStart.iCol == oRange.oEnd.iCol;
        var oNewAceRange   = this._denormalizeRange(oRange);
        
        // Add marker.
        var aAceMarkerIDs = [];
        if (bIsCollapsed)
        {
            oNewAceRange.end.column += 1; // Hack: Zero-width selections are not visible.
            aAceMarkerIDs.push(this._oAceEditSession.addMarker(oNewAceRange, 'remote-sel-collapsed '     + sClassName,  'text'));
            aAceMarkerIDs.push(this._oAceEditSession.addMarker(oNewAceRange, 'remote-sel-collapsed-hat ' + sClassName, 'text'));
        }
        else
            aAceMarkerIDs.push(this._oAceEditSession.addMarker(oNewAceRange, 'remote-sel ' + sClassName, 'text'));
        
        // Save ACE IDs in map.
        this._oAceMarkerIDMap[sID] = aAceMarkerIDs;
    },
    
    removeSelectionMarker: function(sID)
    {
        if (!sID in this._oAceMarkerIDMap)
            return;

        var aAceMarkerIDs = this._oAceMarkerIDMap[sID];
        for (var i in aAceMarkerIDs)
            this._oAceEditSession.removeMarker(aAceMarkerIDs[i]);
        delete this._oAceMarkerIDMap[sID];
    },
    
    resize: function()
    {
        this._oAceEditor.resize();
    },
    
    focus: function()
    {
        this._oAceEditor.focus();
    },
    
    on: function(sEventType, oScope, fnCallback)
    {
        fnCallback = oHelpers.createCallback(oScope, fnCallback);
        switch (sEventType)
        {
            case 'docChange':
                this._oAceEditor.on('change', oHelpers.createCallback(this, function(oEvent)
                {
                    // Selection events are sent before and after document changes.
                    // We don't want to send any selection event in this case.
                    this._bDocumentJustChanged = true;
                    clearTimeout(this._iSendSelEventTimeout);
                    
                    // Notify callback.
                    if (!this._bApplyingDelta)
                        fnCallback(this._normalizeAceDelta(oEvent.data));
                }));
                break;
            
            case 'selChange':
                this._oAceEditor.on('changeSelection', oHelpers.createCallback(this, function(oEvent)
                {
                    // Ignore duplicate event.
                    var oAceSelectionRange = this._oAceEditor.getSelectionRange();
                    var bIsDuplicateEvent = this._oLastAceSelectionRange.isEqual(oAceSelectionRange);
                    this._oLastAceSelectionRange = oAceSelectionRange;
                    if (bIsDuplicateEvent)
                        return;
                    
                    // Ignore event after delta.
                    if (this._bDocumentJustChanged)
                    {
                        this._bDocumentJustChanged = false;
                        return;
                    }
                    
                    // Don't send selection event immediatly preceding this one.
                    // This is because ace gives us two selection events in a row
                    // for most selection changes . . . a bogus one followed by a
                    // good noe.
                    if (this._iSendSelEventTimeout)
                        clearTimeout(this._iSendSelEventTimeout);
                    
                    // Send event.
                    var oNormRange = this._normalizeAceRange(oAceSelectionRange);
                    this._iSendSelEventTimeout = window.setTimeout(function(){ fnCallback(oNormRange); }, 1);
                }));
                break;
            
            default:
                oHelpers.assert(false, 'Invalid event type ' + sEventType);
        }
    },
    
    _normalizeAceDelta: function(oAceDelta)
    {
        var oNormRange = this._normalizeAceRange(oAceDelta.range);
        switch (oAceDelta.action)
        {
            case 'insertText':
                return {
                    sAction: 'insert',
                    oRange: oNormRange,
                    aLines: oAceDelta.text.split(this._sNewLineChar)
                };
                
            case 'removeText':
                return {
                    sAction: 'delete',
                    oRange: oNormRange,
                    aLines: oAceDelta.text.split(this._sNewLineChar)
                };
                
            case 'insertLines':
                return {
                    sAction: 'insert',
                    oRange: oNormRange,
                    aLines: oAceDelta.lines.concat([''])
                };
                
            case 'removeLines':
                return {
                    sAction: 'delete',
                    oRange: oNormRange,
                    aLines: oAceDelta.lines.concat([''])
                };
                
            default:
                oHelpers.assert(false, 'Invalid AceDelta type: ' + oAceDelta.action);
        }
        return null;
    },
    
    _denormalizeDelta: function(oNormDelta)
    {
        var oAceRange = this._denormalizeRange(oNormDelta.oRange);
        switch (oNormDelta.sAction)
        {
            case 'insert':
                return {
                    action: 'insertText',
                    range: oAceRange,
                    text: oNormDelta.aLines.join(this._sNewLineChar)
                }
            case 'delete':
                return {
                    action: 'removeText',
                    range: oAceRange,
                    text: oNormDelta.aLines.join(this._sNewLineChar)
                }
            default:
                oHelpers.assert(false, 'Invalid delta type.');
        }
        return null;
    },
    
    _normalizeAceRange: function(oAceRange)
    {
        return {
            oStart: { iRow: oAceRange.start.row, iCol: oAceRange.start.column },
            oEnd:   { iRow: oAceRange.end.row  , iCol: oAceRange.end.column   }
        };
    },
    
    _denormalizeRange: function(oNormRange)
    {
        return new AceRange(oNormRange.oStart.iRow, oNormRange.oStart.iCol,
                            oNormRange.oEnd.iRow,   oNormRange.oEnd.iCol);
    }    
});

