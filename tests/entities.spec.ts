import { Reward, User } from '@/application';

describe('domain entities', () => {
  it('evaluates reward state and display value correctly', () => {
    const reward = new Reward({
      id: 'reward_1',
      name: '现金券',
      type: 'cash',
      value: 20,
      description: 'desc',
      icon: '',
      status: 'available',
      expireTime: '2099-01-01T00:00:00Z',
      rules: {}
    });

    expect(reward.isExpired()).toBe(false);
    expect(reward.isClaimable()).toBe(true);
    expect(reward.getDisplayValue()).toBe('¥20');
    expect(reward.getButtonText()).toBe('立即领取');
  });

  it('marks expired rewards as not claimable', () => {
    const reward = new Reward({
      id: 'reward_2',
      name: '过期券',
      type: 'coupon',
      value: 10,
      description: 'desc',
      icon: '',
      status: 'available',
      expireTime: '2000-01-01T00:00:00Z',
      rules: {}
    });

    expect(reward.isExpired()).toBe(true);
    expect(reward.isClaimable()).toBe(false);
    expect(reward.getButtonText()).toBe('已过期');
  });

  it('validates user membership and level label', () => {
    const user = new User({
      id: 'user_1',
      name: 'Alice',
      avatar: '',
      level: 2,
      points: 100,
      isMember: true,
      memberExpiry: '2099-01-01'
    });

    expect(user.isValidMember()).toBe(true);
    expect(user.getLevelName()).toBe('银牌会员');
  });
});
