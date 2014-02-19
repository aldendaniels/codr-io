define(function(require)
{
    // Dependencies.
    var $                           = require('lib/jquery'),
        oHelpers                    = require('helpers/helpers-web'),
        Dropdown                    = require('helpers/dropdown'),
        oModes                      = require('edit-control/modes'),
        ChatUIHandler               = require('chat'),
        HtmlTemplateInsertUIHandler = require('html-template-dialog');
            
    var TitleUIHandler = oHelpers.createClass(
    {   
        __init__: function(oSocket, oWorkspace, oModeHandler)
        {
            this._oSocket = oSocket;
            this._oWorkspace = oWorkspace;
            this._oModeHandler = oModeHandler;
            
            // Toggle title editability.
            if (IS_SNAPSHOT)
            {                    
                $('#title-input, #title-save').prop('disabled', true);
                $('#title .hidden-focusable a').attr('tabIndex', -1);
            }
        },
        
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
            this._oSocket.send('setDocumentTitle', { 'sTitle': sTitle });
            this.setTitle(sTitle);
            this._oWorkspace.blurFocusedObject();
            
            // Set HTML title.
            if (this._oModeHandler.getMode().getName() == 'html')
                this._oWorkspace.replaceRegex(/<title>.*<\/title>/, '<title>' + sTitle + '</title>');
        }
    });
    
    var ModeUIHandler = oHelpers.createClass(
    {
        _oModeMenu:    null,
        _oCurrentMode: null,
        
        __init__: function(oSocket, oWorkspace)
        {
            this._oSocket = oSocket;
            this._oWorkspace = oWorkspace;
            this._oModeMenu = oModes.createModeMenu('#mode-menu', this, this._setModeToLocal);
            
            // Toggle mode menu editability.
            if (IS_SNAPSHOT)
                $('.menu').addClass('disabled');
        },
        
        onEvent: function(oEvent)
        {
            this._oModeMenu.onEvent(oEvent);
        },
        
        setMode: function(oMode)
        {
            $('#toolbar-item-mode .toolbar-item-selection').text(oMode.getDisplayName());
            $('BODY').toggleClass('mode-html',       oMode.getName() == 'html');
            $('BODY').toggleClass('show-html-tools', oMode.getName() == 'html');
            this._oCurrentMode = oMode;
        },
        
        getMode: function()
        {
            return this._oCurrentMode;
        },
        
        _setModeToLocal: function(oMode)
        {
            this._oSocket.send('setMode', { sMode: oMode.getName() });
            this.setMode(oMode);
            this._oWorkspace.setEditorMode(oMode);
            this._oWorkspace.blurFocusedObject();
        }
    });
    
    var DownloadUIHandler = oHelpers.createClass(
    {
        __init__: function(oWorkspace)
        {
            this._oWorkspace = oWorkspace;
        },
        
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
            this._oWorkspace.blurFocusedObject();
        }
    });
    
    var LinksUIHandler = oHelpers.createClass(
    {
        __init__: function(oSocket)
        {
            this._oSocket = oSocket;
        },
        
        onEvent: function(oEvent)
        {
            if (oEvent.type == 'click' && $(oEvent.target).is('#snapshot-button'))
                this._oSocket.send('snapshotDocument');
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
    
    return oHelpers.createClass(
    {
        _oWorkspace: null,
        _oTitleUIHandler: null,
        _oModeUIHandler: null,
        _oDownloadUIHandler: null,
        _oLinksUIHander: null,
        _oChatUIHandler: null,
        
        __type__: 'Toolbar',    
        
        __init__: function(oWorkspace, oSocket, oShortcutHandler)
        {
            // Save dependencies.
            this._oSocket = oSocket;
            this._oWorkspace = oWorkspace;
                        
            // Create the UI Handler objects.
            this._oModeUIHandler               = new ModeUIHandler(oSocket, oWorkspace);
            this._oTitleUIHandler              = new TitleUIHandler(oSocket, oWorkspace, this._oModeUIHandler);
            this._oDownloadUIHandler           = new DownloadUIHandler(oWorkspace);
            this._oLinksUIHandler              = new LinksUIHandler(oSocket, oWorkspace);
            this._oChatUIHandler               = new ChatUIHandler(oWorkspace, oSocket);
            this._oHtmlTemplateInsertUIHandler = new HtmlTemplateInsertUIHandler(oWorkspace, this);
            
            // Register dropdowns.
            new Dropdown('#toolbar-item-mode',     this._oModeUIHandler,               oWorkspace);
            new Dropdown('#toolbar-item-title',    this._oTitleUIHandler,              oWorkspace);
            new Dropdown('#toolbar-item-download', this._oDownloadUIHandler,           oWorkspace);
            new Dropdown('#toolbar-item-link',     this._oLinksUIHandler,              oWorkspace);
            new Dropdown('#toolbar-item-chat',     this._oChatUIHandler,               oWorkspace);
            new Dropdown('#toolbar-item-template', this._oHtmlTemplateInsertUIHandler, oWorkspace);
            new Dropdown('#toolbar-item-fork', null, oWorkspace);
            
            // Bind shorctut handlers.
            oShortcutHandler.registerShortcut('T', $('#toolbar-item-title'),    -15);
            oShortcutHandler.registerShortcut('L', $('#toolbar-item-mode'),     -15);
            oShortcutHandler.registerShortcut('D', $('#toolbar-item-download'),  12);
            oShortcutHandler.registerShortcut('F', $('#toolbar-item-fork'),      12);
            if (!IS_SNAPSHOT)
            {
                oShortcutHandler.registerShortcut('C', $('#toolbar-item-chat'),  12);
                oShortcutHandler.registerShortcut('K', $('#toolbar-item-link'),  12);
            }
            
            // Show the "edit mode required" message.
            if (IS_SNAPSHOT)
                $('.edit-mode-message').show();
                
            oHelpers.on('#html-tools-btn', 'click', this, function()
            {
                $('BODY').toggleClass('show-html-tools');
            });
        },
        
        setTitle: function(sTitle, bDoNotSetWithHistory)
        {
            this._oTitleUIHandler.setTitle(sTitle, bDoNotSetWithHistory);
        },
        
        getTitle: function()
        {
            return this._oTitleUIHandler.getTitle();
        },
        
        setMode: function(oMode)
        {
            this._oModeUIHandler.setMode(oMode);
        },
        
        addSnapshot: function(oSnapshot)
        {
            return this._oLinksUIHandler.addSnapshot(oSnapshot);
        }
    });
});
