var express = require('express');
var app = express();

app.get('/', function(req, res)
{
    res.end('Hello Josiah!');
});

var host = '127.0.0.1';
var port = 8080;
app.listen(port, host);
console.log('Listening on ' + host + ':' + port);
