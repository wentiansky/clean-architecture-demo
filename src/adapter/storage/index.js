// adapter/storage/index.js
// 存储适配层

import platform from '../platform';

// 统一存储接口
const storage = {
  // 设置缓存
  set(key, value, options = {}) {
    const data = {
      value,
      expire: options.expire ? Date.now() + options.expire : null,
      platform: platform.type
    };

    const str = JSON.stringify(data);

    if (platform.isApp() && window.AndroidBridge?.setStorage) {
      // App 使用原生存储
      window.AndroidBridge.setStorage(key, str);
    } else if (platform.isApp() && window.webkit?.messageHandlers?.setStorage) {
      window.webkit.messageHandlers.setStorage.postMessage({ key, value: str });
    } else {
      // H5 使用 localStorage
      localStorage.setItem(key, str);
    }
  },

  // 获取缓存
  get(key) {
    let str;

    if (platform.isApp() && window.AndroidBridge?.getStorage) {
      str = window.AndroidBridge.getStorage(key);
    } else if (platform.isApp() && window.webkit?.messageHandlers?.getStorage) {
      // iOS 异步，这里简化处理
      str = localStorage.getItem(key);
    } else {
      str = localStorage.getItem(key);
    }

    if (!str) return null;

    try {
      const data = JSON.parse(str);
      // 检查是否过期
      if (data.expire && Date.now() > data.expire) {
        this.remove(key);
        return null;
      }
      return data.value;
    } catch (e) {
      return null;
    }
  },

  // 删除缓存
  remove(key) {
    if (platform.isApp() && window.AndroidBridge?.removeStorage) {
      window.AndroidBridge.removeStorage(key);
    } else if (platform.isApp() && window.webkit?.messageHandlers?.removeStorage) {
      window.webkit.messageHandlers.removeStorage.postMessage({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  // 清空缓存
  clear() {
    if (platform.isApp() && window.AndroidBridge?.clearStorage) {
      window.AndroidBridge.clearStorage();
    } else {
      localStorage.clear();
    }
  }
};

export default storage;
