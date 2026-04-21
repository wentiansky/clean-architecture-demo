import type { BridgeResult, PlatformType } from './index';

interface AndroidBridgeContract {
  showToast(message: string): void;
  getUserInfo(): string;
  openPage(url: string): void;
  goBack(): void;
  track(event: string, params: string): void;
  sendRequest(
    requestId: string,
    url: string,
    method: string,
    headers: string,
    body: string,
    timeout: number
  ): void;
  setStorage(key: string, value: string): void;
  getStorage(key: string): string | null;
  removeStorage(key: string): void;
  clearStorage(): void;
}

interface IOSMessageHandler {
  postMessage(payload: Record<string, unknown>): void;
}

interface NativeRequestCallbackResult {
  success: boolean;
  data?: unknown;
  status?: number;
  headers?: unknown;
  error?: string;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeContract;
    bridgeCallback?: (callbackId: number, result: string) => void;
    __nativeRequestCallbacks__?: Record<string, (result: NativeRequestCallbackResult) => void>;
    webkit?: {
      messageHandlers?: Record<string, IOSMessageHandler>;
    };
  }

  interface PerformanceObserverEntryList {
    getEntries(): PerformanceEntry[];
  }

  interface Navigator {
    userAgent: string;
  }
}

export interface StoredValue<T> {
  value: T;
  expire: number | null;
  platform: PlatformType;
}

export type { BridgeResult, NativeRequestCallbackResult };
