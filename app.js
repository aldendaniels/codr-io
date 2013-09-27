
// Include 3rd party node libraries.
var oOS                 = require('os');
var oPath               = require('path');
var oFS                 = require('fs');
var oUrl                = require('url');
var oExpress            = require('express');
var oWS                 = require('ws');
var oHTTP               = require('http');
var oLessMiddleware     = require('less-middleware');
var oUglifyJSMiddleware = require('uglify-js-middleware');

// Import helpers.
var oHelpers            = require('./helpers');
var Client              = require('./client');
var Workspace           = require('./workspace');
var Document            = require('./document');
var oDatabase           = require('./database');

// GLOBALS
GLOBAL.g_oConfig        = {};
GLOBAL.g_oWorkspaces    = {}; // DocumentID to Workspace instance.

// Set/validation production environmental variables.
g_oConfig = (function()
{
    // Get arguments.
    var oArgs = {};
    for (var i = 2; i < process.argv.length; i++)
    {
        var aParts = process.argv[i].split('=');
        oArgs[aParts[0].trim()] = aParts[1].trim();
    }
    
    // Populate Config object.
    var oConfig = {};
    oConfig.bIsProd   =  (oArgs.is_prod == '1');
    oConfig.bUglify =  (oArgs.uglify == '1' || oConfig.bIsProd);
    oConfig.bCompress =  (oArgs.compress == '1' || oConfig.bIsProd);
    oConfig.iPort     =  (oArgs.port      ? parseInt(oArgs.port) : (oConfig.bIsProd ? 80 : 8080));
    oConfig.sDataPath =  (oArgs.data_path ? oArgs.data_path : function()
                            {
                                if (oConfig.bIsProd)
                                    return '/home/ubuntu/data';
                                else
                                {
                                    var sDataPath = oPath.join(oOS.tmpDir(), 'data');
                                    if(!oFS.existsSync(sDataPath))
                                        oFS.mkdirSync(sDataPath);
                                    return sDataPath;
                                }
                            }());
    return oConfig;
}());

// Error handling.
// TODO: This is a horrible hack.
if (g_oConfig.bIsProd)
{
    process.on('uncaughtException', function (err)
    {
        console.error(err); // Keep node from exiting.
    });    
}

// Create empty codr_static directory.
var sCodrStaticOutputPath = oPath.join(oOS.tmpDir(), 'codr_static');
if (oFS.existsSync(sCodrStaticOutputPath))
{
    oHelpers.emptyDirSync(sCodrStaticOutputPath);
}
else
{
    oFS.mkdirSync(sCodrStaticOutputPath);
}

// Create express app.
var oApp = oExpress();
oApp.configure(function()
{
    oApp.set('port', g_oConfig.iPort);
    
    if (g_oConfig.bCompress)
    {
        oApp.use(oExpress.compress());
    }

    // Configure LESS middleware.
    oApp.use(oLessMiddleware(
    {
        src: __dirname + '/public',
        dest: sCodrStaticOutputPath
    }));

    oApp.use(oExpress.bodyParser());
    
    // Configure UglifyJS middleware in Production.
    if (g_oConfig.bUglify)
    {
        oApp.use(oUglifyJSMiddleware(
        {
            src : __dirname + '/public',
            dest: sCodrStaticOutputPath,
            uglytext: false,
            mangle: true,
            squeeze: true
        }));
    }
    
    oApp.use(oExpress.static(sCodrStaticOutputPath));
    oApp.use(oExpress.static(oPath.join(__dirname, 'public')));

    /* Save static index.html */
    oApp.get('^/$',                     function(req, res) { res.sendfile('public/index.html'); });

    oApp.get('^/ajax/:DocumentID([a-z0-9]+)/?$', function(req, res) {

        function send(oDocument)
        {
            res.set('Content-Type', 'text/json');
            
            if (oDocument.get('bIsSnapshot'))
                res.send(oDocument.toJSON());
            else
            {
                var sError = 'The document has not been published. Please click <a href="/' + sDocumentID + '/">here</a> to see the original.';
                res.send(JSON.stringify({'sError': sError}));
            }
        }

        var sDocumentID = req.params['DocumentID'];
        if (sDocumentID in g_oWorkspaces)
        {
            send(g_oWorkspaces[sDocumentID].getDocument());
        }
        else
        {
            oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
            {
                send(new Document(sDocumentJSON));
            });
        }
    });

    oApp.post('/fork/?$', function(req, res)
    {
        function _fork(oDocument)
        {
            var sClone = oDocument.clone().toJSON();
            oDatabase.createDocument(sClone, this, function(sID)
            {
                res.redirect('/' + sID);
            });
        }

        var sDocumentID = req.body.documentID;
        if (sDocumentID in g_oWorkspaces)
        {
            _fork(g_oWorkspaces[sDocumentID].getDocument())
        }
        else
        {
            oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
            {
                var oDocument = new Document(sDocumentJSON);
                _fork(oDocument);
            });
        }
    });

    oApp.get('^/[a-z0-9]+/?$',          function(req, res) { res.sendfile('public/index.html'); });
    oApp.get('^/v/[a-z0-9]+/?$',        function(req, res) { res.sendfile('public/index.html'); });
    
    /* Preview files as HTML. */
    oApp.get('/:DocumentID([a-z0-9]+)/preview/?$', function(req, res)
    {   
        // Set response headers for HTML preview.
        res.set('Content-Type', 'text/html');
        
        // Send document text.
        var oDocument = null;
        var sDocumentID = req.params['DocumentID'];
        if (sDocumentID in g_oWorkspaces)
        {
            oDocument = g_oWorkspaces[sDocumentID].getDocument();
            res.send(oDocument.get('sText'));
        }
        else
        {
            oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
            {
                res.send((new Document(sDocumentJSON)).get('sText'));
            });
        }
    });
    
    /* Download file */
    oApp.get(':ignore(/v)?/:DocumentID([a-z0-9]+)/download/?$', function(req, res)
    {
        // Parse the url and get the file name
        var sFilename = oUrl.parse(req.url, true).query.filename;
        // Sanitize file name
        sFilename = sFilename.replace(/[^a-z0-9_\.\-]/gi, '');
        
        // Set response headers for file download.
        // Default to plain text in case there is no file name.
        res.set('Content-Type', 'text/plain');
        
        // Content-Type is automatically determined if there is a file name.
        res.attachment(sFilename);
        
        // Send document text.
        var oDocument = null;
        var sDocumentID = req.params['DocumentID'];
        if (sDocumentID in g_oWorkspaces)
        {
            oDocument = g_oWorkspaces[sDocumentID].getDocument();
            res.send(oDocument.get('sText'));
        }
        else
        {
            oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
            {
                res.send((new Document(sDocumentJSON)).get('sText'));
            });
        }
    });
});

// Instantiate server.
var oServer = oHTTP.createServer(oApp);
oServer.listen(oApp.get('port'), function()
{
    console.log("Express server listening on port " + oApp.get('port'));
});

// Instantiate websocket listener.
var oWsServer = new oWS.Server({server: oServer});
oWsServer.on('connection', function(oSocket)
{
    new Client(oSocket);
});