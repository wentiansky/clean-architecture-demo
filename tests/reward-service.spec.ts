import { Reward, RewardService } from '@/application';
import { rewardApi } from '@/adapter/api/reward';
import bridge from '@/adapter/bridge';
import storage from '@/adapter/storage';
import type { RewardDTO, UserInfo } from '@/types';

const createRewardList = (): RewardDTO[] => [
  {
    id: 'reward_001',
    name: '会员券',
    type: 'coupon',
    value: 50,
    description: '会员券',
    icon: '',
    status: 'available',
    expireTime: '2099-01-01T00:00:00Z',
    rules: { memberOnly: true, minLevel: 2 }
  },
  {
    id: 'reward_002',
    name: '已领取奖励',
    type: 'points',
    value: 20,
    description: '已领取',
    icon: '',
    status: 'claimed',
    claimTime: '2026-04-01T00:00:00Z',
    rules: {}
  },
  {
    id: 'reward_003',
    name: '已过期奖励',
    type: 'cash',
    value: 30,
    description: '已过期',
    icon: '',
    status: 'available',
    expireTime: '2000-01-01T00:00:00Z',
    rules: {}
  }
];

vi.mock('@/adapter/api/reward', () => ({
  rewardApi: {
    getRewardList: vi.fn(),
    claimReward: vi.fn(),
    trackRewardEvent: vi.fn()
  }
}));

vi.mock('@/adapter/bridge', () => ({
  default: {
    showToast: vi.fn().mockResolvedValue({ success: true }),
    track: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('RewardService', () => {
  const user: UserInfo = {
    id: 'user_1',
    name: 'Tester',
    avatar: '',
    level: 2,
    points: 100,
    isMember: true,
    memberExpiry: '2099-01-01T00:00:00Z'
  };

  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    storage.set('user_info', user);
  });

  it('filters rewards by status from current in-memory list', () => {
    const service = new RewardService();
    service.rewardList = createRewardList().map((item) => new Reward(item));

    expect(service.getFilteredRewards()).toHaveLength(3);
    expect(service.getFilteredRewards('claimable').map((item) => item.id)).toEqual(['reward_001']);
    expect(service.getFilteredRewards('claimed').map((item) => item.id)).toEqual(['reward_002']);
    expect(service.getFilteredRewards('expired').map((item) => item.id)).toEqual(['reward_003']);
  });

  it('returns empty arrays for filters with no matches', () => {
    const service = new RewardService();
    service.rewardList = [
      new Reward({
        ...createRewardList()[1]
      })
    ];

    expect(service.getFilteredRewards('claimable')).toEqual([]);
    expect(service.getFilteredRewards('expired')).toEqual([]);
  });

  it('sorts rewards with no expiry first, then by nearest expiry, while keeping stable order', () => {
    const service = new RewardService();
    const rewards = [
      new Reward({
        id: 'same_time_a',
        name: '同时间A',
        type: 'coupon',
        value: 5,
        description: '',
        icon: '',
        status: 'available',
        expireTime: '2099-06-01T00:00:00Z',
        rules: {}
      }),
      new Reward({
        id: 'no_expire',
        name: '永久奖励',
        type: 'coupon',
        value: 50,
        description: '',
        icon: '',
        status: 'available',
        expireTime: null,
        rules: {}
      }),
      new Reward({
        id: 'same_time_b',
        name: '同时间B',
        type: 'coupon',
        value: 6,
        description: '',
        icon: '',
        status: 'available',
        expireTime: '2099-06-01T00:00:00Z',
        rules: {}
      }),
      new Reward({
        id: 'sooner',
        name: '更快过期',
        type: 'coupon',
        value: 10,
        description: '',
        icon: '',
        status: 'available',
        expireTime: '2099-01-01T00:00:00Z',
        rules: {}
      })
    ];

    expect(service.getSortedRewards(rewards).map((reward) => reward.id)).toEqual([
      'no_expire',
      'sooner',
      'same_time_a',
      'same_time_b'
    ]);
  });

  it('returns not found message when reward does not exist', async () => {
    const service = new RewardService();

    const result = await service.claimReward('missing_reward');
    expect(result).toEqual({ success: false, message: '奖励不存在' });
  });

  it('returns login required message when user info is missing', async () => {
    const service = new RewardService();
    service.rewardList = [new Reward(createRewardList()[0])];
    storage.remove('user_info');

    const result = await service.claimReward('reward_001');
    expect(result).toEqual({ success: false, message: '请先登录' });
  });

  it('returns member-only message for non-member users', async () => {
    const service = new RewardService();
    service.rewardList = [new Reward(createRewardList()[0])];
    storage.set('user_info', { ...user, isMember: false });

    const result = await service.claimReward('reward_001');
    expect(result).toEqual({ success: false, message: '仅限会员领取' });
  });

  it('returns level restriction message when user level is too low', async () => {
    const service = new RewardService();
    service.rewardList = [new Reward(createRewardList()[0])];
    storage.set('user_info', { ...user, isMember: true, level: 1 });

    const result = await service.claimReward('reward_001');
    expect(result).toEqual({ success: false, message: '需要2级以上' });
  });

  it('returns daily-limit message when claim count is reached', async () => {
    const service = new RewardService();
    service.rewardList = [
      new Reward({
        ...createRewardList()[0],
        rules: {
          dailyLimit: 1
        }
      })
    ];
    const todayKey = `claim_count_reward_001_${new Date().toDateString()}`;
    storage.set(todayKey, 1);

    const result = await service.claimReward('reward_001');
    expect(result).toEqual({ success: false, message: '今日领取次数已达上限' });
  });

  it('returns already claimed message when reward is claimed', async () => {
    const service = new RewardService();
    service.rewardList = createRewardList()
      .slice(0, 1)
      .map((item) => ({ ...item, status: 'claimed' as const }))
      .map((item) => new Reward(item));

    const result = await service.claimReward('reward_001');
    expect(result).toEqual({ success: false, message: '您已领取过该奖励' });
  });

  it('returns expired message when reward is expired', async () => {
    const service = new RewardService();
    service.rewardList = [
      new Reward({
        ...createRewardList()[0],
        expireTime: '2000-01-01T00:00:00Z'
      })
    ];

    const result = await service.claimReward('reward_001');
    expect(result).toEqual({ success: false, message: '该奖励已过期' });
  });

  it('claims reward successfully', async () => {
    const service = new RewardService();
    vi.mocked(rewardApi.getRewardList).mockResolvedValue({
      data: {
        code: 0,
        data: { list: createRewardList().slice(0, 1) }
      },
      status: 200,
      config: { url: '/api/reward/list' }
    });
    vi.mocked(rewardApi.claimReward).mockResolvedValue({
      data: {
        code: 0,
        data: { success: true, rewardId: 'reward_001' }
      },
      status: 200,
      config: { url: '/api/reward/claim' }
    });
    vi.mocked(rewardApi.trackRewardEvent).mockResolvedValue({
      data: { code: 0, data: {} },
      status: 200,
      config: { url: '/api/track/reward' }
    });

    await service.getRewardList();
    const result = await service.claimReward('reward_001');

    expect(result.success).toBe(true);
    expect(result.message).toBe('领取成功');
    expect(vi.mocked(bridge.showToast)).toHaveBeenCalled();
    expect(vi.mocked(bridge.track)).toHaveBeenCalled();
  });

  it('uses cached rewards when cache is valid and forceRefresh is false', async () => {
    const service = new RewardService();
    storage.set('reward_list_cache', {
      data: createRewardList().slice(0, 1),
      timestamp: Date.now()
    });

    const result = await service.getRewardList();

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Reward);
    expect(vi.mocked(rewardApi.getRewardList)).not.toHaveBeenCalled();
  });

  it('bypasses cache when forceRefresh is true', async () => {
    const service = new RewardService();
    storage.set('reward_list_cache', {
      data: [],
      timestamp: Date.now()
    });
    vi.mocked(rewardApi.getRewardList).mockResolvedValue({
      data: {
        code: 0,
        data: { list: createRewardList().slice(0, 1) }
      },
      status: 200,
      config: { url: '/api/reward/list' }
    });

    const result = await service.getRewardList({ forceRefresh: true });

    expect(result).toHaveLength(1);
    expect(vi.mocked(rewardApi.getRewardList)).toHaveBeenCalledTimes(1);
  });

  it('throws friendly message when reward list request fails', async () => {
    const service = new RewardService();
    vi.mocked(rewardApi.getRewardList).mockRejectedValue(new Error('boom'));

    await expect(service.getRewardList({ forceRefresh: true })).rejects.toThrow(
      '获取奖励列表失败，请稍后重试'
    );
  });

  it('returns network error message when claim request fails', async () => {
    const service = new RewardService();
    service.rewardList = [new Reward(createRewardList()[0])];
    vi.mocked(rewardApi.claimReward).mockRejectedValue(new Error('network'));

    const result = await service.claimReward('reward_001');
    expect(result).toEqual({ success: false, message: '网络异常，请稍后重试' });
  });
});
