define(function(require)
{
    // Dependencies.
    var $                     = require('jquery'),
        oHelpers              = require('helpers/helpers'),
        Socket                = require('helpers/socket'),
        KeyShortcutHandler    = require('helpers/key-shortcut-handler'),
        oModes                = require('edit-control/modes'),
        Editor                = require('editor'),
        Toolbar               = require('toolbar');
    
    // Constants.
    var _sUNTITLED = 'Untitled';
    
    // Workspace object.
    return oHelpers.createClass(
    {
        _oSocket: null,
        
        _oEditor: null,
        _oToolbar: null,
        
        _oUserInfo: null,
        
        _aObjects: null,
        _oFocusedObject: null,
        _oLastFocusedObject: null,
    
        __type__: 'Workspace',    
    
        __init__: function(bIsNewDocument, bIsSnapshot, oNewDocumentMode)
        {
            // Init Socket.
            var sSocketURL = (bIsSnapshot ? null : 'ws://' + window.document.location.host + '/');
            this._oSocket  = new Socket(sSocketURL);
            this._oSocket.bind('message', this, this._handleServerAction);
            
            // Init Shortcut Handler.
            var oShortcutHandler = new KeyShortcutHandler();
            
            // Init objects.
            this._oToolbar    = new Toolbar(this, this._oSocket, oShortcutHandler);
            this._oEditor     = new Editor(this._oSocket);
            
            // Init DOM focus.
            this._aObjects = [this._oToolbar, this._oEditor];
            this._aFocusHistory = [];
            
            // On a new document creation, default the title to "Untitled".
            if (bIsNewDocument)
            {
                this._oToolbar.setTitle(_sUNTITLED);
                this._oToolbar.setMode(oNewDocumentMode);
                this._oEditor.setMode(oNewDocumentMode);
                this._oSocket.send('createDocument',
                {
                    sMode:  oNewDocumentMode.getName(),
                    sTitle: _sUNTITLED
                });
                this.focusEditor();
            }
            else // Open existing document.
            {
                var sDocumentID = /^(\/v)?\/([a-z0-9]+)\/?$/.exec(document.location.pathname)[2];
                this._oSocket.send('openDocument',
                {
                    sDocumentID: sDocumentID
                });            
    
                this._setUrls()
                $('#clone-doc-id').val(sDocumentID);
            }
            
            // Load snpashot data.
            if (bIsSnapshot)
            {
                var sDocumentID = /^\/v\/([a-z0-9]+)\/?$/.exec(document.location.pathname)[1];
                $.get('/ajax/' + sDocumentID + '/', oHelpers.createCallback(this, function(oResponse)
                {
                    oHelpers.assert(!oResponse.sError, oResponse.sError);
                    
                    // Set content.
                    this._oEditor.setContent(oResponse.aLines);
                    
                    // Set mode.
                    var oMode = oModes.oModesByName[oResponse.sMode];
                    this._oEditor.setMode(oMode);
                    this._oToolbar.setMode(oMode);
                    
                    // Set title.
                    this._oToolbar.setTitle(oResponse.sTitle);
                }));
            }
            
            // Attach DOM events.
            this._oEditor.focus();
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
                else // Focus editor.
                {
                    this._oEditor.focus();
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
        
        _getContainingObj: function(jElem)
        {
            for (var i in this._aObjects)
            {
                var oObject = this._aObjects[i];
                if (oObject.contains(jElem))
                    return oObject;
            }
            oHelpers.assert(jElem.is('BODY'), 'Containing object not found this element:', jElem);
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
                        
                        // Disable native browser handling for saving/searching.
                        // TODO: Think through keyboard controls for a mac.
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
                                var aSubstantialObjects = [];                            
                                if (oHelpers.inArray(oTargetObject, oEphemeralObjects) &&
                                    oHelpers.inArray(this._oFocusedObject, aSubstantialObjects))
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
                    var oMode = oModes.oModesByName[oAction.oData.sMode];
                    this._oToolbar.setMode(oMode);
                    break;
                                    
                case 'setDocumentID': // Fired after creating a new document.
                    window.history.replaceState(null, '', '/' + oAction.oData.sDocumentID);
                    this._setUrls()
                    $('#clone-doc-id').val(oAction.oData.sDocumentID);
                    break;
    
                case 'error':
                    document.write(oAction.oData.sMessage);
                    break;
                    
                default:
                    return false;
            }
            return true;
        },
    
        _setUrls: function()
        {
            $('#collaborate-url').val(document.location.href.slice(7));
            $('#workspace-logout').attr('href', '/logout?next=' + document.location.pathname);
            $('#workspace-login').attr('href', '/login?next=' + document.location.pathname);
        }
    });
});
