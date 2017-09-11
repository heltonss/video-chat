navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition
  || window.msSpeechRecognition || window.oSpeechRecognition;


let remoteVideoElem = null;
let localVideoElem = null;
let localVideoStream = null;
let videoCallButton = null;
let handleVideo = null;
let endCallButton = null;
let peerConn = null;
let wss = null, sslSrv = null;
document.getElementById('title').style.visibility = "hidden";

let urlOfClient = new URL(document.URL)

let wsc = new WebSocket('wss://' + location.host + '/' + urlOfClient.searchParams.get('id'));
console.log(location.host);
let peerConnCfg = {
  'iceServers': [
    { 'urls': 'stun:stun.services.mozilla.com' },
    { 'urls': 'stun:stun.l.google.com:19302' }
  ]
};

function pageReady() {
  if (navigator.getUserMedia) {
    videoCallButton = document.getElementById('videoCallButton');
    remoteVideoElem = document.getElementById('remoteVideoElem');
    localVideoElem = document.getElementById('localVideoElem');
    endCallButton = document.getElementById('endCallButton');
    handleVideo = document.getElementById('handleVideo');

    getCityId();

    handleVideo.addEventListener('click', function (evt) {
      localVideoStream.getVideoTracks()[0].enabled = !(localVideoStream.getVideoTracks()[0].enabled);
    })
    endCallButton.addEventListener('click', function (evt) {
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

function getCityId() {
  let nav = document.getElementById('navigation');
  nav.addEventListener('click', function (e) {
    requestOfCall(e.target.id);
  })

}

function requestOfCall(city) {
  let xhr = new XMLHttpRequest();
  xhr.open('POST', '/server?id=' + city, true);
  xhr.send()
}

function initiateCall() {
  prepareCall();
  navigator.getUserMedia(
    {
      'audio': true,
      'video': true
    },
    function (stream) {
      localVideoStream = stream
      localVideoElem.srcObject = stream;
      peerConn.addStream(localVideoStream);
      
    
      createAndSendOffer();
    },
    function (error) {
      console.log('erro ao iniciar a chamada ' + error);
    }
  );
}

function answerCall() {
  prepareCall();
  let conf = window.confirm('Chamada do agente remoto');
  if (conf == true) {
    navigator.getUserMedia(
      {
        'audio': true,
        'video': true
      },
      function (stream) {
        localVideoStream = stream
        localVideoElem.srcObject = stream;
        peerConn.addStream(localVideoStream);
        createAndSendAnswer();
      },
      function (error) {
        console.log('erro ao enviar a resposta ' + error);
      }
    );
  } else {
    return;
  }
}


wsc.onmessage = function (evt) {
  let signal = null;
  if (!peerConn) {
    answerCall();
  }

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
        function () {
          wsc.send(JSON.stringify({ 'sdp': off }));
        },
        function (error) {
          console.log(error);
        }
      );
    },
    function (error) {
      console.log('erro ao criar a conexão e enviar offer ' + error);
    }
  );
}

function createAndSendAnswer() {
  peerConn.createAnswer(function (answer) {
    let ans = new RTCSessionDescription(answer);
    peerConn.setLocalDescription(
      ans,
      function () {
        wsc.send(JSON.stringify({ 'sdp': ans }));
      },
      function (error) {
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

  remoteVideoElem.srcObject = evt.stream;
}

function endCall() {
  peerConn.close();
  peerConn = null;
  endCallButton.setAttributte('disabled', true);
  if (localVideoStream) {

    localVideoStream.getTracks().forEach(function (track) {
      track.stop();
    });
  }
}

function notifyCall() {
  Notification.requestPermission(function () {
    Notification.permission = 'granted';
    let notification = new Notification('Agente Remoto', {
      body: 'Atenda essa chamada'
    });
    notification.onclick = function () {
      window.open('https://localhost:5000/posto.html?id=sao-bento-sapucai');
    }
  })
}

if (remoteVideoElem) {
  remoteVideoElem.src = ''
}





window.onload = pageReady();
