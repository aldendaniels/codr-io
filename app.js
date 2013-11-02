
// Include 3rd party node libraries.
var oOS                 = require('os');
var oPath               = require('path');
var oFS                 = require('fs');
var oUrl                = require('url');
var oExpress            = require('express');
var oWS                 = require('ws');
var oHTTP               = require('http');
var oLessMiddleware     = require('less-middleware');
var oPasswordHash       = require('password-hash');
var oConnect            = require('connect');

// Setup global config parameters.
require('./config');

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
var oCookieParser = new oExpress.cookieParser('testing');
var oSessionStore = new oConnect.session.MemoryStore();
oApp.configure(function()
{
    oApp.set('port', g_oConfig.iPort);

    oApp.use(oCookieParser);
    oApp.use(oExpress.session({secret: 'testing', store: oSessionStore}));


    // AldenD 11/01/2013: What does this do?
    oApp.use(oExpress.bodyParser());

    // Configur static serving.
    if (g_oConfig.bIsProd)
    {
        oApp.use(oExpress.static(oPath.join(__dirname, 'public/build')));        
    }
    else
    {
        // Configure LESS middleware.
        if (!g_oConfig.bIsProd)
        {
            // Create empty codr_less_output directory.
            var sLessOutputDir = oPath.join(oOS.tmpDir(), 'codr_less_output');
            if (oFS.existsSync(sLessOutputDir))
                oHelpers.emptyDirSync(sLessOutputDir);
            else
                oFS.mkdirSync(sLessOutputDir);
                
            oApp.use(oLessMiddleware(
            {
                src: __dirname + '/public',
                dest: sLessOutputDir
            }));
        }
        
        // Server static content.
        oApp.use(oExpress.static(sLessOutputDir));
        oApp.use(oExpress.static(oPath.join(__dirname, 'public')));        
    }

    var sHTMLPath = (g_oConfig.bIsProd ? 'public/build/html/' : 'public/html/');
    
    /* Save static index.html */
    oApp.get('^/$', function(req, res)
    {
        res.sendfile(sHTMLPath + 'index.html');
    });

    oApp.get('^/login/?$', function(req, res)
    {
        if (req.session.sUser)
        {
            res.redirect(oUrl.parse(req.url, true).query.next || '/');
            return;
        }
        
        res.sendfile(sHTMLPath + 'login.html');
    });

    oApp.post('^/login/?$', function(req, res)
    {
        oDatabase.userExists(req.body.username, this, function(bExists)
        {
            var sErrorUrl = '/login?error=true'
            
            var sNext = oUrl.parse(req.url, true).query.next;
            if (sNext)
                sErrorUrl += ('&next=' + sNext)
            
            if (!bExists)
            {
                res.redirect(sErrorUrl);
                return;
            }
            
            oDatabase.getUser(req.body.username, this, function(sUser)
            {
                var oUser = new User(sUser);
                if (oUser.checkPassword(req.body.password))
                {
                    req.session.sUser = req.body.username;
                    res.redirect(sNext || '/');
                }
                else
                    res.redirect(sErrorUrl);
            });
        });
    });

    oApp.get('^/logout/?$', function(req, res)
    {
        req.session.sUser = null;
        res.redirect(oUrl.parse(req.url, true).query.next || '/login');
    });

    oApp.get('^/signup/?$', function(req, res)
    {
        if (req.session.sUser)
        {
            res.redirect('/logout');
            return;
        }

        res.sendfile(sHTMLPath + 'signup.html');
    });
    oApp.post('^/signup/?$', function(req, res)
    {
        oDatabase.userExists(req.body.username, this, function(bExists)
        {
            if (!bExists)
            {
                createNewUser(req.body.username, req.body.email, req.body.password, this, function()
                {
                    req.session.sUser = req.body.username;
                    res.redirect('/');
                });
                return;
            }
            res.redirect('/signup?error = That user already exists.');
        });
    });

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


    oApp.get('^/userInfo/?$', function(req, res)
    {
        if (!req.session.sUser)
        {
            res.send(JSON.stringify({bLoggedIn: false}));
            return;
        }

        var oInfo = {
            bLoggedIn: true,
            sUsername: req.session.sUser,
        };

        res.send(JSON.stringify(oInfo));
    });

    oApp.get('^/[a-z0-9]+/?$',          function(req, res) { res.sendfile(sHTMLPath + 'index.html'); });
    oApp.get('^/v/[a-z0-9]+/?$',        function(req, res) { res.sendfile(sHTMLPath + 'index.html'); });

    /* Preview files as HTML. */
    oApp.get('/:DocumentID([a-z0-9]+)/preview/?$', function(req, res)
    {
        // Set response headers for HTML preview.
        res.set('Content-Type', 'text/html');

        // Send document text.
        var oDocument = null;
        var sDocumentID = req.params['DocumentID'];
        if (sDocumentID in g_oEditSessions)
        {
            oDocument = g_oEditSessions[sDocumentID].getDocument();
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
        if (sDocumentID in g_oEditSessions)
        {
            oDocument = g_oEditSessions[sDocumentID].getDocument();
            // TODO: Should determine correct line-ending server-side.
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
    oCookieParser(oSocket.upgradeReq, null, function(err)
    {
        if ('connect.sid' in oSocket.upgradeReq.signedCookies)
        {
            oSessionStore.get(oSocket.upgradeReq.signedCookies['connect.sid'], function(err, oSession)
            {
                var sUser = oSession.sUser || '';
                new Client(oSocket, sUser);
            });
        }
        else
            new Client(oSocket, '');
    });
});

var User = oHelpers.createClass({
    _sUsername: '',
    _sEmail: '',
    _aDocuments: null,
    _sPasswordHash: '',
    __init__: function(sData)
    {
        var oData = oHelpers.fromJSON(sData);
        this._sUsername = oData.sUsername;
        this._sEmail = oData.sEmail;
        this._aDocuments = oData.aDocuments;
        this._sPasswordHash = oData.sPasswordHash;
    },

    checkPassword: function(sPassword)
    {
        return oPasswordHash.verify(sPassword, this._sPasswordHash);
    },

    save: function(oScope, fnOnResponse)
    {
         oDatabase.saveUser(this._sUsername, oHelpers.toJSON({
            sUsername: this._sUsername,
            sEmail: this._sEmail,
            aDocuments: this._aDocuments,
            sPasswordHash: this._sPasswordHash
        }), oScope, fnOnResponse);
    }
});

function createNewUser(sUsername, sEmail, sPassword, oScope, fnOnResponse)
{
    var oData = {
        sUsername: sUsername,
        sEmail: sEmail,
        aDocuments: [],
        sPasswordHash: oPasswordHash.generate(sPassword, {algorithm: 'sha256'})
    };

    var oUser = new User(oHelpers.toJSON(oData));
    oUser.save(this, function(sError)
    {
        // Handle error.
        oHelpers.createCallback(oScope, fnOnResponse)(oUser);
    });
}
