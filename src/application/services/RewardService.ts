import { rewardApi } from '@/adapter/api/reward';
import { bridge } from '@/adapter';
import storage from '@/adapter/storage';
import platform from '@/adapter/platform';
import type {
  ClaimEligibilityResult,
  ClaimResult,
  GetRewardListParams,
  RewardListFilter,
  RewardDTO,
  UserInfo
} from '@/types';
import { Reward } from '../entities/Reward';
import { User } from '../entities/User';

const CACHE_KEY = 'reward_list_cache';
const CACHE_DURATION = 5 * 60 * 1000;

interface RewardCachePayload {
  data: RewardDTO[];
  timestamp: number;
}

export class RewardService {
  rewardList: Reward[] = [];
  user: User | null = null;

  async getRewardList(params: GetRewardListParams = {}): Promise<Reward[]> {
    const cached = this.getCachedRewards();
    if (cached && !params.forceRefresh) {
      this.rewardList = cached;
      return cached;
    }

    try {
      const response = await rewardApi.getRewardList(params);
      const list = response.data.data.list ?? [];
      this.rewardList = list.map((item) => new Reward(item));
      this.cacheRewards(this.rewardList);
      await this.trackListExposure(this.rewardList);
      return this.rewardList;
    } catch (error) {
      console.error('[RewardService] 获取奖励列表失败:', error);
      throw new Error('获取奖励列表失败，请稍后重试');
    }
  }

  async claimReward(rewardId: string): Promise<ClaimResult> {
    const reward = this.rewardList.find((item) => item.id === rewardId);

    if (!reward) {
      return { success: false, message: '奖励不存在' };
    }

    if (reward.isClaimed()) {
      return { success: false, message: '您已领取过该奖励' };
    }

    if (reward.isExpired()) {
      return { success: false, message: '该奖励已过期' };
    }

    const eligibility = this.checkClaimEligibility(reward);
    if (!eligibility.eligible) {
      return { success: false, message: eligibility.message };
    }

    try {
      const response = await rewardApi.claimReward(rewardId);

      if (response.data.data.success) {
        reward.status = 'claimed';
        reward.claimTime = new Date().toISOString();
        this.cacheRewards(this.rewardList);
        await this.sendClaimSuccessNotification(reward);
        await this.trackClaimSuccess(reward);

        return {
          success: true,
          message: '领取成功',
          reward: reward.toJSON()
        };
      }

      await this.trackClaimFail(reward, response.data.message ?? '领取失败');
      return {
        success: false,
        message: response.data.message ?? '领取失败，请稍后重试'
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : '未知异常';
      console.error('[RewardService] 领取奖励失败:', error);
      await this.trackClaimFail(reward, reason);
      return { success: false, message: '网络异常，请稍后重试' };
    }
  }

  getRewardById(rewardId: string): Reward | null {
    return this.rewardList.find((item) => item.id === rewardId) ?? null;
  }

  getClaimableCount(): number {
    return this.rewardList.filter((item) => item.isClaimable()).length;
  }

  getFilteredRewards(filter: RewardListFilter = 'all', rewards: Reward[] = this.rewardList): Reward[] {
    if (filter === 'claimable') {
      return rewards.filter((item) => item.isClaimable());
    }

    if (filter === 'claimed') {
      return rewards.filter((item) => item.isClaimed());
    }

    if (filter === 'expired') {
      return rewards.filter((item) => item.isExpired());
    }

    return rewards;
  }

  private checkClaimEligibility(reward: Reward): ClaimEligibilityResult {
    const userInfo = storage.get<UserInfo>('user_info');
    if (!userInfo) {
      return { eligible: false, message: '请先登录' };
    }

    this.user = new User(userInfo);

    if (reward.rules.memberOnly && !this.user.isValidMember()) {
      return { eligible: false, message: '仅限会员领取' };
    }

    if (reward.rules.minLevel && this.user.level < reward.rules.minLevel) {
      return { eligible: false, message: `需要${reward.rules.minLevel}级以上` };
    }

    if (reward.rules.dailyLimit) {
      const todayClaims = this.getTodayClaimCount(reward.id);
      if (todayClaims >= reward.rules.dailyLimit) {
        return { eligible: false, message: '今日领取次数已达上限' };
      }
    }

    return { eligible: true, message: '' };
  }

  private async sendClaimSuccessNotification(reward: Reward): Promise<void> {
    const message = `恭喜您获得 ${reward.name}`;
    if (platform.isApp()) {
      await bridge.showToast(message);
      return;
    }

    await bridge.showToast(message);
  }

  private getCachedRewards(): Reward[] | null {
    const cached = storage.get<RewardCachePayload>(CACHE_KEY);
    if (cached?.timestamp && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data.map((item) => new Reward(item));
    }
    return null;
  }

  private cacheRewards(rewards: Reward[]): void {
    storage.set<RewardCachePayload>(
      CACHE_KEY,
      {
        data: rewards.map((reward) => reward.toJSON()),
        timestamp: Date.now()
      },
      { expire: CACHE_DURATION }
    );
  }

  private async trackListExposure(rewards: Reward[]): Promise<void> {
    await bridge.track('reward_list_exposure', {
      count: rewards.length,
      claimableCount: rewards.filter((reward) => reward.isClaimable()).length
    });
  }

  private async trackClaimSuccess(reward: Reward): Promise<void> {
    await bridge.track('reward_claim_success', {
      rewardId: reward.id,
      rewardType: reward.type,
      rewardValue: reward.value,
      platform: platform.type
    });

    await rewardApi.trackRewardEvent('claim_success', {
      rewardId: reward.id,
      rewardType: reward.type
    });
  }

  private async trackClaimFail(reward: Reward, reason: string): Promise<void> {
    await bridge.track('reward_claim_fail', {
      rewardId: reward.id,
      reason,
      platform: platform.type
    });
  }

  private getTodayClaimCount(rewardId: string): number {
    const key = `claim_count_${rewardId}_${new Date().toDateString()}`;
    return storage.get<number>(key) ?? 0;
  }
}

export const rewardService = new RewardService();
export default rewardService;
