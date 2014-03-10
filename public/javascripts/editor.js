define(function(require)
{
    // Dependencies.
    // Requires jQuery.
    var oHelpers     = require('helpers/helpers-web'),
        oUIDispatch  = require('helpers/ui-dispatch'),
        EditControl  = require('edit-control/edit-control'),
        oOT          = require('OT');
    
    // Constants.
    var COLORS     = ['green', 'pink', 'orange', 'purple', 'red', 'turquoise '];
    var EDITOR_ID  = 'edit';
    
    // DocChange object.
    var DocChange = oHelpers.createClass(
    {
        _oData: null,
        
        __type__: 'DocChange',
        __init__: function(oData)
        {   
            this._oData =
            {
                // General
                bIsMe:                false,
                oDelta:               null,
                
                // Undo & Redo (Applies only to my changes)
                sType:                'normal', // normal | undo | redo
                bGroupUndo:           false,    // Applies to: normal | undo | redo
                sGroupID:             '',
                bHasBeenUndone:       false,    // Applies to: normal |      | redo
                bHasBeenRedone:       false     // Applies to: undo 
            };
            
            // Set data.
            for (var sKey in oData)
                this.set(sKey, oData[sKey], true /* bSkipValidate*/);
            this._validate();
        },
        
        get: function(sKey)
        {
            if (sKey in this._oData)
                return this._oData[sKey];
            oHelpers.assert(false, 'Key not found: ' + sKey);
            return null;
        },
        
        set: function(sKey, oValue, bSkipValidate)
        {
            // Validate type.
            oHelpers.assert(sKey in this._oData,                       'Key not found: '          + sKey);
            oHelpers.assert(typeof oValue == typeof this._oData[sKey], 'Invalid type for key: '   + sKey);
            
            // Set.
            this._oData[sKey] = oValue;
            
            // Validate values.
            if (!bSkipValidate)
                this._validate();
        },
        
        _validate: function()
        {
            oHelpers.assert( this.get('sType') == 'normal' ||  this.get('bIsMe')             , 'DocChange Error 1' );
            oHelpers.assert( this.get('sType') != 'undo'   || !this.get('bHasBeenUndone')    , 'DocChange Error 2' );
            oHelpers.assert( this.get('sType') == 'undo'   || !this.get('bHasBeenRedone')    , 'DocChange Error 3' );
            oHelpers.assert( oHelpers.inArray(this.get('sType'), ['normal', 'undo', 'redo']) , 'DocChange Error 5' );
        }
    });
    
    // Editor object.
    return (
    {
        _oSocket: null,
        _oEditControl: null,
        
        // Remote users.
        _oRemoteClients: null, // { userID: { sColor: '', oLastSelRange: null }, ...}    
        
        // OT Transform state.
        _iServerState: 0,
        _iNumPendingActions: 0,
        _aPastDocChanges: null, // Also used for undo/redo.
        
        // UI Handerl Property
        bEscTo: true,
        
        // Other
        _oCurSelectionRange: null,
        
        init: function(oSocket)
        {
            this._oSocket = oSocket;
            this._oRemoteClients = {};
            this._aPastDocChanges = [];
            
            // Attach socket.
            this._oSocket.bind('message', this, this._handleServerAction);
            
            oUIDispatch.registerUIHandler(this);
                    
            // Attach events.
            this._oEditControl = new EditControl(EDITOR_ID);
            this._oEditControl.on('docChange', this, this._onDocumentChange);
            this._oEditControl.on('selChange', this, this._onSelectionChange);
            this._oEditControl.on('undo',      this, this._onUndo);
            this._oEditControl.on('redo',      this, this._onRedo);
            
            $('.status-item').on('blur', oHelpers.createCallback(this, this.onEvent));
            
            // Update status bar.
            this._setPeopleViewing();
            
            // Set initial selection.
            this._oCurSelectionRange = (
            {
                oStart: {iRow: 0, iCol: 0},
                oEnd:   {iRow: 0, iCol: 0}
            });
        },
        
        setMode: function(oMode)
        {
            this._oEditControl.setMode(oMode);
        },
        
        resize: function()
        {
            this._oEditControl.resize();
        },
        
        contains: function(jElem)
        {
            return jElem.closest('#' + EDITOR_ID + ', #edit-status-bar').length > 0;
        },
    
        focus: function()
        {
            this._oEditControl.focus();
        },
        
        // Called by workspace, but not needed.
        onBlur: function()  {},
        
        onEvent: function(oEvent)
        {
            var jTarget = $(oEvent.target);
            var jStatusItem = jTarget.closest('.status-item');
            var jStatusOption = jTarget.is('.status-item-option') ? jTarget : null;
            
            switch (oEvent.type)
            {
                case 'click':
                    if (jStatusItem && !jStatusOption) // Click on the menu title
                    {
                        if (jStatusItem.hasClass('open'))
                        {
                            jStatusItem.removeClass('open');
                            this._oEditControl.focus();
                        }
                        else if (jStatusItem.attr('tabindex') == "0")
                        {
                            jStatusItem.addClass('open');
                            jStatusItem.focus();
                        }
                    }
                    else if (jStatusOption && jStatusOption) // Click on a menu option
                    {
                        jStatusItem.removeClass('open');
                        this._onStatusBarChange(jStatusItem, jTarget.text());
                    }
                    break;
                    
                case 'blur':
                    if (jStatusItem && jStatusItem.hasClass('open'))
                    {
                        jStatusItem.removeClass('open');
                    }
                    break;
                    
                case 'keydown':
                    
                    if (oEvent.which == 27) // ESC
                    {
                        jStatusItem.removeClass('open');
                        this._oEditControl.focus();
                    }
                    break;
            }
        },
        
        setContent: function(aLines)
        {
            this._oEditControl.setContent(aLines);
        },
        
        getAllLines: function()
        {
            return this._oEditControl.getAllLines();
        },
        
        insertLines: function(aInsertLines)
        {
            var iInsertLastRow  = aInsertLines.length - 1;
            var iInsertLastCol  = aInsertLines[iInsertLastRow].length;
            var oInsertDelta =
            {
                sAction: 'insert',
                oRange:
                {
                    oStart: { iRow: 0,              iCol: 0              },
                    oEnd:   { iRow: iInsertLastRow, iCol: iInsertLastCol }
                },
                aLines: aInsertLines
            };
            this._applyDelta(oInsertDelta, true);
            this._onDocumentChange([oInsertDelta]);
            this._moveLocalCursorToDeltaEnd(oInsertDelta);
        },
        
        replaceRegex: function(oRegex, sLine)
        {
            var oReplaceRange = this._oEditControl.findRegex(oRegex);
            oHelpers.assert(sLine.indexOf('\n') == -1, 'sLine should not contain a new line.');
            if (oReplaceRange)
            {
                oHelpers.assert(oReplaceRange.oStart.iRow == oReplaceRange.oEnd.iRow);
                var oDeleteDelta =
                {
                    sAction: 'delete',
                    oRange: oReplaceRange,
                    aLines: this._oEditControl.getLinesForRange(oReplaceRange)
                };
                var oInsertDelta =
                {
                    sAction: 'insert',
                    oRange:
                    {
                        oStart:
                        {
                            iRow: oReplaceRange.oStart.iRow,
                            iCol: oReplaceRange.oStart.iCol
                        },
                        oEnd:
                        {
                            iRow: oReplaceRange.oStart.iRow,
                            iCol: oReplaceRange.oStart.iCol + sLine.length
                        },
                    },
                    aLines: [sLine]
                }
                this._applyDelta(oDeleteDelta, true);
                this._applyDelta(oInsertDelta, true);
                this._onDocumentChange([oDeleteDelta, oInsertDelta]);                
            }
        },
        
        _handleServerAction: function(oAction)
        {
            switch(oAction.sType)
            {
                case 'setDocumentData': // Fired after opening an existing document.
                    this._iServerState = oAction.oData.iServerState;
                    this.setContent(oAction.oData.aLines);
                    this._setUseSoftTabs(oAction.oData.bUseSoftTabs);
                    this._setTabSize(oAction.oData.iTabSize);
                    this._setShowInvisibles(oAction.oData.bShowInvisibles);
                    this._setUseWordWrap(oAction.oData.bUseWordWrap);
                    break;
                
                case 'setRemoteSelection':
                    
                    // Tranform range to reflect local changes.
                    var aPendingDocChanges = this._getPendingDocChanges();
                    for (var i in aPendingDocChanges)
                        oOT.transformRange(aPendingDocChanges[i].get('oDelta'), oAction.oData.oRange);
                    
                    // Save remote selection range and refresh.
                    var oClient = this._oRemoteClients[oAction.oData.sClientID];
                    oClient.oLastSelRange = oAction.oData.oRange;
                    this._refreshRemoteSelection(oClient);
                    break;
                
                case 'docChange':
                    
                    // Store server state.
                    this._iServerState = oAction.oData.iServerState;
                    
                    // Revert pending changes.
                    var aPendingDocChanges = this._getPendingDocChanges(true /*remove*/);
                    for(var i = aPendingDocChanges.length - 1; i >= 0; i--)
                        this._applyDelta(this._getReversedDelta(aPendingDocChanges[i].get('oDelta')), true);
                    
                    // Apply new delta.
                    this._applyDelta(oAction.oData.oDelta, false, oAction.oData.sClientID);
                    this._aPastDocChanges.push(new DocChange(
                    {
                        bIsMe: false,
                        oDelta: oAction.oData.oDelta
                    }));
                    
                    // Transform and re-apply pending change.
                    for (i in aPendingDocChanges)
                    {
                        var oPendingDocChange = aPendingDocChanges[i];
                        var oDelta = oPendingDocChange.get('oDelta');
                        oOT.transformDelta(oAction.oData.oDelta, oDelta);
                        this._applyDelta(oDelta, true);
                        this._aPastDocChanges.push(oPendingDocChange);
                    }
                    break;
                    
                case 'eventReciept':
                    this._iServerState = oAction.oData.iServerState;
                    oHelpers.assert(this._iNumPendingActions > 0, 'No pending action found for "eventReceipt".');
                    this._iNumPendingActions--;
                    break;
                    
                case 'addClient':
                    
                    // Store client info.
                    var iNumClients = Object.keys(this._oRemoteClients).length;
                    this._oRemoteClients[oAction.oData.sClientID] =
                    {
                        sID: oAction.oData.sClientID,
                        sColor: iNumClients <= COLORS.length ? COLORS[iNumClients] : 'black',
                        oLastSelRange: null,
                        aAceMarkersIDs: []
                    }
                    
                    // Update pople viewing.
                    this._setPeopleViewing();
                    break;
                    
                case 'removeClient':
                    this._oEditControl.removeSelectionMarker(oAction.oData.sClientID);
                    delete this._oRemoteClients[oAction.oData.sClientID];
                    this._setPeopleViewing();
                    break;
                    
                case 'setUseSoftTabs':
                    this._setUseSoftTabs(oAction.oData.bUseSoftTabs);
                    break;
                    
                case 'setTabSize':
                    this._setTabSize(oAction.oData.iTabSize);
                    break;
                    
                case 'setShowInvisibles':
                    this._setShowInvisibles(oAction.oData.bShowInvisibles);
                    break;
                    
                case 'setUseWordWrap':
                    this._setUseWordWrap(oAction.oData.bUseWordWrap);
                    break;
                    
                default:
                    return false;
            }
            return true;
        },
        
        _setPeopleViewing: function()
        {
            var iNumViewers = Object.keys(this._oRemoteClients).length;
            var sText = iNumViewers + ' other' + (iNumViewers == 1 ? '' : 's');
            $('#num-viewing').text(sText)
                             .toggleClass('others-viewing', iNumViewers > 0);
        },
        
        _onSelectionChange: function(oRange)
        {
            if (!oHelpers.objDeepEquals(this._oCurSelectionRange, oRange))
            {
                // Update stored selection.
                this._oCurSelectionRange = oRange;
                
                // Broadcast change to other clients.
                this._oSocket.send('setSelection',
                {
                    oRange: this._oCurSelectionRange,
                    iState: this._iServerState /*, TOOD:
                    sFocusEnd: 'start' or 'end'*/
                });                
            }
            
            // Update current col and row (1-based).
            $('#line-num').text(oRange.oStart.iRow + 1);
            $('#col-num').text(oRange.oStart.iCol + 1);
        },
        
        _onDocumentChange: function(aDeltas, sType)
        {
            var bGroupUndo = aDeltas.length > 1;
            var sGroupID = String(Math.round(Math.random() * 10000000000));
            for (var i = 0; i < aDeltas.length; i++)
            {
                // Handle change.
                var oDelta = aDeltas[i];
                this._oSocket.send('docChange',
                {
                    oDelta: oDelta,
                    iState: this._iServerState
                });
                this._transformRemoteSelections(oDelta);
                
                // Record change.
                this._aPastDocChanges.push(new DocChange(
                {
                    bIsMe:  true,
                    oDelta: oDelta,
                    sType:  sType || 'normal',
                    bGroupUndo: bGroupUndo,
                    sGroupID: sGroupID
                }));
                this._iNumPendingActions++;
                
                // Transform locally stored range.
                // If we didn't do this, _onSelectionChange would unnecessarily
                // send selection change events after normal actions.
                oOT.transformRange(oDelta, this._oCurSelectionRange, true);
            }            
        },
        
        _onUndo: function()
        {
            // Create reverse delta.
            var aUndoDeltas = [];
            var oLastDocChange = null;
            for (var i = this._aPastDocChanges.length - 1; i >=0; i--)
            {
                // Skip.
                var oDocChange = this._aPastDocChanges[i];
                if ( !oDocChange.get('bIsMe') || oDocChange.get('sType') == 'undo' || oDocChange.get('bHasBeenUndone'))
                    continue;
                    
                // Group undos should be undone by themselves.
                if (oLastDocChange && (
                    oDocChange.get('bGroupUndo') != oLastDocChange.get('bGroupUndo') || (
                    oDocChange.get('bGroupUndo') &&
                    oDocChange.get('sGroupID') != oLastDocChange.get('sGroupID'))))
                {
                    break;
                }
                
                // 1. Always undo "redo" deltas by themselves.
                // 2. Always undo multi-character deltas by themselves.
                // 3. Never undo an 'insert' delta together with a 'delete' delta.
                if (oLastDocChange && !oDocChange.get('bGroupUndo') && (
                    oLastDocChange.get('sType') == 'redo' ||
                        oDocChange.get('sType') == 'redo' ||
                    oLastDocChange.get('oDelta').sAction != oDocChange.get('oDelta').sAction ||
                    oLastDocChange.get('oDelta').aLines.length    > 1 ||
                        oDocChange.get('oDelta').aLines.length    > 1 ||
                    oLastDocChange.get('oDelta').aLines[0].length > 1 || 
                        oDocChange.get('oDelta').aLines[0].length > 1
                ))
                {
                    break;
                }
                
                // Update reversed delta via OT.
                var oReversedDelta = this._getReversedDelta(oDocChange.get('oDelta'));
                for (var _i = i + 1; _i < this._aPastDocChanges.length; _i++)
                {
                    var oOTDocChange = this._aPastDocChanges[_i];
                    oOT.transformDelta(oOTDocChange.get('oDelta'), oReversedDelta, oOTDocChange.get('bIsMe'));
                }
                for (_i in aUndoDeltas)
                    oOT.transformDelta(aUndoDeltas[_i], oReversedDelta, true);
                
                // Undo?
                if (oDocChange.get('bGroupUndo'))
                {
                    aUndoDeltas.push(oReversedDelta);
                }
                else
                {
                    var oUndoDelta = aUndoDeltas.length ? aUndoDeltas[0] : null;
                    if (oUndoDelta)
                    {
                        // Undo consecutive actions.
                        // Merge for efficiency.
                        if (oHelpers.objDeepEquals(oReversedDelta.oRange.oEnd, oUndoDelta.oRange.oStart))
                        {
                            oUndoDelta.oRange.oStart.iCol = oReversedDelta.oRange.oStart.iCol;
                            oUndoDelta.aLines[0] = oReversedDelta.aLines[0] + oUndoDelta.aLines[0];
                        }
                        else if(oHelpers.objDeepEquals(oReversedDelta.oRange.oStart, oUndoDelta.oRange.oEnd))
                        {
                            oUndoDelta.oRange.oEnd.iCol = oReversedDelta.oRange.oEnd.iCol;
                            oUndoDelta.aLines[0] += oReversedDelta.aLines[0];
                        }
                        else
                        {
                            break; // Non-contiguous delta.
                        }
                    }
                    else
                    {
                        // Always undo most recent action.
                        aUndoDeltas.push(oReversedDelta);
                    }
                }
                
                // Mark undone.
                oLastDocChange = oDocChange;
                oDocChange.set('bHasBeenUndone', true);
            }
            
            // Apply undo deltas.
            if (aUndoDeltas.length)
            {
                for (i in aUndoDeltas)
                    this._applyDelta(aUndoDeltas[i], true);
                this._moveLocalCursorToDeltaEnd(aUndoDeltas[aUndoDeltas.length - 1]);
                this._onDocumentChange(aUndoDeltas, 'undo');
            }
        },
        
        _onRedo: function()
        {
            // Get changes to redo.
            var aRedoDeltas = [];
            var oLastDocChange = null;
            for (var i = this._aPastDocChanges.length - 1; i >=0; i--)
            {
                // Skip.
                var oDocChange = this._aPastDocChanges[i];
                if (!oDocChange.get('bIsMe') || oDocChange.get('sType') == 'redo' || oDocChange.get('bHasBeenRedone'))
                    continue;
                
                // Stop when nothing left to redo.
                if (oDocChange.get('sType') == 'normal')
                    break;
                
                // Redo one group only.
                if (oLastDocChange && oDocChange.get('sGroupID') != oLastDocChange.get('sGroupID'))
                    break;
                
                // Redo.
                oReversedDelta = this._getReversedDelta(oDocChange.get('oDelta'));
                for (var _i = i + 1; _i < this._aPastDocChanges.length; _i++)
                {
                    var oOTDocChange = this._aPastDocChanges[_i];
                    oOT.transformDelta(oOTDocChange.get('oDelta'), oReversedDelta, oOTDocChange.get('bIsMe'));
                }
                for (var _i in aRedoDeltas)
                    oOT.transformDelta(aRedoDeltas[_i], oReversedDelta, true);
                
                // Mark redone.
                oDocChange.set('bHasBeenRedone', true);
                aRedoDeltas.push(oReversedDelta);
                oLastDocChange = oDocChange;
            }
            
            // Apply redo delta.
            if (aRedoDeltas.length)
            {
                for (var i in aRedoDeltas)
                    this._applyDelta(aRedoDeltas[i], true);
                this._moveLocalCursorToDeltaEnd(aRedoDeltas[aRedoDeltas.length - 1]);
                this._onDocumentChange(aRedoDeltas, 'redo');
            }
        },
        
        _transformRemoteSelections: function(oDelta, sOptionalRemoteClientID)
        {
            for (var sClientID in this._oRemoteClients)
            {
                var oClient = this._oRemoteClients[sClientID];
                if (oClient.oLastSelRange)
                {
                    var bPushEqualPoints = (sClientID == sOptionalRemoteClientID); // Always push a client's own selection.
                    oOT.transformRange(oDelta, oClient.oLastSelRange, sClientID == sOptionalRemoteClientID);
                    this._refreshRemoteSelection(oClient);
                }
            }
        },
        
        _refreshRemoteSelection: function(oClient)
        {
            if (oClient.oLastSelRange)
                this._oEditControl.setSelectionMarker(oClient.oLastSelRange, oClient.sID, oClient.sColor);
        },
        
        _moveLocalCursorToDeltaEnd: function(oDelta)
        {
            // Move cursor.
            var oPoint = (oDelta.sAction == 'insert' ? oDelta.oRange.oEnd : oDelta.oRange.oStart);
            var oSelRange =
            {
                oStart: oPoint,
                oEnd: oHelpers.deepCloneObj(oPoint)
            }
            this._oEditControl.setSelectionRange(oSelRange);
        },
        
        _applyDelta: function(oDelta, bIsMe, sOptionalRemoteClientID)
        {
            // Validate params.
            oHelpers.assert(bIsMe  ||  sOptionalRemoteClientID, 'Invalid param: It\'s got to be me or someone.');
            oHelpers.assert(!bIsMe || !sOptionalRemoteClientID, 'Invalid param: It can\'t be me AND someone else.');
            
            // Save local selection range.
            var oSelRange = this._oEditControl.getSelectionRange();
            
            /* Apply delta.
             * NOTE: _applyDelta does NOT trigger a `change` event since we don't
             *       want to re-broadcast changes resulting from a remote client's
             *       change.
             *
             *       If you need to broadcast changes after applying a local change,
             *       call _onDocumentChange manually after calling _applyDelta.
             *
             *       This differs from setSelectionRange, which does trigger the 'selChange'
             *       event. setSelectionRange is different because we don't share a selection
             *       with remote clients.
             **/
            this._oEditControl.applyDelta(oDelta);
            
            // Transform local selection.
            oOT.transformRange(oDelta, oSelRange, bIsMe /* Push equal points */);
            this._oEditControl.setSelectionRange(oSelRange);
            
            // Transform remote selections.
            this._transformRemoteSelections(oDelta, sOptionalRemoteClientID);    
        },
        
        _getReversedDelta: function(oDelta)
        {
            var oInverseDelta = oHelpers.deepCloneObj(oDelta);
            oInverseDelta.sAction = (oDelta.sAction == 'insert' ? 'delete' : 'insert');
            return oInverseDelta;
        },
        
        _getPendingDocChanges: function(bRemove)
        {
            var aPending = [];
            for (var i = this._aPastDocChanges.length - 1; i >=0 && aPending.length < this._iNumPendingActions;  i--)
            {
                var oDocChange = this._aPastDocChanges[i];
                if (oDocChange.get('bIsMe'))
                {
                    aPending.splice(0, 0, oDocChange);
                    if (bRemove)
                        this._aPastDocChanges.splice(i, 1);
                }
            }
            oHelpers.assert(aPending.length == this._iNumPendingActions, 'Pending change not found.');
            return aPending;
        },

        _setUseSoftTabs: function(bUseSoftTabs)
        {
            if (bUseSoftTabs)
                $('#indent-mode .status-value').text('Soft');
            else
                $('#indent-mode .status-value').text('Hard');
                
            this._oEditControl.setUseSoftTabs(bUseSoftTabs);
        },
        
        _setTabSize: function(iTabSize)
        {
            $('#tab-size .status-value').text(iTabSize);
            
            this._oEditControl.setTabSize(iTabSize);
        },
        
        _setShowInvisibles: function(bShowInvisibles)
        {
            $('#show-invisibles .status-value').text(bShowInvisibles ? 'Yes' : 'No');
            this._oEditControl.setShowInvisibles(bShowInvisibles);
        },
        
        _setUseWordWrap: function(bUseWordWrap)
        {
            $('#use-word-wrap .status-value').text(bUseWordWrap ? 'On' : 'Off');
            this._oEditControl.setUseWordWrap(bUseWordWrap);
        },
        
        _onStatusBarChange: function(jItem, sValue)
        {
            switch (jItem.attr('id'))
            {
                case 'indent-mode':
                    var bUseSoftTabs = sValue == 'Soft';
                    this._setUseSoftTabs(bUseSoftTabs);
                
                    this._oSocket.send('setUseSoftTabs', {bUseSoftTabs: bUseSoftTabs});
                    break;
                
                case 'tab-size': 
                    var iTabSize = parseInt(sValue);
                    this._setTabSize(iTabSize);
                    
                    this._oSocket.send('setTabSize', {iTabSize: iTabSize});
                    break;
                    
                case 'show-invisibles':
                    var bShowInvisibles = sValue == 'Yes';
                    this._setShowInvisibles(bShowInvisibles);
                    
                    this._oSocket.send('setShowInvisibles', {bShowInvisibles: bShowInvisibles});
                    break;
                    
                case 'use-word-wrap':
                    var bUseWordWrap = sValue == 'On';
                    this._setUseWordWrap(bUseWordWrap);
                    
                    this._oSocket.send('setUseWordWrap', {bUseWordWrap: bUseWordWrap});
                    break;
                    
                default:
                    oHelpers.assert(false, 'Could not apply the change for the status bar item "' + jItem.attr('id') + '".');
            }
        }
    });
});
