import type { PlatformType } from '@/types';

const getPlatform = (): PlatformType => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'h5';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (window.AndroidBridge) {
    return 'android';
  }
  if (window.webkit?.messageHandlers) {
    return 'ios';
  }
  if (/micromessenger/.test(userAgent)) {
    return 'wechat';
  }
  return 'h5';
};

const platform = {
  type: getPlatform() as PlatformType,
  isH5(): boolean {
    return this.type === 'h5' || this.type === 'wechat';
  },
  isAndroid(): boolean {
    return this.type === 'android';
  },
  isIOS(): boolean {
    return this.type === 'ios';
  },
  isApp(): boolean {
    return this.isAndroid() || this.isIOS();
  }
};

export default platform;
