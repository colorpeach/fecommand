#!/usr/bin/env node

var http = require("http");
var url = require('url');
var fs = require("fs");
var io = require('socket.io');
var spawn = require('child_process').spawn;
var _ = require('lodash');
var path = require("path");

// 寻找npm命令
function searchNpmCommand (tasks, dir) {
  try {
    var packagePath = path.join(dir, 'package.json');
    var packageStat = fs.statSync(packagePath);

    if (packageStat.isFile()) {
      tasks.push({
        name: 'npm',
        list: Object.keys(JSON.parse(fs.readFileSync(packagePath, { encoding: 'utf8' })).scripts).map(function (task) {
          return 'run ' + task;
        })
      });
    }
  } catch (e) {}
}

// 寻找gulp命令
function searchGulpCommand (tasks, dir) {
  try {
    var filePath = path.join(dir, 'gulpfile.js');
    var fileStat = fs.statSync(filePath);

    if (fileStat.isFile()) {
      var content = fs.readFileSync(filePath, { encoding: 'utf8' });
      var varReg = /([^\s]+?)\s*\=\s*require\s*\([\s'"]+gulp[\s'"]+\)/;
      var gulpVar = varReg.exec(content)[1];
      var reg = new RegExp(gulpVar + '\\s*\\.task\\s*\\([\s\'\"]([a-zA-Z\\-\\_\\d]+)', 'g');
      var list = [];

      content.replace(reg, function (s, m) {
        list.push(m);
      });

      tasks.push({
        name: 'gulp',
        list: list
      });
    }
  } catch (e) {}
}

// 寻找fis命令
function searchFisCommand (tasks, dir) {
  try {
    var filePath = path.join(dir, 'fis-conf.js');
    var fileStat = fs.statSync(filePath);

    if (fileStat.isFile()) {
      var content = fs.readFileSync(filePath, { encoding: 'utf8' });
      var reg = new RegExp('fis\\s*\\.media\\s*\\([\s\'\"]([a-zA-Z\\-\\_\\d]+)', 'g');
      var list = ['server start', 'server stop'];

      content.replace(reg, function (s, m) {
        list.push('release ' + m);
      });

      tasks.push({
        name: 'fis3',
        list: list
      });
    }
  } catch (e) {}
}

function fecommand () {
  var server = require('http').createServer();
  var sio = io.listen(server, {'transports': ['websocket', 'polling']});
  var workers = [];
  var timer = 0;

  server.listen(8001);

  process.on('uncaughtException', function (e) {
    console.log(e);
  });

  sio.sockets.on('connection', function (socket) {
    clearTimeout(timer);

    // process.stdout.write('connection');

    socket.on('disconnect', function () {
      if (!Object.keys(sio.sockets.connected).length) {
        // 如果所有连接已经断开，则在30秒后退出当前进程
        timer = setTimeout(function () {
          console.log('没有连接，退出进程');
          process.exit();
        }, 30000);
      }
    });

    // 查找路径下的命令
    socket.on('registerProject', function (data) {
      var stat = fs.statSync(data.project.dir);

      if (!stat.isDirectory()) {
        // process.stdout.write("路径找不到");
        return;
      }

      var tasks = [];

      searchNpmCommand(tasks, data.project.dir);
      searchGulpCommand(tasks, data.project.dir);
      searchFisCommand(tasks, data.project.dir);
      socket.emit('tasksLoaded', { name: data.project.name, tasks: tasks });
    });
 
    // 杀死任务
    socket.on('killTask', function (data) {
      // 杀掉进程组
      // http://azimi.me/2014/12/31/kill-child_process-node-js.html
      process.kill(-data.pid);

      workers = _.remove(workers, function (worker) {
        return worker.pid !== data.pid;
      });
    });

    // 运行任务
    socket.on('runTask', function (data) {
      // process.stdout.write("Running Task:" + data.fullCmd + "\n");

      var currentTask = data.id;
      var cmd = data.fullCmd.split(' ');
      var worker = spawn(cmd[0], cmd.slice(1), { cwd: data.dir, detached: true });
      workers.push(worker);

      // 设置编码
      worker.stdout.setEncoding('utf-8');

      // 记录输出
      worker.stdout.on('data', function (data) {
        if (data) {
          var evtObj = {
            'message': data + '\n',
            'pid': worker.pid,
            'id': currentTask,
            'status': 'running'
          };
          sio.sockets.emit('onProcessRunning', evtObj);
        }

      });

      // 进程结束
      worker.stdout.on('end', function (data) {
        sio.sockets.emit('onProcessFinish', {
          'message': worker.pid + " process completed",
          'pid': worker.pid,
          'id': currentTask,
          'status': 'finish'
        });
      });

      // 如果出现错误
      worker.stderr.on('data', function (data) {
        if (data) {
          sio.sockets.emit('onProcessError', {
            'message': String.fromCharCode.apply(null, new Uint16Array(data)),
            'pid': worker.pid,
            'id': currentTask,
            'status': 'error'
          });
        }
      });

      // 进程报错退出
      worker.on('exit', function (code) {
        if (code !== 0) {
          sio.sockets.emit('onProcessExit', {
            'message': worker.pid + '|' + 'Process Exited with code: ' + code,
            'pid': worker.pid,
            'id': currentTask,
            'status': 'exit'
          });
        }
      });
    });
  });
};

// exports.init = fecommand;
var messaging = require('chrome-native-messaging');
var inited = false;

process.stdin
    .pipe(new messaging.Input())
    .pipe(new messaging.Transform(onMessage))
    .pipe(new messaging.Output())
    .pipe(process.stdout);

function onMessage (message, push, done) {
  if (message.start && !inited) {
    fecommand();
    inited = true;
    push({ start: true });
  } else {
    push(message);
  }
  done();
}


