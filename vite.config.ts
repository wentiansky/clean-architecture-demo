import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const mockRewards = [
  {
    id: 'reward_001',
    name: '新人红包',
    type: 'cash',
    value: 10,
    description: '新用户专享，满100可用',
    icon: 'https://via.placeholder.com/60/ff6b6b/ffffff?text=红包',
    status: 'available',
    expireTime: '2027-06-01T00:00:00Z',
    rules: { memberOnly: false }
  },
  {
    id: 'reward_002',
    name: '会员专享券',
    type: 'coupon',
    value: 50,
    description: '会员专属，全场通用',
    icon: 'https://via.placeholder.com/60/667eea/ffffff?text=会员',
    status: 'available',
    expireTime: '2027-05-01T00:00:00Z',
    rules: { memberOnly: true, minLevel: 1 }
  },
  {
    id: 'reward_003',
    name: '积分大礼包',
    type: 'points',
    value: 500,
    description: '可兑换精美礼品',
    icon: 'https://via.placeholder.com/60/feca57/ffffff?text=积分',
    status: 'claimed',
    claimTime: '2026-04-01T10:00:00Z',
    rules: {}
  },
  {
    id: 'reward_004',
    name: '过期奖励',
    type: 'coupon',
    value: 20,
    description: '已过期，无法领取',
    icon: 'https://via.placeholder.com/60/dfe6e9/666666?text=过期',
    status: 'available',
    expireTime: '2025-03-01T00:00:00Z',
    rules: {}
  }
];

type RequestWithBody = IncomingMessage & { body?: Record<string, unknown> };

const readJsonBody = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Uint8Array[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const json = (res: ServerResponse, data: unknown) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'reward-mock-server',
      configureServer(server) {
        server.middlewares.use(async (req, _res, next) => {
          const request = req as RequestWithBody;
          if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
            request.body = await readJsonBody(req);
          }
          next();
        });

        server.middlewares.use('/api/reward/list', (req, res) => {
          if (req.method !== 'POST') {
            return json(res, { code: 1, message: 'Method Not Allowed' });
          }

          return json(res, {
            code: 0,
            data: { list: mockRewards }
          });
        });

        server.middlewares.use('/api/reward/claim', (req, res) => {
          if (req.method !== 'POST') {
            return json(res, { code: 1, message: 'Method Not Allowed' });
          }

          const { rewardId } = (req as RequestWithBody).body ?? {};
          const reward = mockRewards.find((item) => item.id === rewardId);
          if (reward) {
            reward.status = 'claimed';
            reward.claimTime = new Date().toISOString();
          }

          return json(res, {
            code: 0,
            data: { success: true, rewardId }
          });
        });

        server.middlewares.use('/api/reward/status', (_req, res) => {
          return json(res, {
            code: 0,
            data: {
              claimedList: mockRewards.filter((item) => item.status === 'claimed')
            }
          });
        });

        server.middlewares.use('/api/track/reward', (req, res) => {
          if (req.method === 'POST') {
            console.log('[Server Track]', (req as RequestWithBody).body ?? {});
          }

          return json(res, { code: 0 });
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@adapter': path.resolve(__dirname, 'src/adapter'),
      '@application': path.resolve(__dirname, 'src/application'),
      '@ui': path.resolve(__dirname, 'src/ui')
    }
  },
  server: {
    port: 8080,
    open: true
  }
});
