
var _sUNTITLED = 'Untitled';

var Workspace = oHelpers.createClass(
{
    _oSocket: null,
    
    _oEditor: null,
    _oToolbar: null,
    
    _oUserInfo: null,
    
    _aObjects: null,
    _oFocusedObject: null,
    _oLastFocusedObject: null,

    __type__: 'Workspace',    

    __init__: function(oSocket, bIsNewDocument, oNewDocumentMode)
    {
        // Save socket.
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerAction);
        
        // Init objects.
        this._oToolbar    = new Toolbar(this, oSocket);
        this._oEditor     = new Editor(this, oSocket);
        
        // Init DOM focus.
        this._aObjects = [this._oToolbar, this._oEditor];
        this._aFocusHistory = [];
        
        // On a new document creation, default the title to "Untitled".
        if (bIsNewDocument)
        {
            this._oToolbar.setTitle(_sUNTITLED);
            this._oToolbar.setMode(oNewDocumentMode);
            this._oEditor.setMode(oNewDocumentMode);
            this.setIsEditing(bIsNewDocument /*bIsEditing*/ );
            this._oSocket.send('createDocument',
            {
                sMode:  oNewDocumentMode.getName(),
                sTitle: _sUNTITLED
            });
            this.focusEditor();
        }
        else // Open existing document.
        {
            // A new client won't have edit mode so disable mode options 
            $('.menu').toggleClass('disabled', true);
            this._oSocket.send('openDocument',
            {
                sDocumentID: window.location.pathname.substr(1)
            });            
        }
        
        // Attach DOM events.
        this._attachDOMEvents();
    },
    
    blurFocusedObject: function()
    {
        if (this._oFocusedObject && this._oFocusedObject != this._oEditor)
        {            
            if (this._oLastFocusedObject) // Focus last focused object.
            {
                this._oLastFocusedObject.focus();
            }
            else if (this._oEditor.isEditing())// Focus editor.
            {
                this._oEditor.focus();
            }
            else if (document.activeElement != document.body) // If is active elem.
            {
                // Blur focused object.
                this._oFocusedObject.onBlur();
                this._oFocusedObject = null;
                $(document.activeElement).blur();
            }
        }
    },
    
    focusEditor: function()
    {
        this.blurFocusedObject();
        this._oEditor.focus();  
    },
    
    setEditorMode: function(oMode)
    {
        this._oEditor.setMode(oMode);
    },

    getUserInfo: function()
    {
        return this._oUserInfo;
    },
    
    getEditorSelection: function()
    {
        return this._oEditor.getSelection();  
    },
    
    setIsEditing: function(bIsEditing)
    {
        $('BODY').toggleClass('is-editing', bIsEditing);
        this._oToolbar.setIsEditing(bIsEditing);
        this._oEditor.setIsEditing(bIsEditing);
        // Set focus to editor when setting edit mode to true,
        // if focus is not elswhere.
        if (bIsEditing && !this._oFocusedObject)
            this._oEditor.focus();
    },
    
    _getContainingObj: function(jElem)
    {
        for (var i in this._aObjects)
        {
            var oObject = this._aObjects[i];
            if (oObject.contains(jElem))
                return oObject;
        }
        oHelpers.assert(jElem.is('BODY'), 'Containing object not found this elemement:', jElem);
        return null;
    },

    _attachDOMEvents: function()
    {
        function _sendEvent(oObject, oEvent)
        {
            oObject.onEvent(oEvent);
        }
                
        oHelpers.on('BODY', 'mousedown click focusin keydown keyup keypress', this, function(oEvent)
        {
            var jTarget = $(oEvent.target);
            var oTargetObject = this._getContainingObj(jTarget);
            switch (oEvent.type)
            {
                // Foward keyboard events.
                case 'keydown':
                    if (oEvent.which == 27) // ESC
                    {
                        this.blurFocusedObject();
                        break;
                    }
                    
                    // TODO: Think through keyboard controls for a mac.
                    // Disable native browser handling for saving/searching.
                    // Note: We do this for searching even though ACE does natively
                    //       because we also want to disable native searching when
                    //       the ACE editor does not have focus.
                    if (oEvent.ctrlKey && oHelpers.inArray(oEvent.which, [83, 70, 71]))
                    {
                        oEvent.preventDefault();
                    }
                    
                case 'keypress':
                case 'keyup':
                    if (this._oFocusedObject)
                        _sendEvent(this._oFocusedObject, oEvent);                        
                    break;
                
                // Blur elem that last had focus.
                case 'focusin':
                    if (this._oFocusedObject != oTargetObject)
                    {
                        if (this._oFocusedObject)
                        {
                            // Blur focused object.
                            this._oFocusedObject.onBlur();
                            
                            /********************************************************************************
                             * Update the "Last Focused" member
                             ********************************************************************************
                             *
                             * When an ephemeral UI object loses focus (as when ESC is pressed), we revert
                             * focus back to the subtantial UI object (if any) which had focus immediately
                             * before the active ephemeral UI object.
                             *
                             * Below, we update the "_oLastFocusedObject" member to point to the "substantial"
                             * UI object (if any) which, in this scenario, focus should revert to.
                             *
                             * DEFINITIONS:
                             *
                             *  - Ephemeral IU Object:  UI object users don't "live" in.
                             *                          Example: toolbar.
                             *
                             *  - Subtantial UI Object: UI object users do "live" in (excluding editor *)
                             *
                             *  * If "_olastFocusedObject" is null, focus reverts to the editor. Focus never
                             *    reverts away from the editor. ESC does nothing if the editor is focused.
                             *    
                             *******************************************************************************/ 
                            
                            var oEphemeralObjects   = [this._oToolbar   ];
                            var oSubstantialObjects = [];
                            
                            if (oHelpers.inArray(oTargetObject, oEphemeralObjects) &&
                                oHelpers.inArray(this._oFocusedObject, oSubstantialObjects))
                            {
                                this._oLastFocusedObject = this._oFocusedObject;
                            }
                            else
                                this._oLastFocusedObject = null;                                
                        }
                        
                        // Remember focused object.
                        this._oFocusedObject = oTargetObject;
                    }
                
                case 'mousedown':
                    // Focus should always be in a text-entry box.
                    if (jTarget.is(':not(input, textarea)') || jTarget.prop('disabled'))
                        oEvent.preventDefault();
                    
                // Forward non-keyboard events.
                default:
                    _sendEvent(oTargetObject, oEvent);                    
            }
        });
    },

    _handleServerAction: function(oAction)
    {
        switch(oAction.sType)
        {
            case 'connect':
                this._oUserInfo = oAction.oData;
                break;
                
            case 'setDocumentTitle':
                this._oToolbar.setTitle(oAction.oData.sTitle);
                break;
                
            case 'setMode':
                var oMode = g_oModes.oModesByName[oAction.oData.sMode];
                this._oToolbar.setMode(oMode);
                this._oEditor.setMode(oMode);
                break;
                
            case 'removeEditRights':
                this.setIsEditing(false);
                this._oSocket.send('releaseEditRights'); // Notify server of action receipt.
                break;
                
            case 'setCurrentEditor': // This is also caught in editor.js
                if (this.getUserInfo().sUsername == oAction.oData.sUsername)
                    this.setIsEditing(true);
                break;
                
            case 'setDocumentID': // Fired after creating a new document.
                window.history.replaceState(null, '', '/' + oAction.oData.sDocumentID);
                break;
                
            default:
                return false;
        }
        return true;
    }    
});
