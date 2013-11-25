define(function(require)
{
    // Dependencies.
    var $            = require('lib/jquery'),
        oHelpers     = require('helpers/helpers-web'),
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
                bMergeWithPrevChange: false,    // Applies to: normal | undo | redo
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
    return oHelpers.createClass(
    {
        _oSocket: null,
        _oEditControl: null,
    
        // Remote users.
        _oRemoteClients: null, // { userID: { sColor: '', oLastSelRange: null }, ...}    
    
        // OT Transform state.
        _iServerState: 0,
        _iNumPendingActions: 0,
        _aPastDocChanges: null, // Also used for undo/redo.
    
        __type__: 'Editor',    
    
        __init__: function(oSocket)
        {
            this._oSocket = oSocket;
            this._oRemoteClients = {};
            this._aPastDocChanges = [];
            
            // Attach socket.
            this._oSocket.bind('message', this, this._handleServerAction);
                    
            // Attach events.
            this._oEditControl = new EditControl(EDITOR_ID);
            this._oEditControl.on('docChange', this, this._onDocumentChange);
            this._oEditControl.on('selChange', this, this._onSelectionChange);
            this._oEditControl.on('undo',      this, this._onUndo);
            this._oEditControl.on('redo',      this, this._onRedo);
            
            // Update status bar.
            this._setPeopleViewing();
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
            return jElem.closest('#' + EDITOR_ID).length > 0;
        },
    
        focus: function()
        {
            this._oEditControl.focus();
        },
        
        // Called by workspace, but not needed.
        onBlur: function()  {},
        onEvent: function() {},
    
        setContent: function(aLines)
        {
            this._oEditControl.setContent(aLines);
        },
    
        _handleServerAction: function(oAction)
        {
            switch(oAction.sType)
            {
                case 'setDocumentData': // Fired after opening an existing document.
                    this._iServerState = oAction.oData.iServerState;
                    this.setContent(oAction.oData.aLines);
                    break;
                
                case 'setRemoteSelection':
                    
                    // Tranform range to reflect local changes.
                    var aPendingDocChanges = this._getPendingDocChanges();
                    for (var i in aPendingDocChanges)
                        oAction.oData.oRange = oOT.transformRange(aPendingDocChanges[i].get('oDelta'), oAction.oData.oRange);
                    
                    // Save remote selection range and refresh.
                    var sClientID = oAction.oData.sClientID;
                    this._oRemoteClients[sClientID].oLastSelRange = oAction.oData.oRange;
                    this._refreshRemoteSelections();
                    break;
                
                case 'docChange':
                    
                    // Store server state.
                    this._iServerState = oAction.oData.iServerState;
                    
                    // Revert pending changes.
                    var aPendingDocChanges = this._getPendingDocChanges(true /*remove*/);
                    for(var i = aPendingDocChanges.length - 1; i >= 0; i--)
                        this._applyDelta(this._getReversedDelta(aPendingDocChanges[i].get('oDelta')));
                    
                    // Apply new delta.
                    this._applyDelta(oAction.oData.oDelta);
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
                        oDelta.oRange = oOT.transformRange(oAction.oData.oDelta, oDelta.oRange);
                        this._applyDelta(oDelta);
                        this._aPastDocChanges.push(oPendingDocChange);
                    }
                    
                    // Refresh remote cursors.
                    this._refreshRemoteSelections();
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
        
        _onSelectionChange: function(oRange, bCausedByDocChange)
        {
            if (!bCausedByDocChange)
            {
                this._oSocket.send('setSelection',
                {
                    oRange: oRange,
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
            // Default type.
            sType = sType || 'normal';
            
            // Process deltas.
            for (var i in aDeltas)
            {
                // Should merge with previous action for undo history?
                var oDelta = aDeltas[i];
                if (i > 0)
                {
                    // If we're given multiple deltas at once, undo them together.
                    var bMergeWithPrevChange = true;
                }
                else
                {
                    // Get previous change.
                    var oPrevChange = null;
                    for (var i_ = this._aPastDocChanges.length - 1; i_ >= 0; i_--)
                    {
                        var oDocChange = this._aPastDocChanges[i_];
                        if (oDocChange.get('bIsMe'))
                        {
                            oPrevChange = oDocChange;
                            break;
                        }
                    }
                    
                    // Should merge?
                    bMergeWithPrevChange = oPrevChange !== null && oPrevChange.get('sType') == 'normal' && sType == 'normal' &&
                                           oPrevChange.get('oDelta').sAction            == oDelta.sAction &&
                                           oPrevChange.get('oDelta').oRange.oStart.iRow == oDelta.oRange.oStart.iRow &&
                                           oPrevChange.get('oDelta').oRange.oEnd.iRow   == oDelta.oRange.oEnd.iRow &&
                                           // Don't merge pastes. Hack: We chose 2 chars instead of 1 because if you hit two keys at the same time ACE gives one event.
                                           oPrevChange.get('oDelta').aLines[0].length <= 2 &&
                                           oDelta.aLines[0].length <= 2;
                }
                
                // Handle change.
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
                    sType:  sType,
                    bMergeWithPrevChange: bMergeWithPrevChange,
                }));
                this._iNumPendingActions++;
            }
            this._refreshRemoteSelections();
        },
        
        _onUndo: function()
        {
            // Get changes to undo (reverse order).
            var aDocChangesOffset = [];
            for (var iPastDocChange = this._aPastDocChanges.length - 1; iPastDocChange >=0; iPastDocChange--)
            {
                var oDocChange = this._aPastDocChanges[iPastDocChange];
                if ( oDocChange.get('bIsMe') && oDocChange.get('sType') != 'undo' && !oDocChange.get('bHasBeenUndone'))
                {
                    aDocChangesOffset.push(iPastDocChange);
                    if (!oDocChange.get('bMergeWithPrevChange'))
                        break;
                }
            }
            
            // Undo Changes.
            var aReverseDeltas = [];
            for (var i_ in aDocChangesOffset)
            {
                iPastDocChange = aDocChangesOffset[i_];
                var oDocChange = this._aPastDocChanges[iPastDocChange];
                
                // Create reverse delta.
                var oReverseDelta = this._getReversedDelta(oDocChange.get('oDelta'));
                for (var i = iPastDocChange + 1; i < this._aPastDocChanges.length; i++)
                {
                    var oOTDocChange = this._aPastDocChanges[i];
                    if (!oOTDocChange.get('bIsMe'))
                        oReverseDelta.oRange = oOT.transformRange(oOTDocChange.get('oDelta'), oReverseDelta.oRange);
                }
                
                // Apply undo delta.
                aReverseDeltas.push(oReverseDelta);
                this._applyDelta(oReverseDelta);
                oDocChange.set('bHasBeenUndone', true);
                
                // Refresh cursors.
                this._refreshRemoteSelections();
                this._moveLocalCursorToDeltaEnd(oReverseDelta);
            }

            this._onDocumentChange(aReverseDeltas, 'undo');
        },
        
        _onRedo: function()
        {
            // Get changes to undo (reverse order).
            var aDocChangesOffset = [];
            for (var iPastDocChange = this._aPastDocChanges.length - 1; iPastDocChange >=0; iPastDocChange--)
            {    
                var oDocChange = this._aPastDocChanges[iPastDocChange];
                if (oDocChange.get('bIsMe'))
                {                    
                    // Skip redo events.
                    if (oDocChange.get('sType') == 'redo')
                        continue;
                                        
                    // Stop if my last event was not an undo.
                    if (oDocChange.get('sType') != 'undo')
                        break;
                    
                    // Skip undo events that have already been redone.
                    if (oDocChange.get('bHasBeenRedone'))
                        continue;
                        
                    aDocChangesOffset.push(iPastDocChange);
                    if (!oDocChange.get('bMergeWithPrevChange'))
                        break;
                }
            }
            
            // Redo changes.
            var aReverseDeltas = [];
            for (var i_ in aDocChangesOffset)
            {
                iPastDocChange = aDocChangesOffset[i_];
                var oDocChange = this._aPastDocChanges[iPastDocChange];
                
                // Create reverse delta.
                var oReverseDelta = this._getReversedDelta(oDocChange.get('oDelta'));
                for (var i = iPastDocChange + 1; i < this._aPastDocChanges.length; i++)
                {
                    var oOTDocChange = this._aPastDocChanges[i];
                    if (!oOTDocChange.get('bIsMe'))
                        oReverseDelta.oRange = oOT.transformRange(oOTDocChange.get('oDelta'), oReverseDelta.oRange);
                }
                
                // Apply redo delta.
                aReverseDeltas.push(oReverseDelta);
                this._applyDelta(oReverseDelta);
                oDocChange.set('bHasBeenRedone', true);
                
                // Refresh cursors.
                this._refreshRemoteSelections();
                this._moveLocalCursorToDeltaEnd(oReverseDelta);
            }
            
            this._onDocumentChange(aReverseDeltas, 'redo');
        },
        
        _transformRemoteSelections: function(oDelta)
        {
            for (var sClientID in this._oRemoteClients)
            {
                var oClient = this._oRemoteClients[sClientID];
                if (oClient.oLastSelRange)
                    oClient.oLastSelRange = oOT.transformRange(oDelta, oClient.oLastSelRange);
            }
        },
        
        _refreshRemoteSelections: function()
        {
            for (var sClientID in this._oRemoteClients)
            {
                var oClient = this._oRemoteClients[sClientID];
                if (oClient.oLastSelRange)
                    this._oEditControl.setSelectionMarker(oClient.oLastSelRange, sClientID, oClient.sColor);
            }
        },
        
        _moveLocalCursorToDeltaEnd: function(oDelta)
        {
            var oPoint = (oDelta.sAction == 'insert' ? oDelta.oRange.oEnd : oDelta.oRange.oStart);
            this._oEditControl.moveCursorToPoint(oPoint);
        },
        
        _applyDelta: function(oDelta)
        {
            this._oEditControl.applyDelta(oDelta);
            this._transformRemoteSelections(oDelta);
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
        }
    });
});
