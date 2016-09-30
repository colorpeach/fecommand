var nmInited = false; // native host是否已经初始化完成
var isConnected = false; // 是否已经启动了native host
// native messaging单例
var nm = function () {
  var application = 'com.colorbox.fecommand';
  var nativePort = null;
  var r = {};
  var _events = [];

  r.emit = function (data) {
    if (!nativePort) {
      r.connect();
    }
    return nativePort.postMessage(data);
  };

  r.on = function (fn) {
    _events.push(fn);
  };

  r.off = function (fn) {
    for (var i = 0; i < _events.length; i++) {
      if (fn === _events[i]) {
        _events.splice(i, 1);
      }
    }
  };

  r.connect = function () {
    if (nativePort) { return; }

    nativePort = chrome.runtime.connectNative(application);

    nativePort.onMessage.addListener(function (msg) {
      console.log('from native: ', msg);
      if (msg.event === 'nativeError') {
        nativePort = null;
        nmInited = isConnected = false;
      }

      if (msg.event === 'mpInit') {
        // 通知没有初始化的devtools初始化
        nmInited = true;
        ports.forEach(function (port) {
          port.postMessage({ event: 'portInited' });
        });
        return;
      }
      _events.forEach(function (item) {
        item(msg);
      });
    });

    nativePort.onDisconnect.addListener(function () {
      nativePort = null;
      nmInited = isConnected = false;
      _events.forEach(function (item) {
        item({ event: 'error', data: chrome.runtime.lastError.message});
      });
    });

    isConnected = true;
  };

  return r;
}();

var ports = [];
var priviteMessages = ['init']; // 不需要广播的任务名称
var portId = 1;

// devtools连接到这里
chrome.runtime.onConnect.addListener(function(port) {
  if (port.name !== "fecommand") return;

  var id = portId++;
  var onNativeMessage = function (msg) {
    if (priviteMessages.indexOf(msg.event) > -1 && msg.portId === id) {
      port.postMessage(msg);
    }
  };

  ports.push(port);

  // 连接断开时，将对应的devtools端口删除
  port.onDisconnect.addListener(function() {
    for (var i = 0; i < ports.length; i++) {
      if (port === ports[i]) {
        ports.splice(i, 1);
        break;
      }
    }
    nm.off(onNativeMessage);
    port = null;
    onNativeMessage = null;
  });

  port.onMessage.addListener(function(msg) {
    // 接收devtools发来的信息
    msg.portId = id;
    nm.emit(msg);
    console.log('from devtools: ', msg);
  });

  if (!isConnected) {
    // 如果native host还没有启动，需要启动native host
    nm.connect();
  }

  if (nmInited) {
    port.postMessage({ event: 'portInited' });
  }

  nm.on(onNativeMessage);
});

// 接收native host发来的消息，转发给devtools
nm.on(function (msg) {
  if (priviteMessages.indexOf(msg.event) < 0) {
    ports.forEach(function(port) {
      port.postMessage(msg);
    });
  }
});