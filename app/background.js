
// var application = 'com.colorbox.fecommand';
// var ports = [];

// chrome.runtime.onConnect.addListener(function(port) {
//     if (port.name !== "fecommand") return;

//     // 连接native messaging host
//     var nativePort = chrome.runtime.connectNative(application);

//     ports.push(port);
//     // Remove port when destroyed (eg when devtools instance is closed)
//     port.onDisconnect.addListener(function() {
//         var i = ports.indexOf(port);
//         if (i !== -1) ports.splice(i, 1);
//     });
//     port.onMessage.addListener(function(msg) {
//         // Received message from devtools.
//         // console.log('Received message from devtools page', msg);
//           // 启动本地nodejs socket服务器
//           chrome.runtime.sendNativeMessage(application, JSON.parse(msg), function (message) {
//             if (message) {
//               notifyDevtools(message);
//             } else {
//               notifyDevtools('disconnect native messaging:' + chrome.runtime.lastError.message);
//             }
//           });
//     });

//     nativePort.onDisconnect.addListener(function () {
//       notifyDevtools('disconnect native messaging:' + chrome.runtime.lastError.message)
//     });
//     nativePort.onMessage.addListener(notifyDevtools);

//     notifyDevtools('native messaging start');
// });

// // Function to send a message to all devtools.html views:
// function notifyDevtools(msg) {
//   var str = JSON.stringify(msg);
//     ports.forEach(function(port) {
//         port.postMessage(str);
//     });
// }