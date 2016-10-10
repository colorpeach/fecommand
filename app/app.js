new Vue({
  el: '#app',
  ready: function () {
    var vm = this;

    Vue.$alert = Vue.prototype.$alert = vm.$refs.alert.open.bind(vm.$refs.alert);

    window.init = function () {
      vm.loaded = true;
      
      mp.on('portInited', function () {
        vm.connect = true;

        // 初始化项目
        mp.emit('pageInit', {
          projects: store.get('projects') || [],
          openingTasks: store.get('openingTasks') || [],
          settings: vm.settings
        });

        // 数据就绪，开始初始化
        mp.on('init', function (data) {
          vm.$set('projects', data.projects);
          vm.$set('openingTasks', data.openingTasks);
          vm.$set('taskMap', data.taskMap);
          vm.$set('currentTask', data.openingTasks[0] || {});
        });

        // 加载项目的任务列表
        mp.on('loaded', function (data) {
          vm.$set('taskMap["' + data.id + '"]',  data.tasks);
        });

        // 处理projects和project
        mp.on('onProjectChange', function (data) {
          switch (data.type) {
            case 'add':
              vm.projects.push(data.project);
            break;
            case 'update':
              $.extend(_.find(vm.projects, { id: data.project.id }), data.project);
            break;
            case 'remove':
              var i = remove(vm.projects, 'id', data.project.id);
            break;
          }
          store.set('projects', vm.projects);
        });

        // 处理打开的任务
        mp.on('onOpeningTaskChange', function (data) {
          switch (data.type) {
            case 'add':
              if (vm.pageId === data.pageId || vm.openingTasks.length === 0) {
                vm.currentTask = data.openingTask;
              }
              vm.openingTasks.push(data.openingTask);
            break;
            case 'remove':
              var task = _.find(vm.openingTasks, { id: data.id });
              var i = remove(vm.openingTasks, 'id', data.id);
              vm.currentTask = vm.openingTasks[--i < 0 ? 0 : i] || {};
            break;
          }
          store.set('openingTasks', vm.openingTasks);
        });

        mp.on('onProcessStart', function (data) {
          // 任务启动时，清除掉之前的日志
          _.find(vm.openingTasks, { id: data.id }).messages = [];
        });

        mp.on('onProcessRunning', addMessage);
        mp.on('onProcessFinish', addMessage);
        mp.on('onProcessError', addMessage);
        mp.on('onProcessExit', addMessage);
        mp.on('error', function (error) {
          vm.$alert('danger', '错误', error);
          vm.connect = false;
        });
        mp.on('nativeError', function (error) {
          vm.$alert('danger', '本地错误', error);
          vm.connect = false;
        });
      });
    }

    // 任务输出
    function addMessage (data) {
      var task = _.find(vm.openingTasks, { id: data.id });

      task.pid = data.pid;
      task.status = data.status;
      task.messages.push.apply(task.messages, data.message.split(/\n/g));

      if (task.messages.length > vm.settings.maxLogLine) {
        task.messages.splice(0, task.messages.length - vm.settings.maxLogLine);
      }

      store.set('openingTasks', vm.openingTasks);
    }

    // 删除数组中的项
    function remove (list, key, value) {
      for (var i = 0; i < list.length; i++) {
        if (list[i][key] === value) {
          list.splice(i, 1);
          return i;
        }
      }
    }
  },
  components: {
    tooltip: VueStrap.tooltip
  },
  data: {
    connect: false,
    projects: [], // 项目列表
    openingTasks: [], // 打开的任务
    currentEditProject: {}, // 正在编辑的项目
    opening: false, // 打开项目信息编辑弹窗的标志位
    openType: 'add', // 打开弹窗的类型
    taskMap: {},
    currentTask: {},
    helpOpening: false,
    tempTask: '',
    pageId: new Date().getTime(),
    settingsOpening: false,
    settings: store.get('settings') || {
      needSearchTaskType: {
        npm: true,
        gulp: true,
        fis: true
      },
      maxLogLine: 200,
      fixBottom: true // 是否滚到最新的日志
    } // 设置
  },
  methods: {
    openUpdateProject: function (type, project) {
      this.opening = true;
      this.openType = type || 'add';

      if (this.openType === 'edit') {
        this.currentEditProject = $.extend({}, project);
      } else {
        this.currentEditProject = {};
        this.currentEditProject.tasks = [];
      }
    },
    saveProject: function () {
      if (this.openType !== 'edit') {
        this.currentEditProject.id = new Date().getTime();
        mp.emit('projectChange', { type: 'add', project: this.currentEditProject });
      } else {
        mp.emit('projectChange', { type: 'update', project: this.currentEditProject });
      }

      this.closeUpdateProject();
    },
    closeUpdateProject: function () {
      this.opening = false;
      this.currentEditProject = {};
    },
    // 移除项目
    removeProject: function () {
      mp.emit('projectChange', { type: 'remove', project: this.currentEditProject });

      this.closeUpdateProject();
    },
    // 添加自定义任务
    addCustomTask: function () {
      this.currentEditProject.tasks.push(this.tempTask);
      this.tempTask = '';
    },
    // 移除自定义任务
    removeCustomTask: function (i) {
      this.currentEditProject.tasks.splice(i, 1);
    },
    // 选择正在运行的任务
    selectTask: function (task) {
      this.currentTask = task;
    },
    // 打开任务
    addOpeningTask: function (project, cmd) {
      const id = new Date().getTime();

      mp.emit('openingTaskChange', {
        type: 'add',
        pageId: this.pageId,
        openingTask: { 
          project: project,
          id: id,
          cmd: cmd,
          status: 'running',
          messages: []
        }
      });
      this.runTask(id);
    },
    // 关闭任务
    closeOpeningTask: function (id) {
      var task = _.find(this.openingTasks, { id: id });

      mp.emit('openingTaskChange', { type: 'remove', id: id });
      task && this.killTask(task.pid);
    },
    // 运行任务
    runTask: function (id) {
      mp.emit('run', { id: id });
    },
    // 杀掉进程
    killTask: function (pid) {
      mp.emit('kill', { pid: pid });
    },
    openHelp: function () {
      this.helpOpening = true;
    },
    closeHelp: function () {
      this.helpOpening = false;
    },
    openSettings: function () {
      this.settingsOpening = true;
    },
    closeSettings: function () {
      this.settingsOpening = false;
    }
  }
});