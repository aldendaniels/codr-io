define('app-main', function(require)
{
    // Dependencies.
    var $                            = require('lib/jquery'),
        oHelpers                     = require('helpers/helpers-web'),
        Socket                       = require('helpers/socket'),
        oUIDispatch                  = require('helpers/ui-dispatch'),
        Dropdown                     = require('helpers/dropdown')
        MenuKeyNav                   = require('helpers/menu-key-nav'),
        fnPopupWindow                = require('helpers/popup-window'),
        oModes                       = require('edit-control/modes');
                                       require('lib/tooltip');
    
    // UI Handler Dependencies.    
    var oChatUIHandler               = require('chat'),
        oHtmlTemplateInsertUIHandler = require('html-template-dialog'),
        oEditor                      = require('editor'),
        oKeyShortcutHandler          = require('helpers/key-shortcut-handler'),
        oPreviewUIHandler            = require('preview');
        
    // Other module globals.
    var _sUNTITLED = 'Untitled';
    var oSocket                      = null;
    var oUserInfo = null;

    var oTitleUIHandler = (
    {   
        onEvent: function(oEvent)
        {            
            // Set title on ENTER / Click.
            var sEventType = oEvent.type;
            var jTarget = $(oEvent.target);
            if ((sEventType == 'keydown' && oEvent.which == 13       ) || 
                (sEventType == 'click'   && jTarget.is('#title-save')))
            {
                this._setTitleToLocal();
                oEvent.preventDefault();
            }
        },
        
        disable: function()
        {
            $('#title-input, #title-save').prop('disabled', true);
            $('#title .hidden-focusable a').attr('tabIndex', -1);            
        },
        
        setTitle: function(sTitle, bDoNotSetWithHistory)
        {
            $('#toolbar-item-title .toolbar-item-selection').text(sTitle);
            $('#title-input').val(sTitle);
            $('#download-as').val(sTitle);
            $('#toolbar-item-title .toolbar-item-btn').attr('title', sTitle);
            if (bDoNotSetWithHistory)
                document.title = sTitle;
            else
                oHelpers.setTitleWithHistory(sTitle);
        },
        
        getTitle: function()
        {
            return $('#title-input').val();
        },
        
        _setTitleToLocal: function()
        {
            var sTitle = $('#title-input').val();
            oSocket.send('setDocumentTitle', { 'sTitle': sTitle });
            this.setTitle(sTitle);
            oUIDispatch.blurFocusedUIHandler();
            
            // Set HTML title.
            if (oModeUIHandler.getMode().getName() == 'html')
                oEditor.replaceRegex(/<title>.*<\/title>/, '<title>' + sTitle + '</title>');
        }
    });
    
    var oModeUIHandler = (
    {
        _oModeMenu:    null,
        _oCurrentMode: null,
        
        init: function()
        {
            this._oModeMenu = oModes.createModeMenu('#mode-menu', this, this._setModeToLocal);
        },
        
        onEvent: function(oEvent)
        {
            this._oModeMenu.onEvent(oEvent);
        },
        
        disable: function()
        {
            $('.menu').addClass('disabled');
        },
        
        setMode: function(oMode)
        {
            $('#toolbar-item-mode .toolbar-item-selection').text(oMode.getDisplayName());
            $('BODY').toggleClass('mode-html',       oMode.getName() == 'html');
            $('BODY').toggleClass('show-html-tools', oMode.getName() == 'html');
            this._oCurrentMode = oMode;
            oEditor.setMode(oMode);
        },
        
        getMode: function()
        {
            return this._oCurrentMode;
        },
        
        _setModeToLocal: function(oMode)
        {
            this.setMode(oMode);
            oSocket.send('setMode', { sMode: oMode.getName() });
            oUIDispatch.blurFocusedUIHandler();
        }
    });
    
    var oDownloadUIHandler = (
    {
        onEvent: function(oEvent)
        {
            // Download on ENTER / Click.
            var sEventType = oEvent.type;
            var jTarget = $(oEvent.target);
            if ((sEventType == 'keydown' && oEvent.which == 13       ) || 
                (sEventType == 'click'   && jTarget.is('#title-save')))
            {
                this._download();
                oEvent.preventDefault();
            }
        },
        
        _download: function()
        {
            var sHref = window.location.href;
            if (sHref[-1] != '/')
            {
                sHref += '/'
            }
            var sFilename = $('#download-as').val();
            window.location.href = sHref + 'download?filename=' + sFilename;
            oUIDispatch.blurFocusedUIHandler();
        }
    });
    
    var oLinksUIHandler = (
    {
        onEvent: function(oEvent)
        {
            if (oEvent.type == 'click' && $(oEvent.target).is('#snapshot-button'))
                oSocket.send('snapshotDocument');
        },
        
        addSnapshot: function(oSnapshot)
        {
            $('#snapshots #placeholder').remove();
            var sUrl = document.location.origin + '/v/' + oSnapshot.sID;
            var sDate = oHelpers.formatDateTime(oSnapshot.oDateCreated);
            var jSnapshot = $('<a class="snapshot-link"><span class="date"></span><span class="url"></span></a>');
            jSnapshot.find('span.date').text(sDate);
            jSnapshot.find('span.url').text(sUrl);
            jSnapshot.attr('href', sUrl).appendTo('#snapshots');
        },
    });

    var oHtmlPreviewDockUIHandler = (
    {
        _oMenu: null,
        _sDockDir: '',
        _iPctSplit: 40,
        _jEditor: $('#edit'),
        _jPreview: $('#html-preview-wrap'),
        
        init: function()
        {
            this._oMenu = new MenuKeyNav('#html-preview-dock-menu', this, this._setPreviewDock);
        },
        
        onEvent: function(oEvent)
        {
            this._oMenu.onEvent(oEvent);
        },
        
        _updateSplit: function()
        {
            switch(this._sDockDir)
            {
                case 'right':
                    this._jPreview.width(this._iPctSplit + '%').height('');
                    this._jEditor.width(100 - this._iPctSplit + '%').height('');
                    break;
                
                case 'bottom':
                    this._jPreview.height(this._iPctSplit + '%').width('');
                    this._jEditor.height(100 - this._iPctSplit + '%').width('');
                    break;
                
                case 'none':
                    this._jPreview.height('').width('');
                    this._jEditor.height('').width('');
                    break;
            }
        },
        
        _setPreviewDock: function(sDockDir)
        {
            // Update Menu.
            $('#toolbar-item-html-preview-dock .toolbar-item-value').text(sDockDir);
            
            // Show Preview.
            sDockDir = sDockDir.toLowerCase();
            this._sDockDir = sDockDir;
            $('#html-preview-wrap').attr('class', sDockDir);
            this._updateSplit();
            oEditor.resize();
            
            // Pause or play Preview.
            if (sDockDir == 'none')
                oPreviewUIHandler.pause();
            else
                oPreviewUIHandler.play(oEditor.getAllLines());
            
            // Close menu.
            oUIDispatch.blurFocusedUIHandler();
        }
    });

    var oHtmlPreviewRefreshFrequencyUIHandler = (
    {
        _oMenu: null,
        
        init: function()
        {
            this._oMenu = new MenuKeyNav('#html-preview-refresh-menu', this, this._setRefreshFrequency);
        },
        
        onEvent: function(oEvent)
        {
            this._oMenu.onEvent(oEvent);
        },
        
        setAutoRefresh:function(bAutoRefresh)
        {
            var sLabel = (bAutoRefresh ? 'Auto' : 'Manual');
            $('#toolbar-item-html-preview-refresh-frequency .toolbar-item-value').text(sLabel);
            oHtmlPreviewRefreshUIHandler.setDisabled(bAutoRefresh);
        },
        
        _setRefreshFrequency: function(sRefreshFrequency)
        {
            // Validate.
            oHelpers.assert(oHelpers.inArray(sRefreshFrequency, ['Auto', 'Manual']));
            var bAutoRefresh = (sRefreshFrequency == 'Auto');
            
            // Update UI.
            this.setAutoRefresh(bAutoRefresh);
            oUIDispatch.blurFocusedUIHandler();
            
            // Send action.
            oSocket.send('setAutoRefreshPreview',
            {
                bAutoRefreshPreview: bAutoRefresh
            });
        }
    });
    
    var oHtmlPreviewPopupUIHandler = (
    {
        contains: function(jElem)
        {
            return jElem.closest('#toolbar-item-html-preview-popup').length;
        },
        
        onEvent: function(oEvent)
        {
            // Set title on ENTER / Click.
            var sEventType = oEvent.type;
            if ((sEventType == 'keydown' && oEvent.which == 13) || sEventType == 'click')
            {
                this._popupPreview();
                oEvent.preventDefault();
            }
        },
        
        _popupPreview: function()
        {
            fnPopupWindow(oHelpers.joinURL(window.location.href, 'preview'), 600, 500);
        }
    });

    var oHtmlPreviewRefreshUIHandler = (
    {
        _jElem: $('#toolbar-item-html-preview-refresh'),
        
        contains: function(jElem)
        {
            return jElem.closest(this._jElem).length;
        },
        
        setDisabled: function(bDisabled)
        {
            this._jElem.toggleClass('disabled', bDisabled);
        },
        
        onEvent: function(oEvent)
        {
            // Set title on ENTER / Click.
            var sEventType = oEvent.type;
            if ((sEventType == 'keydown' && oEvent.which == 13) || sEventType == 'click')
            {
                if (!this._jElem.hasClass('disabled'))
                    this._refreshPreview();
                oEvent.preventDefault();
            }
        },
        
        _refreshPreview: function()
        {
            oSocket.send('refreshPreview');
        }
    });
    
    var oToggleHtmlToolsUIHanlder = (
    {
        contains: function(jElem)
        {
            return jElem.closest('#html-tools-btn').length;
        },
        
        onEvent: function(oEvent)
        {
            // Set title on ENTER / Click.
            var sEventType = oEvent.type;
            if ((sEventType == 'keydown' && oEvent.which == 13) || sEventType == 'click')
            {
                $('BODY').toggleClass('show-html-tools');
                oEvent.preventDefault();
            }
        }
    });
    
    function handleServerAction(oAction)
    {
        switch(oAction.sType)
        {
            case 'connect':
                oUserInfo = oAction.oData;
                break;
                
            case 'setDocumentTitle':
                oTitleUIHandler.setTitle(oAction.oData.sTitle);
                break;
                
            case 'setMode':
                var oMode = oModes.oModesByName[oAction.oData.sMode];
                oModeUIHandler.setMode(oMode);
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
                
                updateCollabUrl(oAction.oData.sDocumentID);
                break;
                
            case 'addSnapshot':
                oLinksUIHandler.addSnapshot(oAction.oData);
                break;
                
            case 'error':
                document.write(oAction.oData.sMessage);
                break;
            
            case 'setAutoRefreshPreview':
                oHtmlPreviewRefreshFrequencyUIHandler.setAutoRefresh(oAction.oData.bAutoRefreshPreview);
                break;
                
                return false;
        }
        return true;
    }
    
    function updateCollabUrl(sDocumentID)
    {
        oHelpers.assert(oHelpers.inString(sDocumentID, document.location.href), 'Bad URL');
        $('#collaborate-url').val(document.location.href.slice(7));
        $('#clone-doc-id').val(sDocumentID);
    }
    
    return function(bIsNewDocument, bIsSnapshot, oNewDocumentMode)
    {
        // Init Socket.
        var sSocketURL = (bIsSnapshot ? null : 'ws://' + window.document.location.host + '/');
        oSocket = new Socket(sSocketURL);
        oSocket.bind('message', null, handleServerAction);
        
        // Init UI Handlers.
        oEditor.init(oSocket);
        oChatUIHandler.init(oSocket, function(){ return oUserInfo });
        oHtmlTemplateInsertUIHandler.init(oEditor, oTitleUIHandler);
        oModeUIHandler.init();
        oHtmlPreviewDockUIHandler.init();
        oHtmlPreviewRefreshFrequencyUIHandler.init();
        oKeyShortcutHandler.init();
        oPreviewUIHandler.init(oSocket, oEditor);
        oPreviewUIHandler.pause();
        
        // Set initial DOM focus to editor.
        oEditor.focus();
                
        // Development Hack: Expose the editor.
        window._editor = oEditor;

        if (bIsSnapshot)
        {
            // Disable controls.
            // Chat and Links are disabled in index.html to avoid delay.
            oTitleUIHandler.disable();
            oModeUIHandler.disable();
            
            // Set Ccontent.
            var sDocumentID = /^\/v\/([a-z0-9]+)\/?$/.exec(document.location.pathname)[1];
            $.get('/ajax/' + sDocumentID + '/', oHelpers.createCallback(this, function(oResponse)
            {
                oHelpers.assert(!oResponse.sError, oResponse.sError);
                oEditor.setContent(oResponse.aLines);
                oModeUIHandler.setMode(oModes.oModesByName[oResponse.sMode]);
                oTitleUIHandler.setTitle(oResponse.sTitle);
            }));
        }
        else
        {
            // On a new document creation, default the title to "Untitled".
            if (bIsNewDocument)
            {
                oTitleUIHandler.setTitle(_sUNTITLED, true);         
                oModeUIHandler.setMode(oNewDocumentMode);
                oSocket.send('createDocument',
                {
                    sMode:  oNewDocumentMode.getName(),
                    sTitle: _sUNTITLED
                });
            }
            else // Open existing document.
            {
                var sDocumentID = /^(\/v)?\/([a-z0-9]+)\/?$/.exec(document.location.pathname)[2];
                oSocket.send('openDocument',
                {
                    sDocumentID: sDocumentID,
                    bIsPreview: false
                });            
                updateCollabUrl(sDocumentID);
            }
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
        
        // Register dropdowns.
        new Dropdown('#toolbar-item-mode',                           oModeUIHandler);
        new Dropdown('#toolbar-item-title',                          oTitleUIHandler);
        new Dropdown('#toolbar-item-download',                       oDownloadUIHandler);
        new Dropdown('#toolbar-item-link',                           oLinksUIHandler);
        new Dropdown('#toolbar-item-chat',                           oChatUIHandler);
        new Dropdown('#toolbar-item-html-template-insert',           oHtmlTemplateInsertUIHandler);
        new Dropdown('#toolbar-item-html-preview-dock',              oHtmlPreviewDockUIHandler);
        new Dropdown('#toolbar-item-html-preview-refresh-frequency', oHtmlPreviewRefreshFrequencyUIHandler);
        new Dropdown('#toolbar-item-fork');
        
        // Register other UI handlers.
        oUIDispatch.registerUIHandler(oHtmlPreviewPopupUIHandler);
        oUIDispatch.registerUIHandler(oHtmlPreviewRefreshUIHandler);
        oUIDispatch.registerUIHandler(oToggleHtmlToolsUIHanlder);
        
        // Bind shorctut handlers.
        oKeyShortcutHandler.registerShortcut('T', $('#toolbar-item-title'),    -15);
        oKeyShortcutHandler.registerShortcut('L', $('#toolbar-item-mode'),     -15);
        oKeyShortcutHandler.registerShortcut('D', $('#toolbar-item-download'),  12);
        oKeyShortcutHandler.registerShortcut('F', $('#toolbar-item-fork'),      12);
        if (!bIsSnapshot)
        {
            oKeyShortcutHandler.registerShortcut('C', $('#toolbar-item-chat'),  12);
            oKeyShortcutHandler.registerShortcut('K', $('#toolbar-item-link'),  12);
        }
        
        // Disable native browser handling for saving/searching.
        // TODO: Think through keyboard controls for a mac.
        oHelpers.on(window, 'keydown', null, function(oEvent)
        {
            if (oEvent.ctrlKey && oHelpers.inArray(oEvent.which, [83, 70, 71]))
            {
                oEvent.preventDefault();
            }
        });
    };
});
