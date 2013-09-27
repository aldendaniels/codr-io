
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
var oPasswordHash       = require('password-hash');
var oConnect            = require('connect');

// Import helpers.
var oHelpers     = require('./public/javascripts/helpers/helpers');
var Client       = require('./client');
var Workspace    = require('./workspace');
var Document     = require('./document');
var oDatabase    = require('./database');

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
    oConfig.sUserDataPath = oPath.join(oConfig.sDataPath, 'users');
    if(!oFS.existsSync(oConfig.sUserDataPath))
        oFS.mkdirSync(oConfig.sUserDataPath);
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
var oCookieParser = new oExpress.cookieParser('testing');
var oSessionStore = new oConnect.session.MemoryStore();
oApp.configure(function()
{
    oApp.set('port', g_oConfig.iPort);

    oApp.use(oCookieParser);
    oApp.use(oExpress.session({secret: 'testing', store: oSessionStore}));
    
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

    oApp.get('^/login/?$', function(req, res)
    {
        if (req.session.sUser)
        {
            res.redirect('/');
            return;
        }

        res.sendfile('public/login.html');
    });
    oApp.post('^/login/?$', function(req, res) {
        oDatabase.userExists(req.body.username, this, function(bExists)
        {
            if (!bExists)
            {
                res.redirect('/login?error=invalid username');
                return;
            }

            oDatabase.getUser(req.body.username, this, function(sUser)
            {
                var oUser = new User(sUser);
                if (oUser.checkPassword(req.body.password))
                {
                    req.session.sUser = req.body.username;
                    res.redirect('/');
                }
                else
                    res.redirect('/login?error=invalid password');
            });
        });
    });

    oApp.get('^/logout/?$', function(req, res)
    {
        req.session.sUser = null;
        res.redirect('/login');
    });

    oApp.get('^/signup/?$', function(req, res)
    {
        if (req.session.sUser)
        {
            res.redirect('/logout');
            return;
        }

        res.sendfile('public/signup.html');
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