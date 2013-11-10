/* We maintain a sorted list of all deltas (ours and others.):
    [
        {
            oDelta:         object,
            bIsMe:          boolean,
            bIsPending:     boolean,
            bIsUndo:        boolean,
            bHasBeenUndone: boolean, // Allies to all events EXCEPT undo events.
            bHasBeenRedone: boolean, // Applies to undo events.
        },
        [...]
    ]
    
    On Undo:
    
        1. Find the last action where:
            bIsMe = true
            bIsUndo = false
            bHasBeenUndone = false
      
        2. Create a new event with a reversed delta. Set bIsUndo=true.
      
        3. Transform the new event based on subsequent events
           
        4. Apply the new event.
        
        5. Set bHasBeenUndone to true on the original event.
    
    On Redo:
    
        1. Find the last action where:
            bIsMe = true
            bIsUndo = true
            bHasBeenUndone = false
            
            NOTE: If a non-undo-event is ecountered before an event
                  matching the above criteria, don't do anything.
        
      
        2. Create a new event with a reversed delta. Set bIsRedo=true.
      
        3. Transform the new event based on subsequent events
           
        4. Apply the new event.
        
        5. Set bHasBeenRedone to true on the original undo event.
         
*/

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
                        oAction.oData.oRange = oOT.transformRange(aPendingDocChanges[i].oDelta, oAction.oData.oRange);
                    
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
                        this._applyDelta(this._getReversedDelta(aPendingDeltas[i].oDelta));
                    
                    // Apply new delta.
                    this._applyDelta(oAction.oData.oDelta);
                    this._aPastDocChanges.push(
                    {
                        oDelta:         oAction.oData.oDelta,
                        bIsPending:     false,
                        bIsMe:          false,
                        bIsUndo:        false,
                        bIsRedo:        false,
                        bHasBeenUndone: false, // Applies to all events EXCEPT undo events.
                        bHasBeenRedone: false, // Applies to undo events.
                    });
                    
                    // Transform and apply pending tranformed deltas.
                    for (i in aPendingDocChanges)
                    {
                        var oPendingDocChange = aPendingDocChanges[i];
                        var oDelta = oPendingDocChange.oDelta;
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
                        this._aPastDocChanges[iFirstPendingDocChangeOffset].bIsPending = false;              
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
        
        _onDocumentChange: function(oDelta, bIsUndo, bIsRedo)
        {
            // Note: applyDelta calls do not result in docchange events.
            // The docchange is only fired when the local user makes
            // local changes.
            this._oSocket.send('docChange',
            {
                oDelta: oDelta,
                iState: this._iServerState
            });
            this._transformRemoteSelections(oDelta);
            this._refreshRemoteSelections();
            this._aPastDocChanges.push(
            {
                oDelta:         oDelta,
                bIsMe:          true,
                bIsPending:     false,
                bIsUndo:        bIsUndo || false,
                bIsRedo:        bIsRedo || false,
                bHasBeenUndone: false, // Applies to all events EXCEPT undo events.
                bHasBeenRedone: false  // Applies to undo events.
            });
        },
        
        _onUndo: function()
        {
            for (var iPastDocChange = this._aPastDocChanges.length - 1; iPastDocChange >=0; iPastDocChange--)
            {
                var oDocChange = this._aPastDocChanges[iPastDocChange];
                if (oDocChange.bIsMe && !oDocChange.bIsUndo && !oDocChange.bHasBeenUndone)
                {
                    // Create reverse delta.
                    var oReverseDelta = this._getReversedDelta(oDocChange.oDelta);
                    for (var i = iPastDocChange + 1; i < this._aPastDocChanges.length; i++)
                    {
                        var oOTDocChange = this._aPastDocChanges[i];
                        if (!oOTDocChange.bIsMe)
                            oReverseDelta.oRange = oOT.transformRange(oOTDocChange.oDelta, oReverseDelta.oRange);                            
                    }
                    
                    // Apply undo delta.
                    this._applyDelta(oReverseDelta);
                    this._onDocumentChange(oReverseDelta, true /*bIsUndo*/);
                    oDocChange.bHasBeenUndone = true;
                    
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
                if (oDocChange.bIsMe)
                {                    
                    // Skip redo events.
                    if (oDocChange.bIsRedo || oDocChange.bHasBeenRedone)
                        continue;
                    
                    // Stop if my last event was not an undo.
                    if (!oDocChange.bIsUndo)
                        break;
                
                    // Create reverse delta.
                    var oReverseDelta = this._getReversedDelta(oDocChange.oDelta);
                    for (var i = iPastDocChange + 1; i < this._aPastDocChanges.length; i++)
                    {
                        var oOTDocChange = this._aPastDocChanges[i];
                        if (!oOTDocChange.bIsMe)
                            oReverseDelta.oRange = oOT.transformRange(oOTDocChange.oDelta, oReverseDelta.oRange);                            
                    }
                    
                    // Apply redo delta.
                    this._applyDelta(oReverseDelta);
                    this._onDocumentChange(oReverseDelta, false /*bIsUndo*/, true /*bIsRedo*/);
                    oDocChange.bHasBeenRedone = true;
                    
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