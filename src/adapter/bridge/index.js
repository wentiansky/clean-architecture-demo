// adapter/bridge/index.js
// 端能力适配层 - 统一封装 H5/Android/iOS 的桥接调用

import platform from '../platform';

// 回调函数存储
const callbackMap = new Map();
let callbackId = 0;

// H5 的 mock 实现
const h5Bridge = {
  // 显示 Toast
  showToast(message) {
    alert(message);
    return Promise.resolve({ success: true });
  },

  // 获取用户信息
  getUserInfo() {
    // H5 从 localStorage 或 cookie 获取
    const userInfo = localStorage.getItem('userInfo');
    return Promise.resolve(userInfo ? JSON.parse(userInfo) : null);
  },

  // 打开新页面
  openPage(url) {
    window.location.href = url;
    return Promise.resolve({ success: true });
  },

  // 返回上一页
  goBack() {
    window.history.back();
    return Promise.resolve({ success: true });
  },

  // 埋点上报
  track(event, params = {}) {
    console.log('[H5 Track]', event, params);
    return Promise.resolve({ success: true });
  }
};

// Android Bridge
const androidBridge = {
  showToast(message) {
    return new Promise((resolve) => {
      try {
        window.AndroidBridge.showToast(message);
        resolve({ success: true });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  },

  getUserInfo() {
    return new Promise((resolve) => {
      try {
        const result = window.AndroidBridge.getUserInfo();
        resolve(JSON.parse(result));
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  },

  openPage(url) {
    return new Promise((resolve) => {
      try {
        window.AndroidBridge.openPage(url);
        resolve({ success: true });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  },

  goBack() {
    return new Promise((resolve) => {
      try {
        window.AndroidBridge.goBack();
        resolve({ success: true });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  },

  track(event, params = {}) {
    return new Promise((resolve) => {
      try {
        window.AndroidBridge.track(event, JSON.stringify(params));
        resolve({ success: true });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  }
};

// iOS Bridge
const iosBridge = {
  callHandler(method, params) {
    return new Promise((resolve) => {
      const id = ++callbackId;
      callbackMap.set(id, resolve);

      window.webkit.messageHandlers[method].postMessage({
        callbackId: id,
        params: JSON.stringify(params)
      });
    });
  },

  showToast(message) {
    return this.callHandler('showToast', { message });
  },

  getUserInfo() {
    return this.callHandler('getUserInfo', {});
  },

  openPage(url) {
    return this.callHandler('openPage', { url });
  },

  goBack() {
    return this.callHandler('goBack', {});
  },

  track(event, params = {}) {
    return this.callHandler('track', { event, ...params });
  }
};

// 全局回调函数（供 Native 调用）
window.bridgeCallback = (callbackId, result) => {
  const callback = callbackMap.get(callbackId);
  if (callback) {
    callback(JSON.parse(result));
    callbackMap.delete(callbackId);
  }
};

// 根据平台导出对应的 bridge
const bridges = {
  h5: h5Bridge,
  wechat: h5Bridge,
  android: androidBridge,
  ios: iosBridge
};

export default bridges[platform.type] || h5Bridge;
