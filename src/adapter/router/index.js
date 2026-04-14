// adapter/router/index.js
// 路由适配层

import platform from '../platform';
import bridge from '../bridge';

const router = {
  // 页面跳转
  push(url, options = {}) {
    // 埋点：页面跳转
    this.track && this.track('page_jump', { url, ...options });

    if (options.replace) {
      return this.replace(url, options);
    }

    if (options.native && platform.isApp()) {
      // App 内打开原生页面
      return bridge.openPage(url);
    }

    // H5 或 App 内打开 H5 页面
    if (platform.isApp() && !url.startsWith('http')) {
      // App 内相对路径，使用原生打开
      return bridge.openPage(url);
    }

    window.location.href = url;
    return Promise.resolve({ success: true });
  },

  // 替换当前页
  replace(url, options = {}) {
    if (options.native && platform.isApp()) {
      return bridge.openPage(url);
    }

    window.location.replace(url);
    return Promise.resolve({ success: true });
  },

  // 返回上一页
  back() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      bridge.goBack();
    }
    return Promise.resolve({ success: true });
  },

  // 埋点方法（可选注入）
  track: null
};

export default router;
