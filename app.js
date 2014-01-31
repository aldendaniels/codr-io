
// Include 3rd party node libraries.
var oOS                 = require('os');
var oPath               = require('path');
var oFS                 = require('fs');
var oUrl                = require('url');
var oExpress            = require('express');
var oWS                 = require('ws');
var oHTTP               = require('http');
var oLessMiddleware     = require('less-middleware');

// Setup global config parameters.
require('./config');
var sPublicDir = (g_oConfig.bIsProd ? './public_build' : './public');

// Import helpers.
var oHelpers     = require('./helpers-node');
var Client       = require('./client');
var EditSession  = require('./edit-session');
var Document     = require('./document');
var oDatabase    = require('./database');

// Error handling. // TODO: This is a horrible hack.
if (g_oConfig.bIsProd)
{
    process.on('uncaughtException', function (err)
    {
        console.error(err); // Keep node from exiting.
    });
}

// Create express app.
var oApp = oExpress();
oApp.configure(function()
{
    oApp.set('port', g_oConfig.iPort);

    // AldenD: Josiah added to support forking.
    // See http://expressjs.com/api.html
    oApp.use(oExpress.bodyParser());

    // Configure LESS compilation in dev.
    if (!g_oConfig.bIsProd)
    {
        // Configure LESS middleware.
        // Create empty codr_less_output directory.
        var sLessOutputDir = oPath.join(oOS.tmpDir(), 'codr_less_output');
        if (oFS.existsSync(sLessOutputDir))
            oHelpers.emptyDirSync(sLessOutputDir);
        else
            oFS.mkdirSync(sLessOutputDir);
            
        oApp.use(oLessMiddleware(
        {
            src: sPublicDir,
            dest: sLessOutputDir
        }));
        oApp.use(oExpress.static(sLessOutputDir));
    }
    
    // Server static content.
    oApp.use(oExpress.static(sPublicDir));        

    /* Save static index.html */
    oApp.get('^/$', function(req, res)
    {
        res.sendfile(sPublicDir + '/index.html');
    });

    oApp.get('^/tests/?$', function(req, res) { res.sendfile(sPublicDir + '/tests.html'); });

    oApp.get('^/ajax/:DocumentID([a-z0-9]+)/?$', function(req, res) {

        function send(oDocument)
        {
            res.set('Content-Type', 'text/json');

            if (oDocument.get('bIsSnapshot'))
                res.send(oDocument.toJSON());
            else
            {
                var sError = 'The document has not been published. Please click <a href="/' + sDocumentID + '/">here</a> to see the original.';
                res.send(oHelpers.toJSON({'sError': sError}));
            }
        }

        var sDocumentID = req.params['DocumentID'];
        if (sDocumentID in g_oEditSessions)
        {
            send(g_oEditSessions[sDocumentID].getDocument());
        }
        else
        {
            oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
            {
                send(new Document(sDocumentJSON));
            });
        }
    });
    
    oApp.post('^/fork/?$', function(req, res)
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
        if (sDocumentID in g_oEditSessions)
        {
            _fork(g_oEditSessions[sDocumentID].getDocument())
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

    oApp.get('^/[a-z0-9]+/?$',          function(req, res) { res.sendfile(sPublicDir + '/index.html'); });
    oApp.get('^/v/[a-z0-9]+/?$',        function(req, res) { res.sendfile(sPublicDir + '/index.html'); });

    /* Preview files as HTML. */
    oApp.get('/:DocumentID([a-z0-9]+)/preview/?$', function(req, res)
    {
        res.sendfile(sPublicDir + '/preview.html');
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
        if (sDocumentID in g_oEditSessions)
        {
            oDocument = g_oEditSessions[sDocumentID].getDocument();
            // TODO: Determine correct line-ending client-side.
            res.send(oDocument.get('aLines').join('\r\n'));
        }
        else
        {
            oDatabase.getDocument(sDocumentID, this, function(sDocumentJSON)
            {
                // TODO: Should determine correct line-ending server-side.
                res.send((new Document(sDocumentJSON)).get('aLines').join('\r\n'));
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
    new Client(oSocket, '');
});
