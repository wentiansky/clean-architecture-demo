// adapter/api/request.js
// 网络请求适配层 - 统一封装 H5 XMLHttpRequest 和 Native 桥接请求

import platform from '../platform'
import bridge from '../bridge'

// 模拟请求拦截器
const requestInterceptors = []
const responseInterceptors = []

// ==================== H5 XMLHttpRequest 实现 ====================

const h5Request = (config) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const { url, method = 'GET', headers, data, timeout = 30000 } = config

    xhr.open(method.toUpperCase(), url, true)
    xhr.timeout = timeout

    // 设置请求头
    if (headers) {
      Object.keys(headers).forEach((key) => {
        xhr.setRequestHeader(key, headers[key])
      })
    }

    xhr.onload = function () {
      let response = {
        data: xhr.response,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: xhr.getAllResponseHeaders(),
        config,
      }

      try {
        response.data = JSON.parse(xhr.response)
      } catch (e) {
        // 保持原始响应
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response)
      } else {
        reject(response)
      }
    }

    xhr.onerror = () => reject({ error: 'Network Error', config })
    xhr.ontimeout = () => reject({ error: 'Timeout', config })

    xhr.send(data ? JSON.stringify(data) : null)
  })
}

// ==================== Native 桥接请求实现 ====================

/**
 * Android 通过桥接发起请求
 * 由 Native 统一处理：DNS、证书校验、埋点、统一拦截器等
 */
const androidRequest = (config) => {
  return new Promise((resolve, reject) => {
    const { url, method = 'GET', headers, data, timeout = 30000 } = config

    // 生成唯一请求 ID
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`

    // 注册全局回调（供 Native 调用）
    window.__nativeRequestCallbacks__ = window.__nativeRequestCallbacks__ || {}
    window.__nativeRequestCallbacks__[requestId] = (result) => {
      delete window.__nativeRequestCallbacks__[requestId]

      if (result.success) {
        resolve({
          data: result.data,
          status: result.status || 200,
          headers: result.headers,
          config,
        })
      } else {
        reject({
          error: result.error || 'Request Failed',
          status: result.status,
          config,
        })
      }
    }

    try {
      // 调用 Android 桥接方法
      if (window.AndroidBridge?.sendRequest) {
        window.AndroidBridge.sendRequest(
          requestId,
          url,
          method.toUpperCase(),
          JSON.stringify(headers || {}),
          data ? JSON.stringify(data) : '',
          timeout,
        )
      } else {
        // 降级到 H5 请求
        console.warn(
          '[Request] Android bridge not found, fallback to H5 request',
        )
        h5Request(config).then(resolve).catch(reject)
      }
    } catch (e) {
      console.warn('[Request] Android bridge error, fallback to H5 request:', e)
      h5Request(config).then(resolve).catch(reject)
    }
  })
}

/**
 * iOS 通过桥接发起请求
 */
const iosRequest = (config) => {
  return new Promise((resolve, reject) => {
    const { url, method = 'GET', headers, data, timeout = 30000 } = config
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`

    // 注册回调
    window.__nativeRequestCallbacks__ = window.__nativeRequestCallbacks__ || {}
    window.__nativeRequestCallbacks__[requestId] = (result) => {
      delete window.__nativeRequestCallbacks__[requestId]
      if (result.success) {
        resolve({
          data: result.data,
          status: result.status || 200,
          headers: result.headers,
          config,
        })
      } else {
        reject({
          error: result.error || 'Request Failed',
          status: result.status,
          config,
        })
      }
    }

    try {
      if (window.webkit?.messageHandlers?.sendRequest) {
        window.webkit.messageHandlers.sendRequest.postMessage({
          requestId,
          url,
          method: method.toUpperCase(),
          headers: headers || {},
          body: data || null,
          timeout,
        })
      } else {
        console.warn('[Request] iOS bridge not found, fallback to H5 request')
        h5Request(config).then(resolve).catch(reject)
      }
    } catch (e) {
      console.warn('[Request] iOS bridge error, fallback to H5 request:', e)
      h5Request(config).then(resolve).catch(reject)
    }
  })
}

// ==================== 统一请求入口 ====================

/**
 * 根据平台选择请求方式
 * 策略：
 * 1. H5/微信小程序：直接使用 XMLHttpRequest
 * 2. App：优先使用 Native 桥接（由 Native 统一管理），失败时降级到 H5
 */
const platformRequest = (config) => {
  // 如果明确指定使用 Native 请求
  if (config.useNative) {
    if (platform.isAndroid()) return androidRequest(config)
    if (platform.isIOS()) return iosRequest(config)
  }

  // 如果明确指定使用 H5 请求
  if (config.useH5) {
    return h5Request(config)
  }

  // 默认策略：H5 走 XMLHttpRequest，App 走 Native 桥接
  if (platform.isH5() || platform.type === 'wechat') {
    return h5Request(config)
  }

  if (platform.isAndroid()) {
    return androidRequest(config)
  }

  if (platform.isIOS()) {
    return iosRequest(config)
  }

  // 兜底：H5 请求
  return h5Request(config)
}

// ==================== 请求主函数 ====================

const request = (options) => {
  return new Promise((resolve, reject) => {
    // 执行请求拦截器
    let config = { ...options }
    requestInterceptors.forEach((interceptor) => {
      config = interceptor(config) || config
    })

    // 根据平台发起请求
    platformRequest(config)
      .then((response) => {
        // 执行响应拦截器
        let result = response
        responseInterceptors.forEach((interceptor) => {
          result = interceptor(result) || result
        })
        resolve(result)
      })
      .catch((error) => {
        // 执行错误拦截器
        let err = error
        responseInterceptors.forEach((interceptor) => {
          if (interceptor.length === 2) {
            // 错误处理函数
            err = interceptor(null, err) || err
          }
        })
        reject(err)
      })
  })
}

// ==================== 拦截器 API ====================

request.interceptors = {
  request: {
    use: (fulfilled) => {
      requestInterceptors.push(fulfilled)
    },
  },
  response: {
    use: (fulfilled, rejected) => {
      if (fulfilled) responseInterceptors.push(fulfilled)
      if (rejected) responseInterceptors.push(rejected)
    },
  },
}

// ==================== 快捷方法 ====================

const methods = ['get', 'post', 'put', 'delete', 'patch']
methods.forEach((method) => {
  request[method] = (url, data, config = {}) => {
    return request({
      url,
      method: method.toUpperCase(),
      data: method === 'get' ? undefined : data,
      params: method === 'get' ? data : undefined,
      ...config,
    })
  }
})

// ==================== 高级配置方法 ====================

/**
 * 创建特定配置的请求实例
 * @param {Object} defaultConfig - 默认配置
 * @returns {Function} 拥有 get/post/put/delete 方法的请求实例
 */
request.create = (defaultConfig = {}) => {
  // 创建实例函数（可直接调用）
  const instance = (options) => {
    return request({ ...defaultConfig, ...options })
  }

  // 添加快捷方法 get/post/put/delete/patch
  const methods = ['get', 'post', 'put', 'delete', 'patch']
  methods.forEach((method) => {
    instance[method] = (url, data, config = {}) => {
      // 处理 baseURL
      const fullUrl = defaultConfig.baseURL
        ? `${defaultConfig.baseURL}${url}`
        : url

      return request({
        url: fullUrl,
        method: method.toUpperCase(),
        data: method === 'get' ? undefined : data,
        params: method === 'get' ? data : undefined,
        ...defaultConfig,
        ...config,
      })
    }
  })

  return instance
}

/**
 * 设置全局默认配置
 */
request.defaults = {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
}

export default request
