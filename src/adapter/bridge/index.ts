import type { BridgeAdapter, BridgeResult, UserInfo } from '@/types';
import platform from '../platform';

const callbackMap = new Map<number, (result: unknown) => void>();
let callbackId = 0;

const successResult = (): BridgeResult => ({ success: true });

const h5Bridge: BridgeAdapter = {
  async showToast(message) {
    if (typeof window !== 'undefined') {
      window.alert(message);
    }
    return successResult();
  },
  async getUserInfo() {
    const userInfo = typeof localStorage !== 'undefined' ? localStorage.getItem('userInfo') : null;
    return userInfo ? (JSON.parse(userInfo) as UserInfo) : null;
  },
  async openPage(url) {
    window.location.href = url;
    return successResult();
  },
  async goBack() {
    window.history.back();
    return successResult();
  },
  async track(event, params = {}) {
    console.log('[H5 Track]', event, params);
    return successResult();
  }
};

const androidBridge: BridgeAdapter = {
  async showToast(message) {
    try {
      window.AndroidBridge?.showToast(message);
      return successResult();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'showToast failed' };
    }
  },
  async getUserInfo() {
    try {
      const result = window.AndroidBridge?.getUserInfo();
      return result ? (JSON.parse(result) as UserInfo) : null;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'getUserInfo failed' };
    }
  },
  async openPage(url) {
    try {
      window.AndroidBridge?.openPage(url);
      return successResult();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'openPage failed' };
    }
  },
  async goBack() {
    try {
      window.AndroidBridge?.goBack();
      return successResult();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'goBack failed' };
    }
  },
  async track(event, params = {}) {
    try {
      window.AndroidBridge?.track(event, JSON.stringify(params));
      return successResult();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'track failed' };
    }
  }
};

const iosBridge: BridgeAdapter = {
  callHandler(method: string, params: Record<string, unknown>) {
    return new Promise<BridgeResult>((resolve) => {
      const id = ++callbackId;
      callbackMap.set(id, (result) => resolve(result as BridgeResult));
      window.webkit?.messageHandlers?.[method]?.postMessage({
        callbackId: id,
        params: JSON.stringify(params)
      });
    });
  },
  showToast(message) {
    return this.callHandler('showToast', { message });
  },
  getUserInfo() {
    return this.callHandler('getUserInfo', {}) as Promise<UserInfo | null | BridgeResult>;
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
} as BridgeAdapter & {
  callHandler(method: string, params: Record<string, unknown>): Promise<BridgeResult>;
};

window.bridgeCallback = (id: number, result: string) => {
  const callback = callbackMap.get(id);
  if (callback) {
    callback(JSON.parse(result));
    callbackMap.delete(id);
  }
};

const bridges: Record<string, BridgeAdapter> = {
  h5: h5Bridge,
  wechat: h5Bridge,
  android: androidBridge,
  ios: iosBridge
};

const bridge = bridges[platform.type] ?? h5Bridge;

export default bridge;
