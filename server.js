const WebSocketServer = require('ws');
const express = require('express');
const https = require('https');
const app = express();
const fs = require('fs');

const pkey = fs.readFileSync('./ssl/key.pem');
const pcert = fs.readFileSync('./ssl/crt.pem');
const options = {key: pkey, cert: pcert, passphrase: '123456'};

app.use(function(req, res, next) {
  if(req.headers['x-forwarded-proto']==='http') {
    return res.redirect(['https://', req.get('Host'), req.url].join(''));
  }
  next();
});

app.use(express.static('public'));
app.use('/', express.static(__dirname + '/')); 
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); 
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); 
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/fonts', express.static(__dirname + '/node_modules/bootstrap/dist/fonts')); 
app.use('/js', express.static(__dirname + '/node_modules/webrtc-adapter/out')); 
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));

const server = https.createServer(options, app).listen(process.env.PORT || 5000, () => console.log('it\'s ok'));
console.log('http server is up and running');

const wss = new WebSocketServer.Server({server});
console.log('WebSocket server is up and running');


// Broadcast to all.
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocketServer.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    // Broadcast to everyone else.
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocketServer.OPEN) {
        client.send(data);
      }
    });
  });
});
