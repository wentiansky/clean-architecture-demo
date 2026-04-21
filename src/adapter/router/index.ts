import bridge from '../bridge';
import platform from '../platform';

interface RouterOptions {
  replace?: boolean;
  native?: boolean;
  [key: string]: unknown;
}

const router = {
  track: null as null | ((event: string, params?: Record<string, unknown>) => void),

  push(url: string, options: RouterOptions = {}) {
    this.track?.('page_jump', { url, ...options });

    if (options.replace) {
      return this.replace(url, options);
    }

    if (options.native && platform.isApp()) {
      return bridge.openPage(url);
    }

    if (platform.isApp() && !url.startsWith('http')) {
      return bridge.openPage(url);
    }

    window.location.href = url;
    return Promise.resolve({ success: true });
  },

  replace(url: string, options: RouterOptions = {}) {
    if (options.native && platform.isApp()) {
      return bridge.openPage(url);
    }

    window.location.replace(url);
    return Promise.resolve({ success: true });
  },

  back() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      bridge.goBack();
    }

    return Promise.resolve({ success: true });
  }
};

export default router;
