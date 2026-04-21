import { createApp } from 'vue';
import App from './ui/App.vue';
import storage from './adapter/storage';
import type { UserInfo } from './types';

const mockUserInfo: UserInfo = {
  id: 'user_123',
  name: '张三',
  avatar: '',
  level: 2,
  points: 1000,
  isMember: true,
  memberExpiry: '2027-12-31'
};

storage.set('user_info', mockUserInfo, { expire: 24 * 60 * 60 * 1000 });

createApp(App).mount('#app');
