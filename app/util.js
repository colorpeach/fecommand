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

// 防止抖动
// modal组件
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

// alert组件
Vue.component('alert', {
  template: document.querySelector('#alert').innerHTML,
  props: {
    duration: {
      type: Number,
      default: 5000
    }
  },
  data: function () {
    return {
      alerts: [],
      idIndex: 0
    }
  },
  methods: {
    open: function (type, title, body) {
      var vm = this
      var alert = {
        id: this.idIndex++,
        type: type,
        title: title,
        body: body
      }

      vm.alerts.unshift(alert)

      setTimeout(function () {
        vm.close(alert.id)
      }, vm.duration)
    },
    close: function (id) {
      var vm = this

      for (var i = 0; i < vm.alerts.length; i++) {
        if (vm.alerts[i].id === id) {
          vm.alerts.splice(i, 1)
          break
        }
      }
    }
  }
});

// 保持滚动到底
Vue.directive('scroll-fixed', {
  bind: function () {
    var vm = this;

    $(window).resize(function () {
      vm.height = vm.el.getBoundingClientRect().height;
    });

    vm.height = vm.el.getBoundingClientRect().height;
  },
  update: function (newValue, oldValue) {
    var vm = this;

    vm.el.scrollTop = vm.el.scrollHeight - vm.height;
  }
})