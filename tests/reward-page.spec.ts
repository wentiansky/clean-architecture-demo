import { flushPromises, mount } from '@vue/test-utils';
import { Reward } from '@/application/entities/Reward';
import RewardPage from '@/ui/views/RewardPage.vue';
import type { RewardDTO, RewardListFilter, UserInfo } from '@/types';

const createMockRewards = (): Reward[] => [
  new Reward({
    id: 'reward_no_expire',
    name: '永久奖励',
    type: 'coupon',
    value: 99,
    description: '没有过期时间',
    icon: '',
    status: 'available',
    expireTime: null,
    rules: {}
  }),
  new Reward({
    id: 'reward_available',
    name: '先过期奖励',
    type: 'coupon',
    value: 10,
    description: '可直接领取',
    icon: '',
    status: 'available',
    expireTime: '2099-01-01T00:00:00Z',
    rules: {}
  }),
  new Reward({
    id: 'reward_claimed',
    name: '已领取但快过期',
    type: 'points',
    value: 20,
    description: '已经领取',
    icon: '',
    status: 'claimed',
    claimTime: '2026-04-01T00:00:00Z',
    expireTime: '2099-02-01T00:00:00Z',
    rules: {}
  }),
  new Reward({
    id: 'reward_claimed_later',
    name: '已领取但晚过期',
    type: 'points',
    value: 25,
    description: '已经领取',
    icon: '',
    status: 'claimed',
    claimTime: '2026-04-02T00:00:00Z',
    expireTime: '2099-03-01T00:00:00Z',
    rules: {}
  }),
  new Reward({
    id: 'reward_expired',
    name: '后过期奖励',
    type: 'cash',
    value: 30,
    description: '已经过期',
    icon: '',
    status: 'available',
    expireTime: '2099-12-31T00:00:00Z',
    rules: {}
  }),
  new Reward({
    id: 'reward_really_expired',
    name: '已过期奖励',
    type: 'cash',
    value: 30,
    description: '已经过期',
    icon: '',
    status: 'available',
    expireTime: '2000-01-01T00:00:00Z',
    rules: {}
  })
];

const getFilteredRewards = (filter: RewardListFilter, rewards: Reward[]) => {
  if (filter === 'claimable') {
    return rewards.filter((reward) => reward.isClaimable());
  }

  if (filter === 'claimed') {
    return rewards.filter((reward) => reward.isClaimed());
  }

  if (filter === 'expired') {
    return rewards.filter((reward) => reward.isExpired());
  }

  return rewards;
};

const { rewardServiceMock } = vi.hoisted(() => ({
  rewardServiceMock: {
    getRewardList: vi.fn(),
    getFilteredRewards: vi.fn(),
    getSortedRewards: vi.fn(),
    claimReward: vi.fn()
  }
}));

vi.mock('@/application', () => ({
  rewardService: rewardServiceMock,
  Reward
}));

vi.mock('@/adapter/platform', () => ({
  default: {
    type: 'h5'
  }
}));

vi.mock('@/adapter/router', () => ({
  default: {
    back: vi.fn()
  }
}));

vi.mock('@/adapter/storage', () => ({
  default: {
    get: vi.fn()
  }
}));

describe('RewardPage', () => {
  let mockRewards: Reward[];
  const userInfo: UserInfo = {
    id: 'user_1',
    name: '测试用户',
    avatar: '',
    level: 2,
    points: 200,
    isMember: true,
    memberExpiry: '2099-01-01T00:00:00Z'
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRewards = createMockRewards();
    rewardServiceMock.getRewardList.mockResolvedValue(mockRewards);
    rewardServiceMock.getFilteredRewards.mockImplementation(
      (filter: RewardListFilter = 'all', rewards: Reward[] = mockRewards) => getFilteredRewards(filter, rewards)
    );
    rewardServiceMock.getSortedRewards.mockImplementation((rewards: Reward[] = mockRewards) => {
      return [...rewards].sort((left, right) => {
        const leftHasExpire = Boolean(left.expireTime);
        const rightHasExpire = Boolean(right.expireTime);

        if (!leftHasExpire && !rightHasExpire) {
          return 0;
        }

        if (!leftHasExpire) {
          return -1;
        }

        if (!rightHasExpire) {
          return 1;
        }

        return new Date(left.expireTime ?? '').getTime() - new Date(right.expireTime ?? '').getTime();
      });
    });
    rewardServiceMock.claimReward.mockResolvedValue({
      success: true,
      message: '领取成功'
    });

    const storage = await import('@/adapter/storage');
    vi.mocked(storage.default.get).mockReturnValue(userInfo);

    vi.stubGlobal(
      'PerformanceObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders all rewards by default and switches filters', async () => {
    const wrapper = mount(RewardPage);
    await flushPromises();

    expect(rewardServiceMock.getRewardList).toHaveBeenCalledTimes(1);
    expect(rewardServiceMock.getSortedRewards).toHaveBeenCalled();
    expect(wrapper.findAll('.reward-name').map((node) => node.text())).toEqual([
      '永久奖励',
      '已过期奖励',
      '先过期奖励',
      '已领取但快过期',
      '已领取但晚过期',
      '后过期奖励'
    ]);
    expect(wrapper.text()).toContain('已过期奖励');
    expect(wrapper.text()).toContain('6个奖励');

    await wrapper.get('button.filter-chip:nth-child(2)').trigger('click');

    expect(wrapper.findAll('.reward-name').map((node) => node.text())).toEqual([
      '永久奖励',
      '先过期奖励',
      '后过期奖励'
    ]);
    expect(wrapper.text()).toContain('3个待领取');

    await wrapper.get('button.filter-chip:nth-child(3)').trigger('click');

    expect(wrapper.findAll('.reward-name').map((node) => node.text())).toEqual([
      '已领取但快过期',
      '已领取但晚过期'
    ]);
    expect(wrapper.text()).toContain('2个已领取');
  });

  it('shows filter-specific empty state and refreshes filtered list after claim', async () => {
    const wrapper = mount(RewardPage);
    await flushPromises();

    rewardServiceMock.claimReward.mockImplementation(async (rewardId: string) => {
      const reward = mockRewards.find((item) => item.id === rewardId);
      if (reward) {
        reward.status = 'claimed';
        reward.claimTime = new Date().toISOString();
      }

      return { success: true, message: '领取成功' };
    });

    await wrapper.get('button.filter-chip:nth-child(2)').trigger('click');
    expect(wrapper.text()).toContain('先过期奖励');

    await wrapper.get('.claim-btn').trigger('click');
    await flushPromises();

    expect(rewardServiceMock.claimReward).toHaveBeenCalledWith('reward_no_expire');
    expect(wrapper.text()).not.toContain('永久奖励');
    expect(wrapper.text()).toContain('先过期奖励');
    expect(wrapper.text()).toContain('后过期奖励');

    await wrapper.get('button.filter-chip:nth-child(4)').trigger('click');

    expect(wrapper.text()).toContain('已过期奖励');
    expect(wrapper.text()).toContain('1个已过期');
  });
});
