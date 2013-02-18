var express = require('express');
var ws = require('ws');

var host = '127.0.0.1';
var portHTTP = 8080;
var portWS   = 8081; 

// Socket server.
var wsServer = new ws.Server({port: portWS});
wsServer.on('connection', function(ws)
{
    ws.on('message', function(message)
    {
        console.log('received: %s', message);
    });
    ws.send('something');
});
console.log('Websocket listening on ' + host + ':' + portWS);

// Http server
var app = express();
app.get('/', function(req, res)
{
    res.end('Hello Josiah!');
});
app.listen(portHTTP, host);
console.log('Express listening on ' + host + ':' + portHTTP);
