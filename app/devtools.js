var mp = function () {
  var port = chrome.runtime.connect({name: 'fecommand'});
  var r = {};
  var _events = [];

  port.onMessage.addListener(function (msg) {
    console.log('response: ' + msg.event, msg.data);
    _events.forEach(function (item) {
      if (item.event === msg.event) {
        item.fn(msg.data);
      }
    });
  });

  port.onDisconnect.addListener(function (msg) {
    console.log('error: ' + (msg || chrome.runtime.lastError.message));
    _events.forEach(function (item) {
      if (item.event === 'error') {
        item.fn(msg || chrome.runtime.lastError.message);
      }
    });
  });

  r.emit = function (event, data) {
    console.log('emit: ' + event);
    return port.postMessage({ event: event, data: data });
  };
  r.on = function (event, fn) {
    _events.push({ event: event, fn: fn });
  };

  return r;
};

chrome.devtools.panels.create(
  "fecommand", 
  "images/icon-128.png",
  "index.html",
  function (extensionPanel) {
    var _window; // Going to hold the reference to panel.html's `window`
    var data = [];

    extensionPanel.onShown.addListener(function tmp(panelWindow) {
      extensionPanel.onShown.removeListener(tmp);
      _window = panelWindow;
      _window.mp = mp();
      _window.init();
    });
  }
);