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

var projects = [
    { name: 'tyact', tasks: [
      { name: 'dev' },
      { name: 'dist' }
    ] }
  ];

new Vue({
  el: '#app',
  components: {
    tab: VueStrap.tab,
    tabs: VueStrap.tabset
  },
  data: {
    backgroundTasks: [
      { name: '任务1' }
    ],
    projects: projects,
    currentProject: projects[0],
    opening: false
  },
  methods: {
    open: function () {
      this.opening = true;
    },
    confirm: function () {

    },
    close: function () {
      this.opening = false;
    }
  }
});