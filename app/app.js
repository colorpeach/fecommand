// 防止抖动
Vue.component('modal', $.extend(VueStrap.modal, {
  ready: function(){
    var vm = this;
    var $body = $('body');
    var $window = $(window);
    
    // 防止显示modal时，页面抖动
    vm.$watch('show', function(show){
      if(show){
        if($body[0].scrollHeight > $window.height()){
          $body.removeClass('no-scroll');
        }else{
          $body.addClass('no-scroll');
        }
      }else{
        setTimeout(function(){
          $body.removeClass('no-scroll');
        }, 300);
      }
    });
  }
}));

new Vue({
  el: '#app',
  ready: function () {
    var vm = this;

    this.currentProject = vm.projects[0] || {};

    vm.projects.forEach(function (project) {
      connect.registerProject({ project: project });
    });

    connect.socket.on('tasksLoaded', function (data) {
      vm.$set('taskMap["' + data.name + '"]',  data.tasks);
    });

    connect.socket.on('onProcessRunning', addMessage);
    connect.socket.on('onProcessFinish', addMessage);
    connect.socket.on('onProcessError', addMessage);
    connect.socket.on('onProcessExit', addMessage);

    function addMessage (data) {
      var task = _.find(vm.backgroundTasks, { id: data.id });

      console.log(data.pid);

      task.pid = data.pid;
      task === vm.currentTask && vm.$set('currentTask["status"]', data.status);
      task.messages.push(data.message);

      if (task.messages.length > vm.settings.maxLogLine) {
        task.messages.splice(0, vm.settings.maxLogLine - task.messages.length);
      }

      store.set('backgroundTasks', vm.backgroundTasks);
    }
  },
  components: {
    tooltip: VueStrap.tooltip
  },
  data: {
    projects: store.get('projects') || [], // 项目列表
    backgroundTasks: [], // 正在运行的进程
    currentProject: {}, // 当前选中的项目
    currentEditProject: {}, // 正在编辑的项目
    opening: false, // 打开项目信息编辑弹窗的标志位
    openType: 'add', // 打开弹窗的类型
    taskMap: {},
    currentTask: {},
    id: 1, // 自增id
    helpOpening: false,
    tempTask: '',
    settingsOpening: false,
    settings: store.get('settings') || {
      needSearchTaskType: {
        npm: true,
        gulp: true,
        fis: true
      },
      maxLogLine: 200
    } // 设置
  },
  methods: {
    open: function (type) {
      this.opening = true;
      this.openType = type || 'add';

      if (this.openType === 'edit') {
        this.currentEditProject = $.extend({}, this.currentProject);
      } else {
        this.currentEditProject = {};
      }
    },
    confirm: function () {
      if (this.openType !== 'edit') {
        this.projects.push(this.currentEditProject);
        this.currentProject = this.currentEditProject;
        connect.registerProject({ project: this.currentProject });
      } else {
        $.extend(this.currentProject, this.currentEditProject);
      }

      this.close();
      store.set('projects', this.projects);
    },
    close: function () {
      this.opening = false;
      this.currentEditProject = {};
    },
    // 选择项目
    selectProject: function (project) {
      this.currentProject = project;
    },
    // 选择正在运行的任务
    selectTask: function (task) {
      this.currentTask = task;
    },
    // 运行任务
    runTask: function (cmd, task) {
      var obj = {
        cmd: cmd,
        taskName: task,
        projectName: this.currentProject.name,
        dir: this.currentProject.dir,
        id: this.id++,
        messages: []
      };

      obj.fullCmd = obj.cmd + ' ' + obj.taskName;

      connect.runTask(obj);
      this.currentTask = obj;
      this.backgroundTasks.push(obj);
    },
    runCustomTask: function (task) {
      this.runTask(task.split(' ')[0], task.split(' ').slice(1).join(' '));
    },
    // 添加自定义任务
    addCustomTask: function () {
      if (!this.currentEditProject.tasks) {
        this.currentEditProject.tasks = [];
      }
      this.currentEditProject.tasks.push(this.tempTask);
      this.tempTask = '';
    },
    removeCustomTask: function (i) {
      this.currentEditProject.tasks.splice(i, 1);
    },
    // 移除项目
    removeProject: function () {
      var index = 0;

      for (; index < this.projects.length; index++) {
        if (this.projects[index] === this.currentProject) {
          this.projects.splice(index, 1);
          break;
        }
      }

      this.currentProject = this.projects[--index < 0 ? 0 : index] || {};
      this.close();
      store.set('projects', this.projects);
    },
    // 杀掉进程
    kill: function () {
      connect.socket.emit('killTask', this.currentTask);
    },
    rerun: function (obj) {
      obj.messages = [];
      connect.runTask(obj);
      this.currentTask = obj;
    },
    closeTask: function (task) {
      // var tasks = this.taskMap[task.projectName];
      var index = 0;
      var backgroundTasks = this.backgroundTasks;

      for (; index < backgroundTasks.length; index++) {
        if (backgroundTasks[index] === task) {
          backgroundTasks.splice(index, 1);
          break;
        }
      }

      this.currentTask = backgroundTasks[--index < 0 ? 0 : index] || {};
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