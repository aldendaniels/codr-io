
var AceRange = ace.require('ace/range').Range;

var EditControl = oHelpers.createClass(
{
    // Ace info.
    _oAceEditor: null,
    _oAceEditSession: null,
    _oAceDocument: null,
    _sNewLineChar: '',
    
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
        
        // Init marker ID map (maps specified marker ID to ace Marker ID).
        this._oAceMarkerIDMap = {};
    },
        
    applyDelta: function(oNormDelta)
    {
        var oAceDelta = this._normalizeAceDelta(oNormDelta);
        this._oAceDocument.applyDelta([oAceDelta])
    },
    
    applyDeltas: function(aDeltas)
    {
        for (var i in aDeltas)
            this.applydelta(aDeltas[i]);
    },
    
    revertDelta: function(oNormDelta)
    {
        var oAceDelta = this._denormalizeDelta(oNormDelta)
        this._oAceDocument.revertDeltas([oAceDelta]);
    },
    
    revertDeltas: function(aNormDeltas)
    {
        for (var i = aDeltas.length - 1; i >= 0; i--)
            this.revertDelta(aDeltas[i]);
    },
    
    setMode: function(oMode)
    {
        this._oAceEditSession.setMode(oMode.getPath());
    },
    
    setContent: function(aLines)
    {
        this._oAceDocument.setValue('');
        this._oAceDocument.insertLines(0, aLines);
        this._oAceEditor.moveCursorTo(0, 0);
    },
    
    setSelectionMarker: function(oRange, sID, sClassName)
    {
        // Remove existing ranges (if exists)
        if (sID in this._oAceMarkerIDMap)
            this.removeSelectionMarker(sID);
        
        // Create Range.
        var bIsCollapsed  = oSel.start.row == oSel.end.row && oSel.start.column == oSel.end.column;
        var oNewRange     = new Range();
        oNewRange.start = this._oAceDocument.createAnchor(oSel.start.row, oSel.start.column);
        oNewRange.end   = this._oAceDocument.createAnchor(oSel.end.row,   oSel.end.column);
        
        // Add marker.
        var aAceMarkerIDs;
        if (bIsCollapsed)
        {
            oNewRange.end.column += 1; // Hack: Zero-width selections are not visible.
            aAceMarkerIDs.push(this._oAceEditSession.addMarker(oNewRange, 'remote-sel-collapsed '     + sClassName,  'text'));
            aAceMarkerIDs.push(this._oAceEditSession.addMarker(oNewRange, 'remote-sel-collapsed-hat ' + sClassName, 'text'));
        }
        else
            aAceMarkerIDs.push(this._oAceEditSession.addMarker(oNewRange, 'remote-sel ' + sClassName, 'text'));
        
        // Save ACE IDs in map.
        this._oAceMarkerIDMap[sID] = aAceMarkerIDs;
    },
    
    removeSelectionMarker: function(sID)
    {
        oHelpers.assert(sID in this._oAceMarkerIDMap, 'ID not found in map: ' + sID);
        var aAceMarkerIDs = aAceMarkerIDs[sID];
        for (var i in aAceMarkerIDs)
            this._oAceEditSession.removeMarker(aAceMarkerIDs[i]);
        delete this._oRemoteUsers[sClientID];
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
                    var oDelta = this._normalizeAceDelta(oEvent.data);
                    fnCallback(oDelta);
                }));
                break;
            
            case 'selChange':
                var fnOnSelChange = oHelpers.createCallback(this, function()
                {
                    var oAceSelectionRange = this._oAceEditor.getSelectionRange();
                    var bIsDuplicateEvent = this._oLastAceSelectionRange && this._oLastAceSelectionRange.isEqual(oSelectionRange);
                    if (!bIsDuplicateEvent)
                        fnCallback(this._normalizeAceRange(oAceSelectionRange));
                });
                this._oAceEditor.on('changeCursor',    fnOnSelChange);
                this._oAceEditor.on('changeSelection', fnOnSelChange);
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
                    oRange: oNormRange
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
                    oRange: oNormRange
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
                    sText: oNormDelta.aLines.join(this._sNewLineChar)
                }
            case 'delete':
                return {
                    action: 'deleteText',
                    range: oAceRange,
                    sText: oNormDelta.aLines.join(this._sNewLineChar)
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

