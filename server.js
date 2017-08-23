const WebSocketServer = require('ws').Server;
const express = require('express');
const http = require('http');
const app = express();
const fs = require('fs');

app.use(express.static('public'));
app.use('/', express.static(__dirname + '/')); 
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); 
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); 
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/fonts', express.static(__dirname + '/node_modules/bootstrap/dist/fonts')); 
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));

const server = http.createServer(app).listen(3000);
console.log('http server is up and running');

const wss = new WebSocketServer({ server: server });
console.log('WebSocket server is up and running');

wss.on('connection', function(client) {
  console.log('A new websocket client was connected');

  client.on('message', function(message) {
    wss.broadcast(message, client);
  });
});

wss.broadcast = function(data, exclude) {
  let n = this.clients ? this.clients.length : 0;
  let client = null;

  if (n < 1) {
    return;
  }
  console.log("Broadcasting message to all " + n + " WebSocket clients.");

  for (let i = 0; i < n; i++) {
      client = this.client[i];

      if(client === exclude) continue;
      if(client.readyState === client.OPEN) client.send(data);
      else console.error('Error: the client state is ' + client.readyState);      
  }
};
