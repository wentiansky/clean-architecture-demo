// adapter/platform/index.js
// 平台检测与适配

const getPlatform = () => {
  const ua = navigator.userAgent.toLowerCase();

  if (typeof window !== 'undefined' && window.AndroidBridge) {
    return 'android';
  }
  if (typeof window !== 'undefined' && window.webkit?.messageHandlers) {
    return 'ios';
  }
  if (/micromessenger/.test(ua)) {
    return 'wechat';
  }
  return 'h5';
};

const platform = {
  type: getPlatform(),
  isH5() {
    return this.type === 'h5' || this.type === 'wechat';
  },
  isAndroid() {
    return this.type === 'android';
  },
  isIOS() {
    return this.type === 'ios';
  },
  isApp() {
    return this.isAndroid() || this.isIOS();
  }
};

export default platform;
