const path = require('path');

// Mock 奖励数据（Node 端定义，避免使用 window 对象）
const mockRewards = [
  {
    id: 'reward_001',
    name: '新人红包',
    type: 'cash',
    value: 10,
    description: '新用户专享，满100可用',
    icon: 'https://via.placeholder.com/60/ff6b6b/ffffff?text=红包',
    status: 'available',
    expireTime: '2025-06-01T00:00:00Z',
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
    expireTime: '2025-05-01T00:00:00Z',
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
    claimTime: '2025-04-01T10:00:00Z',
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

module.exports = {
  lintOnSave: false,
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@adapter': path.resolve(__dirname, 'src/adapter'),
        '@application': path.resolve(__dirname, 'src/application'),
        '@ui': path.resolve(__dirname, 'src/ui')
      }
    }
  },
  devServer: {
    port: 8080,
    open: true,
    // Mock API 响应
    onBeforeSetupMiddleware(devServer) {
      const app = devServer.app;

      // 解析 JSON body
      app.use(require('express').json());

      // 奖励列表接口
      app.post('/api/reward/list', (req, res) => {
        res.json({
          code: 0,
          data: {
            list: mockRewards
          }
        });
      });

      // 领取奖励接口
      app.post('/api/reward/claim', (req, res) => {
        const { rewardId } = req.body;
        // 查找奖励
        const reward = mockRewards.find(r => r.id === rewardId);
        if (reward) {
          reward.status = 'claimed';
          reward.claimTime = new Date().toISOString();
        }
        res.json({
          code: 0,
          data: {
            success: true,
            rewardId
          }
        });
      });

      // 用户奖励状态接口
      app.get('/api/reward/status', (req, res) => {
        res.json({
          code: 0,
          data: {
            claimedList: mockRewards.filter(r => r.status === 'claimed')
          }
        });
      });

      // 埋点接口
      app.post('/api/track/reward', (req, res) => {
        console.log('[Server Track]', req.body);
        res.json({ code: 0 });
      });
    }
  }
};
