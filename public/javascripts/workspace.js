define('workspace', function(require)
{
    // Dependencies.
    var $                     = require('lib/jquery'),
        oHelpers              = require('helpers/helpers-web'),
        Socket                = require('helpers/socket'),
        KeyShortcutHandler    = require('helpers/key-shortcut-handler'),
        oModes                = require('edit-control/modes'),
        Editor                = require('editor'),
        Toolbar               = require('toolbar');
                                require('lib/tooltip');
    
    // Constants.
    var _sUNTITLED = 'Untitled';
    
    // Workspace object.
    return oHelpers.createClass(
    {
        _oSocket: null,
        
        _oEditor: null,
        _oToolbar: null,
        
        _oUserInfo: null,
                
        __type__: 'Workspace',    
        
        __init__: function(bIsNewDocument, bIsSnapshot, oNewDocumentMode)
        {
            // Init Socket.
            var sSocketURL = (bIsSnapshot ? null : 'ws://' + window.document.location.host + '/');
            this._oSocket  = new Socket(sSocketURL);
            this._oSocket.bind('message', this, this._handleServerAction);
            
            // Init objects.
            var oShortcutHandler = new KeyShortcutHandler(this);
            this._oToolbar       = new Toolbar(this, this._oSocket, oShortcutHandler);
            this._oEditor        = new Editor(this._oSocket);
            this._oEditor.focus();
            
            // Development Hack: Expose the objects.
            window._editor = this._oEditor;
            window._workspace = this;
            
            // On a new document creation, default the title to "Untitled".
            if (bIsNewDocument)
            {
                this._oToolbar.setTitle(_sUNTITLED, true);                
                this._setMode(oNewDocumentMode);
                this._oSocket.send('createDocument',
                {
                    sMode:  oNewDocumentMode.getName(),
                    sTitle: _sUNTITLED
                });
            }
            else // Open existing document.
            {
                var sDocumentID = /^(\/v)?\/([a-z0-9]+)\/?$/.exec(document.location.pathname)[2];
                this._oSocket.send('openDocument',
                {
                    sDocumentID: sDocumentID,
                    bIsPreview: false
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
                    this._setMode(oMode);
                    
                    // Set title.
                    this._oToolbar.setTitle(oResponse.sTitle);
                }));
            }
            
            // Init tooltips.
            $('#auto-insert-help').tooltip(
            {
                html: true,
                title: "<div style=\"padding: 5px;\">\
                            Automatically insert this <br/>\
                            template into  new HTML<br/>\
                            documents you create?</div>"
            });
        },
        
        setEditorMode: function(oMode)
        {
            this._oEditor.setMode(oMode);
        },
        
        replaceRegex: function(oRegex, sText)
        {
            this._oEditor.replaceRegex(oRegex, sText);
        },
        
        insertLines: function(aLines)
        {
            this._oEditor.insertLines(aLines);
        },
        
        getUserInfo: function()
        {
            return this._oUserInfo;
        },
        
        _setMode: function(oMode)
        {
            this._oEditor.setMode(oMode);
            this._oToolbar.setMode(oMode);
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
                    this._setMode(oMode);
                    break;
                                    
                case 'setDocumentID': // Fired after creating a new document.
                    
                    // Push the new URL.
                    // HACK: In order for the first history entry to have a title of "codr.io"
                    //       and the second to have a title of "Untitled", we set
                    //       the title back to "codr.io" right before pushing the new state.                    
                    if (oHelpers.isFF())
                    {
                        oHelpers.setTitleWithHistory('codr.io');
                        window.setTimeout(oHelpers.createCallback(this, function()
                        {
                            window.history.pushState(   null, '', '/' + oAction.oData.sDocumentID);
                            document.title = _sUNTITLED;
                        }), 0);                        
                    }
                    else
                    {
                        window.history.pushState(   null, '', '/' + oAction.oData.sDocumentID);
                        oHelpers.setTitleWithHistory(_sUNTITLED);
                    }
                    
                    this._setUrls();
                    $('#clone-doc-id').val(oAction.oData.sDocumentID);
                    break;
                    
                case 'addSnapshot':
                    this._oToolbar.addSnapshot(oAction.oData);
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
        }
    });
});
