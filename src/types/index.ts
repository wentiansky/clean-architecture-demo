export type RewardType = 'cash' | 'coupon' | 'points';
export type RewardStatus = 'available' | 'claimed' | 'expired';
export type PlatformType = 'h5' | 'wechat' | 'android' | 'ios';
export type ToastType = 'success' | 'error';

export interface RewardRules {
  memberOnly?: boolean;
  minLevel?: number;
  dailyLimit?: number;
}

export interface RewardDTO {
  id: string;
  name: string;
  type: RewardType;
  value: number;
  description: string;
  icon: string;
  status: RewardStatus;
  claimTime?: string | null;
  expireTime?: string | null;
  rules: RewardRules;
}

export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  level: number;
  points: number;
  isMember: boolean;
  memberExpiry?: string | null;
}

export interface ClaimResult {
  success: boolean;
  message: string;
  reward?: RewardDTO;
}

export interface ClaimEligibilityResult {
  eligible: boolean;
  message: string;
}

export interface GetRewardListParams {
  forceRefresh?: boolean;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

export interface RequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  timeout?: number;
  useNative?: boolean;
  useH5?: boolean;
  baseURL?: string;
}

export interface RequestResponse<T = unknown> {
  data: T;
  status: number;
  statusText?: string;
  headers?: unknown;
  config: RequestConfig;
}

export interface RequestInterceptor<T = unknown> {
  (value: T): T | void;
}

export interface RequestErrorInterceptor {
  (_value: null, error: unknown): unknown;
}

export interface RequestInstance {
  <T = unknown>(options: RequestConfig): Promise<RequestResponse<T>>;
  get<T = unknown>(url: string, data?: Record<string, unknown>, config?: Partial<RequestConfig>): Promise<RequestResponse<T>>;
  post<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<RequestResponse<T>>;
  put<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<RequestResponse<T>>;
  delete<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<RequestResponse<T>>;
  patch<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<RequestResponse<T>>;
  create(defaultConfig?: Partial<RequestConfig>): RequestInstance;
  defaults: {
    timeout: number;
    headers: Record<string, string>;
  };
  interceptors: {
    request: {
      use: (fulfilled: RequestInterceptor<RequestConfig>) => void;
    };
    response: {
      use: (
        fulfilled?: RequestInterceptor<RequestResponse<unknown>>,
        rejected?: RequestErrorInterceptor
      ) => void;
    };
  };
}

export interface BridgeResult {
  success: boolean;
  error?: string;
}

export interface BridgeAdapter {
  showToast(message: string): Promise<BridgeResult>;
  getUserInfo(): Promise<UserInfo | null | BridgeResult>;
  openPage(url: string): Promise<BridgeResult>;
  goBack(): Promise<BridgeResult>;
  track(event: string, params?: Record<string, unknown>): Promise<BridgeResult>;
}

export interface StorageSetOptions {
  expire?: number;
}

export interface StorageAdapter {
  set<T>(key: string, value: T, options?: StorageSetOptions): void;
  get<T>(key: string): T | null;
  remove(key: string): void;
  clear(): void;
}

export interface LongTaskAttribution {
  containerType?: string;
  containerName?: string;
  containerSrc?: string;
  containerId?: string;
  scriptUrl?: string;
  lineNumber?: number;
  columnNumber?: number;
  functionName?: string;
  executionContext?: string;
  type?: string;
}

export interface LongTaskEntry extends PerformanceEntry {
  attribution?: LongTaskAttribution[];
  toJSON(): Record<string, unknown>;
}

export interface LongTaskItem {
  id: number;
  name: string;
  duration: number;
  startTime: number;
  entryType: string;
}
