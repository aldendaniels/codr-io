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
        _oConstants: null,
        _oVariables: null,
        
        __type__: 'DocChange',
        __init__: function(oData)
        {   
            this._oConstants =
            {
                bIsMe:               false,
                oDelta:              null,
                sType:               'normal', // normal | undo | redo
                bUndoWithPrevChange: false
            };
            this._oVariables =
            {
                bIsPending:          false,
                bHasBeenRedone:      false, // Undo events only
                bHasBeenUndone:      false, // NOT undo events
            };
            
            // Set constants.
            for (var sKey in oData)
            {
                if (sKey in this._oConstants)
                    this._setConstant(sKey, oData[sKey]);
            }
                
            // Validate constants.
            var sType = this._oConstants.sType;
            oHelpers.assert(sType == 'normal' || this._oConstants.bIsMe                , 'DocChange Error 1');
            oHelpers.assert(sType == 'normal' || !this._oConstants.bUndoWithPrevChange , 'DocChange Error 2');
            oHelpers.assert(oHelpers.inArray(sType, ['normal', 'undo', 'redo'])        , 'DocChange Error 3');
            
            // Remove non-applicable variables.
            if (this._oConstants.bIsMe)
            {                
                if (sType == 'undo')
                    delete this._oVariables.bHasBeenUndone;
                else
                    delete this._oVariables.bHasBeenRedone;
            }
            else
                this._oVariables = {};
            
            // Set variables.
            for (var sKey in oData)
            {
                if (!sKey in this._oConstants)
                    this.set(sKey, oData[sKey]);
            }
        },
        
        set: function(sVariable, oValue)
        {
            oHelpers.assert(sVariable in this._oVariables,                       'Variable not found: '        + sVariable);
            oHelpers.assert(typeof oValue == typeof this._oVariables[sVariable], 'Variable has invalid type: ' + sVariable);
            this._oVariables[sVariable] = oValue;
        },
        
        get: function(sKey)
        {
            if (sKey in this._oConstants)
                return this._oConstants[sKey];
            else if (sKey in this._oVariables)
                return this._oVariables[sKey];
            else
            {
                oHelpers.assert(false, 'Key not found: ' + sKey);
                return null;
            }
        },
        
        _setConstant: function(sConstant, oValue)
        {
            oHelpers.assert(sConstant in this._oConstants,                       'Constant not found: '        + sConstant);
            oHelpers.assert(typeof oValue == typeof this._oConstants[sConstant], 'Constant has invalid type: ' + sConstant);
            this._oConstants[sConstant] = oValue;            
        },
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
            this._oEditControl.on('undo', this, this._onUndo);
            this._oEditControl.on('redo', this, this._onRedo);
            
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
            return jElem.closest('#' + EDITOR_ID).length > 0 || jElem.closest(this._jSummaryBar).length > 0;
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
                    
                    // Tranform range to reflect local deltas.
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
                    
                    // Revert pending deltas.
                    var aPendingDocChanges = this._getPendingDocChanges(true /*remove*/);
                    for(var i = aPendingDocChanges.length - 1; i >= 0; i--)
                        this._applyDelta(this._getReversedDelta(aPendingDeltas[i].get('oDelta')));
                    
                    // Apply new delta.
                    this._applyDelta(oAction.oData.oDelta);
                    this._aPastDocChanges.push(new DocChange(
                    {
                        bIsMe: false,
                        oDelta: oAction.oData.oDelta
                    }));
                    
                    // Transform and apply pending tranformed deltas.
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
                    var iFirstPendingDocChangeOffset = this._getFirstPendingDocChangeOffset();
                    if (iFirstPendingDocChangeOffset)
                        this._aPastDocChanges[iFirstPendingDocChangeOffset].set('bIsPending', false);              
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
                    var bUndoWithPrevChange = true;
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
                    bUndoWithPrevChange = oPrevChange !== null && 
                                          oPrevChange.get('sType') == 'normal' && sType == 'normal' &&
                                          oPrevChange.get('oDelta').sAction == oDelta.sAction &&
                                          oPrevChange.get('oDelta').aLines.length == 1;
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
                    bUndoWithPrevChange: bUndoWithPrevChange,
                    bIsPending: true
                }));
            }
            this._refreshRemoteSelections();
        },
        
        _onUndo: function()
        {
            for (var iPastDocChange = this._aPastDocChanges.length - 1; iPastDocChange >=0; iPastDocChange--)
            {
                var oDocChange = this._aPastDocChanges[iPastDocChange];
                if (oDocChange.get('bIsMe') && oDocChange.get('sType') != 'undo' && !oDocChange.get('bHasBeenUndone'))
                {
                    // Create reverse delta.
                    var oReverseDelta = this._getReversedDelta(oDocChange.get('oDelta'));
                    for (var i = iPastDocChange + 1; i < this._aPastDocChanges.length; i++)
                    {
                        var oOTDocChange = this._aPastDocChanges[i];
                        if (!oOTDocChange.get('bIsMe'))
                            oReverseDelta.oRange = oOT.transformRange(oOTDocChange.get('oDelta'), oReverseDelta.oRange);
                    }
                    
                    // Apply undo delta.
                    this._applyDelta(oReverseDelta);
                    this._onDocumentChange([oReverseDelta], 'undo');
                    oDocChange.set('bHasBeenUndone', true);
                    
                    // Refresh cursors.
                    this._refreshRemoteSelections();
                    this._moveLocalCursorToDeltaEnd(oReverseDelta);
                    break;
                }
            }
        },
        
        _onRedo: function()
        {
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
                
                    // Create reverse delta.
                    var oReverseDelta = this._getReversedDelta(oDocChange.get('oDelta'));
                    for (var i = iPastDocChange + 1; i < this._aPastDocChanges.length; i++)
                    {
                        var oOTDocChange = this._aPastDocChanges[i];
                        if (!oOTDocChange.get('bIsMe'))
                            oReverseDelta.oRange = oOT.transformRange(oOTDocChange.get('oDelta'), oReverseDelta.oRange);
                        
                    }
                    
                    // Apply redo delta.
                    this._applyDelta(oReverseDelta);
                    this._onDocumentChange([oReverseDelta], 'redo');
                    oDocChange.set('bHasBeenRedone', true);
                    
                    // Refresh cursors.
                    this._refreshRemoteSelections();
                    this._moveLocalCursorToDeltaEnd(oReverseDelta);
                    break;
                }
            }
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
        
        _getReversedDelta: function(oNormDelta)
        {
            var oInverseDelta = oHelpers.deepCloneObj(oNormDelta);
            oInverseDelta.sAction = (oNormDelta.sAction == 'insert' ? 'delete' : 'insert');
            return oInverseDelta;
        },
        
        _getPendingDocChanges: function(bRemove)
        {
            var iFirstPendingDocChangeOffset = this._getFirstPendingDocChangeOffset();
            if (iFirstPendingDocChangeOffset)
            {
                if (bRemove)
                    return this._aPastDocChanges.splice(iFirstPendingDocChangeOffset, this._aPastDocChanges.length);
                else
                    return this._aPastDocChanges.slice( iFirstPendingDocChangeOffset, this._aPastDocChanges.length);                
            }
            return [];
        },
        
        _getFirstPendingDocChangeOffset: function()
        {
            var iFirstPendingDocChangeOffset = null;
            for (var i = this._aPastDocChanges.length - 1; i >=0;  i--)
                iFirstPendingDocChangeOffset = i;
            return iFirstPendingDocChangeOffset;
        },
        
    });
});