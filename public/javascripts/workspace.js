
var _sUNTITLED = 'Untitled';

var Workspace = oHelpers.createClass(
{
    _oSocket: null,
    
    _oEditor: null,
    _oToolbar: null,
    _oPeoplePane: null,
    
    _oUserInfo: null,

    _aObjects: null,
    _oFocusObject: null,
    _aFocusHistory: null,
    _bDoNotAddNextFocusEventToHistory: false,

    __type__: 'Workspace',    

    __init__: function(oSocket, bIsNewDocument, oNewDocumentMode)
    {
        // Save socket.
        this._oSocket = oSocket;
        this._oSocket.bind('message', this, this._handleServerAction);
        
        // Init objects.
        this._oToolbar    = new Toolbar(this, oSocket);
        this._oPeoplePane = new PeoplePane(this, oSocket);
        this._oEditor     = new Editor(oSocket);
        
        // Init DOM focus.
        this._aObjects = [this._oToolbar, this._oEditor, this._oPeoplePane];
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
            this._oSocket.send('openDocument',
            {
                sDocumentID: window.location.pathname.substr(1)
            });            
        }
        
        // Attach DOM events.
        this._attachDOMEvents();
    },
    
    blurFocusedObject: function(bDoNotAddNextFocusEventToHistory)
    {
        if (this._oFocusObject && this._oFocusObject != this._oEditor)
        {
            this._oFocusObject.onBlur();
            $(document.activeElement).blur();
            if (this._aFocusHistory.length)
            {
                this._bDoNotAddNextFocusEventToHistory = (bDoNotAddNextFocusEventToHistory || false);
                this._aFocusHistory.pop().focus();
            }
        }
    },
    
    focusEditor: function()
    {
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
    
    togglePeoplePane: function()
    {
        if ($('#workspace').hasClass('people-pane-expanded'))
        {
            if (this._oFocusObject == this._oPeoplePane)
            {
                this.blurFocusedObject();
            }
            $('#workspace').removeClass('people-pane-expanded');
        }
        else
        {
            $('#workspace').addClass('people-pane-expanded');
            this._oPeoplePane.focus();
        }
        this._oEditor.resize();  
    },
    
    setIsEditing: function(bIsEditing)
    {
        $('BODY').toggleClass('is-editing', bIsEditing);
        this._oToolbar.setIsEditing(bIsEditing);
        this._oEditor.setIsEditing(bIsEditing);
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
                        this.blurFocusedObject(true);
                        break;
                    }
                case 'keypress':
                case 'keyup':
                    if (this._oFocusObject)
                        _sendEvent(this._oFocusObject, oEvent);                        
                    break;
                
                // Blur elem that last had focus.
                case 'focusin':
                    if (this._oFocusObject != oTargetObject)
                    {
                        // Reset focus history on editor focus.
                        if (oTargetObject == this._oEditor)
                            this._aFocusHistory = [];
                        
                        // Blur last-focused element.
                        if (this._oFocusObject)
                        {
                            if (this._oFocusObject != this._oToolbar && !this._bDoNotAddNextFocusEventToHistory)
                            {
                                this._aFocusHistory.push(this._oFocusObject);
                                
                                // Eat our history tale.
                                if (this._aFocusHistory.length == this._aObjects.length)
                                    this._aFocusHistory.splice(0, 1);
                            }
                            this._oFocusObject.onBlur();                        
                        }
                        this._bDoNotAddNextFocusEventToHistory = false;
                            
                        // Focus new element.
                        this._oFocusObject = oTargetObject;
                    }
                
                case 'mousedown':
                    // Focus should always be in a text-entry box.
                    if (jTarget.is(':not(input, textarea)'))
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
                
            case 'editRightsGranted':
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
