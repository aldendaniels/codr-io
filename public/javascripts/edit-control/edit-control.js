define(function(require)
{
    // Dependencies
    var $         = require('lib/jquery'),
        oHelpers  = require('helpers/helpers-web');
        oAce      = require('./ace/ace');
    
    // Hack: Ace expect there to be a script tag to load a file named "ace.js"
    // and uses that to determine what url to load modes / extensions from.
    // This expectation is not met in production, where ace is combined with
    // other files. In this case, we manually set the path.
    if (!oAce.config.get('basePath'))
    {
        oAce.config.set('basePath', window.location.origin + '/javascripts/ace');
    }
    
    var AceRange  = oAce.require('ace/range').Range;
    var AceSearch = oAce.require('ace/search').Search;
    
    return oHelpers.createClass(
    {
        // Ace info.
        _oAceEditor: null,
        _oAceEditSession: null,
        _oAceDocument: null,
        _sNewLineChar: '',
        
        /* Keep from sending too many selection change events. */
        _bApplyingDelta: false,
        _iNumDeltasBeingApplied: 0,
        _iSendSelEventTimeout: null,
        
        // State
        _oLastAceSelectionRange: null,
        _oAceMarkerIDMap: null,
        
        __type__: 'EditControl',
        
        __init__: function(sEditorID)
        {
            // Create ace editor.
            this._jEditorElem = $(sEditorID);
            this._oAceEditor = oAce.edit(sEditorID);
            this._oAceEditSession = this._oAceEditor.getSession();
            this._oAceDocument = this._oAceEditSession.getDocument();
            this._sNewLineChar = this._oAceDocument.getNewLineCharacter();
            
            // Set initial ace editor settings.
            this._oAceEditor.setFontSize(14);
            this._oAceEditor.setShowPrintMargin(false);
            this._oAceEditor.setReadOnly(IS_SNAPSHOT);
                
            // Attach Ace gotoline command to different shortcut
            this._oAceEditor.commands.bindKey('Ctrl-G|Command-G', 'gotoline');
            this._oAceEditor.commands.bindKey('Ctrl-L|Command-L', '');
            
            // Do not include white space in selection
            this._oAceEditor.setSelectionStyle('text');
            
            this._oLastAceSelectionRange = new AceRange(0, 0, 0, 0);
            
            // Init marker ID map (maps specified marker ID to ace Marker ID).
            this._oAceMarkerIDMap = {};
        },
            
        applyDelta: function(oNormDelta)
        {
            this._setApplyingDelta(true);
            var oAceDelta = this._denormalizeDelta(oNormDelta);
            this._oAceDocument.applyDeltas([oAceDelta]);
            this._setApplyingDelta(false);
        },
        
        setMode: function(oMode)
        {
            this._oAceEditSession.setMode(oMode.getPath());
        },
        
        setContent: function(aLines)
        {
            this._setApplyingDelta(true);
            this._oAceDocument.setValue(aLines.join(this._sNewLineChar));
            this._oAceEditor.moveCursorTo(0, 0);
            this._setApplyingDelta(false);
        },
        
        findRegex: function(oRegex)
        {
            var oSearch = new AceSearch();
            oSearch.set({needle: oRegex});
            var oAceRange = oSearch.find(this._oAceEditSession);
            if (oAceRange)
                return this._normalizeAceRange(oAceRange);
            else
                return null;
        },
        
        getLinesForRange: function(oNormRange)
        {
            var oAceRange = this._denormalizeRange(oNormRange);
            return this._oAceEditSession.getTextRange(oAceRange).split(this._sNewLineChar);
        },
        
        setSelectionRange: function(oNormRange)
        {
            var oAceRange = this._denormalizeRange(oNormRange);
            this._oAceEditor.getSelection().setSelectionRange(oAceRange);
        },
        
        getSelectionRange: function()
        {
            return this._normalizeAceRange(this._oAceEditor.getSelectionRange());
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

        setUseSoftTabs: function (bUseSoftTabs)
        {
            this._oAceEditSession.setUseSoftTabs(bUseSoftTabs);
        },

        setTabSize: function(iTabSize)
        {
            this._oAceEditSession.setTabSize(iTabSize);
        },

        setShowInvisibles: function(bShowInvisibles)
        {
            this._oAceEditor.setShowInvisibles(bShowInvisibles);
        },

        setUseWordWrap: function(bUseWordWrap)
        {
            this._oAceEditSession.setUseWrapMode(bUseWordWrap);
        },

        on: function(sEventType, oScope, fnCallback)
        {
            fnCallback = oHelpers.createCallback(oScope, fnCallback);
            switch (sEventType)
            {
                case 'docChange':
                    
                    // Notify on document changes.
                    this._oAceEditSession.getUndoManager().execute = oHelpers.createCallback(this, function(oEvent)
                    {
                        if (!this._bApplyingDelta)
                        {
                            // Get normalized deltas.
                            var aAceDeltas = oEvent.args[0][0].deltas;
                            var aNormDeltas = [];
                            for (var i in aAceDeltas)
                                aNormDeltas.push(this._normalizeAceDelta(aAceDeltas[i]));
                                
                            // Notify callback.
                            fnCallback(aNormDeltas);
                        }
                    });
                    
                    // Selection events are sent before and after document changes.
                    // We don't want to send any selection event in this case.
                    this._oAceEditor.on('change', oHelpers.createCallback(this, function(oEvent)
                    {
                        clearTimeout(this._iSendSelEventTimeout);                        
                    }));
                    break;
                
                case 'selChange':
                    this._oAceEditor.on('changeSelection', oHelpers.createCallback(this, function(oEvent)
                    {
                        var oAceSelectionRange = this._oAceEditor.getSelectionRange();
                        
                        // Ignore duplicate event.
                        var bIsDuplicateEvent = this._oLastAceSelectionRange.isEqual(oAceSelectionRange);
                        this._oLastAceSelectionRange = oAceSelectionRange;
                        if (bIsDuplicateEvent)
                            return;
                        
                        // Don't send selection event immediatly preceding this one.
                        // This is because ace gives us mulitple selection events in a row
                        // for most selection changes . . . one or more bogus ones followed by a
                        // good one.
                        if (this._iSendSelEventTimeout)
                            clearTimeout(this._iSendSelEventTimeout);
                        
                        // Send event.
                        var oNormRange = this._normalizeAceRange(oAceSelectionRange);
                        this._iSendSelEventTimeout = window.setTimeout(function()
                        {
                           fnCallback(oNormRange);
                        }, 1);
                    }));
                    break;
                
                case 'undo':
                    this._oAceEditor.commands.commands.undo.exec = oHelpers.createCallback(this, function()
                    {
                        fnCallback();
                    })
                    break;
                
                case 'redo':
                    this._oAceEditor.commands.commands.redo.exec = oHelpers.createCallback(this, function()
                    {
                        fnCallback();
                    })
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
                    return (
                    {
                        sAction: 'delete',
                        oRange: oNormRange,
                        aLines: oAceDelta.lines.concat([''])
                    });
                    
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
        },

        _setApplyingDelta: function(bApplyingDelta)
        {
            if (bApplyingDelta)
            {
                this._bApplyingDelta = true;
                this._iNumDeltasBeingApplied++;
            }
            else
            {
                window.setTimeout(oHelpers.createCallback(this, function()
                {
                    this._iNumDeltasBeingApplied--;
                    this._bApplyingDelta = (this._iNumDeltasBeingApplied > 0);
                }), 0);
            }
        }
    });
});
