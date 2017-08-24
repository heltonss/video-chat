const WebSocketServer = require('ws').Server;
const express = require('express');
const https = require('https');
const app = express();
const fs = require('fs');

const pkey = fs.readFileSync('./ssl/ssl.key');
const pcert = fs.readFileSync('./ssl/ssl.crt');
const options = {key: pkey, cert: pcert};

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
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));

const server = https.createServer(options, app).listen(process.env.PORT || 5000, () => console.log('it\'s ok'));
console.log('http server is up and running');

const wss = new WebSocketServer({server: server });
console.log('WebSocket server is up and running');

wss.on('connection', function (client) {
  console.log('A new websocket client was connected');

  client.on('message', function (message) {
    wss.broadcast(message, client);
  });
});

wss.broadcast = function (data, exclude) {
  let n = this.clients ? this.clients.length : 0;
  let client = null;
  let i = 0

  if (n < 1) {
    return;
  }
  console.log("Broadcasting message to all " + n + " WebSocket clients.");

  for (; i < n; i++) {
      client = this.clients[i];

      if(client === exclude) continue;
      if(client.readyState === client.OPEN) client.send(data);
      else console.error('Error: the client state is ' + client.readyState);      
  }
};
