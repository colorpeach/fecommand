var connect = (function () {
  var socket = io.connect("http://localhost:8001", {'transports': ['websocket', 'polling']});
  var connect = {};

  connect.socket = socket;

  function showHelpView (e) {
    console.log(arguments);
  }

  socket.on('connect_failed', showHelpView);

  //on socket error
  socket.on('error', showHelpView);

  //on socket disconnected
  socket.on('disconnect', showHelpView);

  // 注册项目
  connect.registerProject = function (data) {
    socket.emit('registerProject', data);
  };

  connect.runTask = function (data) {
    socket.emit('runTask', data);
  };

  return connect;
})();

var store = (function () {
  return {
    set: function (name, data) {
      localStorage.setItem(name, JSON.stringify(data));
    },
    get: function (name) {
      var data = localStorage.getItem(name);

      return data ? JSON.parse(data) : null;
    }
  }
})();


var application = 'com.colorbox.fecommand';
var nativePort = chrome.runtime.connectNative(application);

nativePort.onDisconnect.addListener(function () {
  console.log('disconnect native messaging:' + chrome.runtime.lastError.message)
});
nativePort.onMessage.addListener(function (msg) {
  console.log(msg)
});

nativePort.postMessage(JSON.stringify({ "start": false }));