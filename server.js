
// Include Libraries.
var oExpress = require('express');
var oWS = require('ws');
var oHTTP = require('http');

// Create express app.
var oApp = oExpress();
oApp.use(oExpress.static(__dirname + '/static'));

// Instantiate server.
var oServer = oHTTP.createServer(oApp);
oServer.listen(8080);

// Instantiate websocket listener.
var oWsServer = new oWS.Server({server: oServer});
oWsServer.on('connection', function(oSocket)
{
    oSocket.on('message', function(sMessage)
    {
        console.log('received: %s', sMessage);
    });
    oSocket.send('something');
});