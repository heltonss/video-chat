navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition 
  || window.msSpeechRecognition || window.oSpeechRecognition;


let remoteVideoElem = null;
let localVideoElem = null;
let localVideoStream = null;
let videoCallButton = null;
let endCallButton = null;
let peerConn = null;
let wss = null, sslSrv = null;

let wsc = new WebSocket('wss://' + location.host);
console.log(location.host);
let peerConnCfg = {
  'iceServers': [
    { 'url': 'stun:stun.services.mozilla.com' },
    { 'url': 'stun:stun.l.google.com:19302' }
  ],
  iceTransports: 'relay'
};

function pageReady() {
  if (navigator.getUserMedia) {
    videoCallButton = document.getElementById('videoCallButton');
    remoteVideoElem = document.getElementById('remoteVideoElem');
    endCallButton = document.getElementById('endCallButton');

    videoCallButton.removeAttribute('disabled');
    videoCallButton.addEventListener('click', initiateCall);
    endCallButton.addEventListener('click', function(evt) {
      wsc.send(JSON.stringify({ 'closeConnection': true }));
    });
  } else {
    alert('seu navegador não suporta stream de video');
  }
}
function prepareCall() {
  peerConn = new RTCPeerConnection(peerConnCfg);
  peerConn.onicecandidate = onIceCandidateHandler;
  peerConn.onaddstream = onAddStreamHandler;
}

function initiateCall() {
  prepareCall();

  navigator.getUserMedia(
    {
      'audio': true,
      'video': true
    },
    function(stream) {
      localVideoStream = stream
      peerConn.addStream(localVideoStream);
      createAndSendOffer();
    },
    function(error) {
      console.log('erro ao iniciar a chamada ' + error);
    }
  );
}

function answerCall() {
  prepareCall();

  navigator.getUserMedia(
    {
      'audio': true,
      'video': true
    },
    function(stream) {
      localVideoStream = stream
      peerConn.addStream(localVideoStream);
      createAndSendAnswer();
    },
    function(error) {
      console.log('erro ao enviar a resposta ' + error);
    }
  );
}


wsc.onmessage = function (evt) {
  let signal = null;
  if (!peerConn) answerCall();
  signal = JSON.parse(evt.data);
  if (signal.sdp) {
    peerConn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
  } 
  else if (signal.candidate) {
    peerConn.addIceCandidate(new RTCIceCandidate(signal.candidate));
  } 
  else if (signal.closeConnection) {
    endCall();
  }
};

function createAndSendOffer() {
  peerConn.createOffer(
    function (offer) {
      let off = new RTCSessionDescription(offer);
      peerConn.setLocalDescription(
        new RTCSessionDescription(off),
        function() {
          wsc.send(JSON.stringify({'sdp': off }));
        },
        function(error) {
          console.log(error);
        }
      );
    },
    function(error) {
      console.log('erro ao criar a conexão e enviar offer ' + error);
    }
  );
}

function createAndSendAnswer() {
  peerConn.createAnswer(function(answer) {
    let ans = new RTCSessionDescription(answer);
    peerConn.setLocalDescription(
      ans,
      function() {
        wsc.send(JSON.stringify({'sdp': ans }));
      },
      function(error) {
        console.log('erro ao criar resposta' + error);
      }
    );
  },
  function (error) {
    console.log(error);
  });
}


function onIceCandidateHandler(evt) {
  if (!evt || !evt.candidate) return;
  wsc.send(JSON.stringify({ 'candidate': evt.candidate }));
}

function onAddStreamHandler(evt) {
  videoCallButton.setAttribute('disabled', true);
  endCallButton.removeAttribute('disabled');
  remoteVideoElem.src = URL.createObjectURL(evt.stream);
}

function endCall() {
  peerConn.close();
  peerConn = null;
  videoCallButton.removeAttribute('disabled');
  endCallButton.setAttributte('disabled', true);
  if(localVideoStream){

    localVideoStream.getTracks().forEach(function(track) {
      track.stop();
    });
  }
}

if (remoteVideoElem) {
  remoteVideoElem.src = ''
}

window.onload = pageReady();
