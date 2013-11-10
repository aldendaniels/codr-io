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
        _aPastDeltas: null, // Also used for undo/redo.
    
        __type__: 'Editor',    
    
        __init__: function(oSocket)
        {
            this._oSocket = oSocket;
            this._oRemoteClients = {};
            this._aPastDeltas = [];
            
            // Attach socket.
            this._oSocket.bind('message', this, this._handleServerAction);
                    
            // Attach events.
            this._oEditControl = new EditControl(EDITOR_ID);
            this._oEditControl.on('docChange', this, this._onDocumentChange);
            this._oEditControl.on('selChange', this, this._onSelectionChange);
            //this._oEditControl.on('undo', this, this._onUndo);
            //this._oEditControl.on('redo', this, this._onRedo);
            
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
                    var aPendingDeltas = this._getPendingDeltas();
                    for (var i in aPendingDeltas)
                        oAction.oData.oRange = oOT.transformRange(aPendingDeltas[i], oAction.oData.oRange);
                    
                    // Save remote selection range and refresh.
                    var sClientID = oAction.oData.sClientID;
                    this._oRemoteClients[sClientID].oLastSelRange = oAction.oData.oRange;
                    this._refreshRemoteSelections();
                    break;
                
                case 'docChange':
                    
                    // Store server state.
                    this._iServerState = oAction.oData.iServerState;
                    
                    // Revert pending deltas.
                    var aPendingDeltas = this._getPendingDeltas(true /*remove*/);
                    for(var i = aPendingDeltas.length - 1; i >= 0; i--)
                        this._applyDelta(this._getReversedDelta(aPendingDeltas[i]));
                    
                    // Apply new delta.
                    this._applyDelta(oAction.oData.oDelta);
                    this._aPastDeltas.push(
                    {
                        oDelta:         oAction.oData.oDelta,
                        bIsPending:     false,
                        bIsMe:          false,
                        bIsUndo:        false,
                        bHasBeenUndone: false, // Applies to all events EXCEPT undo events.
                        bHasBeenRedone: false, // Applies to undo events.
                    });
                    
                    // Transform and apply pending tranformed deltas.
                    for (i in aPendingDeltas)
                    {
                        var oPendingDelta = aPendingDeltas[i];
                        oPendingDelta.oRange = oOT.transformRange(oAction.oData.oDelta, oPendingDelta.oRange);
                        this._applyDelta(oPendingDelta);
                        this._aPastDeltas.push(oPendingDelta);
                    }
                    
                    // Refresh remote cursors.
                    this._refreshRemoteSelections();
                    break;
                    
                case 'eventReciept':
                    this._iServerState = oAction.oData.iServerState;
                    var iFirstPendingDeltaOffset = this._getFirstPendingDeltaOffset();
                    if (iFirstPendingDeltaOffset)
                        this._aPastDeltas[iFirstPendingDeltaOffset].bIsPending = false;              
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
        
        _onDocumentChange: function(oDelta, bIsUndo)
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
            this._aPastDeltas.push(
            {
                oDelta:         oDelta,
                bIsMe:          true,
                bIsPending:     false,
                bIsUndo:        bIsUndo || false,
                bHasBeenUndone: false, // Applies to all events EXCEPT undo events.
                bHasBeenRedone: false  // Applies to undo events.
            });
        },
        
        _onUndo: function()
        {
            /*if (this._aUndoStack.length)
            {
                var oDelta = this._aUndoStack.pop();
                this._applyDelta(oDelta);
                this._onDocumentChange(oDelta, true);
                this._aRedoStack.push(this._getReversedDelta(oDelta));                
            }*/
        },
        
        _onRedo: function()
        {
            /*if (this._aRedoStack.length)
            {
                var oDelta = this._aRedoStack.pop();
                this._applyDelta(oDelta);
                this._onDocumentChange(oDelta);             
            }*/
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
        
        _getPendingDeltas: function(bRemove)
        {
            var iFirstPendingDeltaOffset = this._getFirstPendingDeltaOffset();
            if (iFirstPendingDeltaOffset)
            {
                if (bRemove)
                    return this._aPastDeltas.splice(iFirstPendingDeltaOffset, this._aPastDeltas.length);
                else
                    return this._aPastDeltas.slice( iFirstPendingDeltaOffset, this._aPastDeltas.length);                
            }
            return [];
        },
        
        _getFirstPendingDeltaOffset: function()
        {
            var iFirstPendingDeltaOffset = null;
            for (var i = this._aPastDeltas.length - 1; i >=0;  i--)
                iFirstPendingDeltaOffset = i;
            return iFirstPendingDeltaOffset;
        },
        
    });
});