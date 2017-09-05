const WebSocketServer = require('ws');
const express = require('express');
const https = require('https');
const app = express();
const fs = require('fs');
const util = require('util');
const url = require('url');


const pkey = fs.readFileSync('./ssl/key.pem');
const pcert = fs.readFileSync('./ssl/crt.pem');
const options = { key: pkey, cert: pcert, passphrase: '123456' };

app.use(function (req, res, next) {
  if (req.headers['x-forwarded-proto'] === 'http') {
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

let cityCall;
app.post('/server', function (req, res, next) {
  cityCall = req.url.slice(11)
  console.log('url solicited ' + cityCall);
});

const server = https.createServer(options, app).listen(process.env.PORT || 5000);
console.log('http server is up and running');

const wss = new WebSocketServer.Server({ server });
console.log('WebSocket server is up and running');


let userLoggeds = [];
let connectCounter = 0;
// Broadcast to all.
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocketServer.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', function connection(ws, req) {
  console.log('New user logged ');
  console.log('Number of user logged ' + ++connectCounter);

  let getUrlUserLogged = req.url
  let userId = getUrlUserLogged.slice(1) === 'null' ? 'agente-remoto' : getUrlUserLogged.slice(1);

  ws.id = userId
  console.log('id of user ' + userId)

  userLoggeds.push(ws)

  ws.on('message', function incoming(data) {
    console.log('calling ' + cityCall)
    // Broadcast to everyone else.
    // console.log(' info data ' + util.inspect(data))
    let size = userLoggeds.length;
    for (let i = 0; i < size; i++) {
      if (userLoggeds[i] !== ws && userLoggeds[i].readyState === WebSocketServer.OPEN) {
        if (userLoggeds[i].id === cityCall || userLoggeds[i].id === 'agente-remoto') {
          console.log('start chat with ' + userLoggeds[i].id);
          userLoggeds[i].send(data);
        }
      }
    }


    //   wss.clients.forEach(function each(client) {
    //     if (client !== ws && client.readyState === WebSocketServer.OPEN) {
    //       if( client.id === cityCall)
    //         console.log('start chat with ' + client.id);
    //         client.send(data);
    //       }
    //   });
  });

  ws.on('close', function close() {
    console.log('disconnected');
    console.log('Number of users logged ' + --connectCounter);
  });
});
