import request from '@/adapter/api/request';
import platform from '@/adapter/platform';
import storage from '@/adapter/storage';

class MockXMLHttpRequest {
  method = '';
  url = '';
  headers: Record<string, string> = {};
  timeout = 0;
  status = 200;
  statusText = 'OK';
  responseText = JSON.stringify({ code: 0, data: { ok: true } });
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  ontimeout: null | (() => void) = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  getAllResponseHeaders() {
    return '';
  }

  send() {
    this.onload?.();
  }
}

describe('adapter layer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);
    platform.type = 'h5';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores and expires values', async () => {
    storage.set('token', 'abc', { expire: 10 });
    expect(storage.get<string>('token')).toBe('abc');

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(storage.get<string>('token')).toBeNull();
  });

  it('serializes GET params into query string', async () => {
    const response = await request.get<{ code: number; data: { ok: boolean } }>('/api/demo', {
      page: 1,
      keyword: 'reward'
    });

    expect(response.config.url).toBe('/api/demo?page=1&keyword=reward');
    expect(response.data.data.ok).toBe(true);
  });

  it('supports request instances with baseURL', async () => {
    const api = request.create({ baseURL: '/api' });

    const response = await api.get<{ code: number; data: { ok: boolean } }>('/reward/status', {
      userId: 'u_1'
    });

    expect(response.config.url).toBe('/api/reward/status?userId=u_1');
  });

  it('detects h5 platform helpers', () => {
    platform.type = 'h5';
    expect(platform.isH5()).toBe(true);
    expect(platform.isApp()).toBe(false);
  });

  it('detects app helpers', () => {
    platform.type = 'android';
    expect(platform.isAndroid()).toBe(true);
    expect(platform.isApp()).toBe(true);
    expect(platform.isH5()).toBe(false);
  });
});
