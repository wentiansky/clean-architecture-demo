import type {
  RequestConfig,
  RequestErrorInterceptor,
  RequestInstance,
  RequestInterceptor,
  RequestResponse
} from '@/types';
import platform from '../platform';

type NativeResponse = {
  success: boolean;
  data?: unknown;
  status?: number;
  headers?: unknown;
  error?: string;
};

const requestInterceptors: Array<RequestInterceptor<RequestConfig>> = [];
const responseInterceptors: Array<
  RequestInterceptor<RequestResponse<unknown>> | RequestErrorInterceptor
> = [];

const buildUrl = (url: string, params?: Record<string, unknown>): string => {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    query.append(key, String(value));
  });

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${query.toString()}`;
};

const createResponse = <T>(xhr: XMLHttpRequest, config: RequestConfig): RequestResponse<T> => {
  let responseData: unknown = xhr.responseText;

  try {
    responseData = JSON.parse(xhr.responseText);
  } catch {
    responseData = xhr.responseText;
  }

  return {
    data: responseData as T,
    status: xhr.status,
    statusText: xhr.statusText,
    headers: xhr.getAllResponseHeaders(),
    config
  };
};

const h5Request = <T>(config: RequestConfig): Promise<RequestResponse<T>> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = config.method?.toUpperCase() ?? 'GET';
    const finalUrl = buildUrl(config.url, config.params);

    xhr.open(method, finalUrl, true);
    xhr.timeout = config.timeout ?? 30000;

    const headers = { 'Content-Type': 'application/json', ...config.headers };
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.onload = () => {
      const response = createResponse<T>(xhr, { ...config, url: finalUrl });
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response);
        return;
      }
      reject(response);
    };

    xhr.onerror = () => reject({ error: 'Network Error', config });
    xhr.ontimeout = () => reject({ error: 'Timeout', config });
    xhr.send(method === 'GET' ? null : config.data ? JSON.stringify(config.data) : null);
  });

const createNativeRequest = <T>(config: RequestConfig, sender: (requestId: string) => void) =>
  new Promise<RequestResponse<T>>((resolve, reject) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    window.__nativeRequestCallbacks__ = window.__nativeRequestCallbacks__ ?? {};
    window.__nativeRequestCallbacks__[requestId] = (result: NativeResponse) => {
      delete window.__nativeRequestCallbacks__?.[requestId];

      if (result.success) {
        resolve({
          data: result.data as T,
          status: result.status ?? 200,
          headers: result.headers,
          config
        });
        return;
      }

      reject({
        error: result.error ?? 'Request Failed',
        status: result.status,
        config
      });
    };

    sender(requestId);
  });

const androidRequest = <T>(config: RequestConfig): Promise<RequestResponse<T>> =>
  createNativeRequest<T>(config, (requestId) => {
    try {
      if (window.AndroidBridge?.sendRequest) {
        window.AndroidBridge.sendRequest(
          requestId,
          buildUrl(config.url, config.params),
          config.method?.toUpperCase() ?? 'GET',
          JSON.stringify(config.headers ?? {}),
          config.data ? JSON.stringify(config.data) : '',
          config.timeout ?? 30000
        );
        return;
      }
    } catch (error) {
      console.warn('[Request] Android bridge error, fallback to H5 request:', error);
    }

    h5Request<T>(config).then(
      (response) => window.__nativeRequestCallbacks__?.[requestId]?.({ success: true, ...response }),
      (error) => window.__nativeRequestCallbacks__?.[requestId]?.({ success: false, error: String(error?.error ?? error) })
    );
  });

const iosRequest = <T>(config: RequestConfig): Promise<RequestResponse<T>> =>
  createNativeRequest<T>(config, (requestId) => {
    try {
      if (window.webkit?.messageHandlers?.sendRequest) {
        window.webkit.messageHandlers.sendRequest.postMessage({
          requestId,
          url: buildUrl(config.url, config.params),
          method: config.method?.toUpperCase() ?? 'GET',
          headers: config.headers ?? {},
          body: config.data ?? null,
          timeout: config.timeout ?? 30000
        });
        return;
      }
    } catch (error) {
      console.warn('[Request] iOS bridge error, fallback to H5 request:', error);
    }

    h5Request<T>(config).then(
      (response) => window.__nativeRequestCallbacks__?.[requestId]?.({ success: true, ...response }),
      (error) => window.__nativeRequestCallbacks__?.[requestId]?.({ success: false, error: String(error?.error ?? error) })
    );
  });

const platformRequest = <T>(config: RequestConfig): Promise<RequestResponse<T>> => {
  if (config.useNative) {
    if (platform.isAndroid()) {
      return androidRequest<T>(config);
    }
    if (platform.isIOS()) {
      return iosRequest<T>(config);
    }
  }

  if (config.useH5) {
    return h5Request<T>(config);
  }

  if (platform.isH5() || platform.type === 'wechat') {
    return h5Request<T>(config);
  }
  if (platform.isAndroid()) {
    return androidRequest<T>(config);
  }
  if (platform.isIOS()) {
    return iosRequest<T>(config);
  }
  return h5Request<T>(config);
};

const request = (<T>(options: RequestConfig): Promise<RequestResponse<T>> => {
  let config = { ...request.defaults, ...options } as RequestConfig;
  requestInterceptors.forEach((interceptor) => {
    config = interceptor(config) ?? config;
  });

  return platformRequest<T>(config)
    .then((response) => {
      let result = response as RequestResponse<unknown>;
      responseInterceptors.forEach((interceptor) => {
        if (interceptor.length < 2) {
          result = (interceptor as RequestInterceptor<RequestResponse<unknown>>)(result) ?? result;
        }
      });
      return result as RequestResponse<T>;
    })
    .catch((error) => {
      let err: unknown = error;
      responseInterceptors.forEach((interceptor) => {
        if (interceptor.length === 2) {
          err = (interceptor as RequestErrorInterceptor)(null, err) ?? err;
        }
      });
      return Promise.reject(err);
    });
}) as RequestInstance;

request.interceptors = {
  request: {
    use(fulfilled) {
      requestInterceptors.push(fulfilled);
    }
  },
  response: {
    use(fulfilled, rejected) {
      if (fulfilled) {
        responseInterceptors.push(fulfilled);
      }
      if (rejected) {
        responseInterceptors.push(rejected);
      }
    }
  }
};

const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
methods.forEach((method) => {
  request[method] = <T>(
    url: string,
    data?: Record<string, unknown> | unknown,
    config: Partial<RequestConfig> = {}
  ) =>
    request<T>({
      ...config,
      url: `${config.baseURL ?? ''}${url}`,
      method: method.toUpperCase(),
      data: method === 'get' ? undefined : data,
      params: method === 'get' ? (data as Record<string, unknown> | undefined) : undefined
    });
});

request.create = (defaultConfig: Partial<RequestConfig> = {}) => {
  const instance = ((options: RequestConfig) => request({ ...defaultConfig, ...options })) as RequestInstance;

  methods.forEach((method) => {
    instance[method] = <T>(
      url: string,
      data?: Record<string, unknown> | unknown,
      config: Partial<RequestConfig> = {}
    ) =>
      request<T>({
        ...defaultConfig,
        ...config,
        url: `${config.baseURL ?? defaultConfig.baseURL ?? ''}${url}`,
        method: method.toUpperCase(),
        data: method === 'get' ? undefined : data,
        params: method === 'get' ? (data as Record<string, unknown> | undefined) : undefined
      });
  });

  instance.create = request.create;
  instance.defaults = request.defaults;
  instance.interceptors = request.interceptors;
  return instance;
};

request.defaults = {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

export default request;
