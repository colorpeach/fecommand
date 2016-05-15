#!/usr/local/bin/node
//#!/usr/local/bin/node --debug-brk

var http = require("http");
var fs = require("fs");
var spawn = require('child_process').spawn;
var path = require("path");
var EventEmitter = require('events').EventEmitter;

function find (list, key, value) {
  for (var i = 0; i < list.length; i++) {
    if (list[i][key] === value) {
      return list[i];
    }
  }
}

function findIndex (list, key, value) {
  for (var i = 0; i < list.length; i++) {
    if (list[i][key] === value) {
      return i;
    }
  }
  return -1;
}

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

// 初始化项目
function initProject (project) {
  try {
    var stat = fs.statSync(project.dir);

    if (!stat.isDirectory()) {
      api.emit('error', { messsage: '项目' + project.name + '路径无效' });
      return;
    }

    var tasks = [];

    searchNpmCommand(tasks, project.dir);
    searchGulpCommand(tasks, project.dir);
    searchFisCommand(tasks, project.dir);

    taskMap[project.id] = tasks;

    // 加载任务
    api.emit('loaded', { id: project.id, tasks: tasks });
  } catch (e) {
    api.emit('error',{ message: e });
  }
}

// 创建子进程
function spawnTask (id, api) {
  var task = find(openingTasks, 'id', id);
  var cmd = task.cmd.split(' ');
  var worker = spawn(cmd[0], cmd.slice(1), { cwd: task.project.dir, env: { PATH: process.env.PATH + ':/usr/local/bin' }});
  var passData = {
    id: task.id,
    pid: worker.pid,
    message: ''
  }

  // 设置编码
  worker.stdout.setEncoding('utf8');

  worker.stdout.on('data', onData);
  worker.stdout.on('end', onEnd);
  worker.stderr.on('data', onError);
  worker.on('exit', onExit);
  worker.on('error', onSpawnError);

  // 任务运行
  function onData (data) {
    if (!data) { return; }
    passData.status = 'running';
    passData.message = data + '\n';
    api.emit('onProcessRunning', passData);
  }

  // 任务结束
  function onEnd () {
    passData.status = 'end';
    passData.message = worker.pid + '|' + "Process completed";
    api.emit('onProcessFinish', passData);
  }

  // 任务出错
  function onError (data) {
    passData.status = 'error';
    passData.message = String.fromCharCode.apply(null, new Uint16Array(data));
    api.emit('onProcessError', passData);
  }

  // 进程出错
  function onSpawnError (err) {
    passData.status = 'error';
    passData.message = 'ERROR: ' + err.message;
    api.emit('onProcessError', passData);
  }

  // 进程退出
  function onExit (code) {
    passData.status = 'exit';
    passData.message = worker.pid + '|' + 'Process exited with code: ' + code;
    api.emit('onProcessExit', passData);
  }
}

/**
 * Native Messaging
 * 代码来源于https://github.com/petethepig/devtools-terminal/blob/master/backend/bin/devtools-terminal#L57
 */
function NativeMessagingAPI(){
  var self = this;
  var mode = 0;
  var read_length = 0;

  this.emit = function(event, data, portId){
    var msg = JSON.stringify({
      event: event,
      data: data,
      portId: portId
    });
    var length = new Buffer(msg).length;
    var length_str = new Buffer(4);
    length_str.writeInt32LE(length, 0);
    process.stdout.write(length_str);
    process.stdout.write(msg);
  }

  function processInput(){
    if(mode == 0){
      var len = process.stdin.read(4);
      if(len != null){
        read_length = len.readInt32LE(0);
        mode = 1;
        processInput();
      }
    }else{
      var msg = process.stdin.read(read_length);
      if(msg != null){
        msg = JSON.parse(msg);
        EventEmitter.prototype.emit.call(self, msg.event, msg.data, msg.portId);
        mode = 0;
      }
    }
  }
  this.processInput = processInput;
}
NativeMessagingAPI.prototype = Object.create(EventEmitter.prototype);

var api = new NativeMessagingAPI();
var projects = [];
var openingTasks = [];
var taskMap = {};
var inited = false;

// 初始化
api.on('pageInit', function (data, portId) {
  if (!inited) {
    projects = data.projects;
    data.projects.forEach(initProject);
    openingTasks = data.openingTasks;
    inited = true;
  }
  api.emit('init', { projects: projects, openingTasks: openingTasks, taskMap: taskMap }, portId);
});

api.on('projectChange', function (data) {
  api.emit('onProjectChange', data);
  if (data.type === 'add') {
    initProject(data.project);
    projects.push(data.project);
  } else if (data.type === 'update') {
    var index = findIndex(projects, 'id', data.project.id);
    index > -1 && (projects[index] = data.project);
  } else if (data.type === 'remove') {
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === data.project.id) {
        projects.splice(i, 1);
        break;
      }
    }
  }
});

api.on('openingTaskChange', function (data) {
  api.emit('onOpeningTaskChange', data);
  if (data.type === 'add') {
    openingTasks.push(data.openingTask);
  } else {
    for (var i = 0; i < openingTasks.length; i++) {
      if (openingTasks[i].id === data.id) {
        openingTasks.splice(i, 1);
        break;
      }
    }
  }
});

// 运行任务
api.on('run', function (data) {
  spawnTask(data.id, api);
});

// // 杀掉进程
api.on('kill', function (data) {
  // 杀掉进程组
  // http://azimi.me/2014/12/31/kill-child_process-node-js.html
  try {
    if (!process.kill(data.pid)) {
      process.kill(-data.pid);
    }
  } catch (e) {}
});

process.stdin.on('readable', function() {
  api.processInput();
});

// 退出时，通知背景页
process.on('exit', function (code) {
  api.emit('nativeError', { code: code });
});

// 发送启动命令
api.emit('mpInit', {});
