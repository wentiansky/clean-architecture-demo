import type { PlatformType, StorageAdapter, StorageSetOptions } from '@/types';
import platform from '../platform';
import type { StoredValue } from '@/types/globals';

const createStoragePayload = <T>(value: T, options: StorageSetOptions = {}): StoredValue<T> => ({
  value,
  expire: options.expire ? Date.now() + options.expire : null,
  platform: platform.type as PlatformType
});

const storage: StorageAdapter = {
  set<T>(key: string, value: T, options: StorageSetOptions = {}): void {
    const payload = JSON.stringify(createStoragePayload(value, options));

    if (platform.isApp() && window.AndroidBridge?.setStorage) {
      window.AndroidBridge.setStorage(key, payload);
      return;
    }

    if (platform.isApp() && window.webkit?.messageHandlers?.setStorage) {
      window.webkit.messageHandlers.setStorage.postMessage({ key, value: payload });
      return;
    }

    localStorage.setItem(key, payload);
  },

  get<T>(key: string): T | null {
    let raw: string | null = null;

    if (platform.isApp() && window.AndroidBridge?.getStorage) {
      raw = window.AndroidBridge.getStorage(key);
    } else {
      raw = localStorage.getItem(key);
    }

    if (!raw) {
      return null;
    }

    try {
      const data = JSON.parse(raw) as StoredValue<T>;
      if (data.expire && Date.now() > data.expire) {
        this.remove(key);
        return null;
      }
      return data.value;
    } catch {
      return null;
    }
  },

  remove(key: string): void {
    if (platform.isApp() && window.AndroidBridge?.removeStorage) {
      window.AndroidBridge.removeStorage(key);
      return;
    }

    if (platform.isApp() && window.webkit?.messageHandlers?.removeStorage) {
      window.webkit.messageHandlers.removeStorage.postMessage({ key });
      return;
    }

    localStorage.removeItem(key);
  },

  clear(): void {
    if (platform.isApp() && window.AndroidBridge?.clearStorage) {
      window.AndroidBridge.clearStorage();
      return;
    }

    localStorage.clear();
  }
};

export default storage;
