// 项目入口文件
// 只负责初始化应用，不处理业务逻辑

import Vue from 'vue';
import App from './ui/App.vue';

// 初始化用户信息（演示用）
import storage from './adapter/storage';

// 模拟登录用户信息
const mockUserInfo = {
  id: 'user_123',
  name: '张三',
  avatar: '',
  level: 2,
  points: 1000,
  isMember: true,
  memberExpiry: '2025-12-31'
};

// 存储用户信息
storage.set('user_info', mockUserInfo, { expire: 24 * 60 * 60 * 1000 });

// 提示：Mock API 数据已配置在 vue.config.js 中

Vue.config.productionTip = false;

new Vue({
  render: h => h(App)
}).$mount('#app');
