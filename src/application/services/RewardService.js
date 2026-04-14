// application/services/RewardService.js
// 奖励服务 - 核心业务逻辑层
// 只关心业务规则，不关心具体平台、UI 或网络实现

import { rewardApi } from '@/adapter/api/reward';
import { bridge } from '@/adapter';
import storage from '@/adapter/storage';
import platform from '@/adapter/platform';
import { Reward } from '../entities/Reward';
import { User } from '../entities/User';

const CACHE_KEY = 'reward_list_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export class RewardService {
  constructor() {
    this.rewardList = [];
    this.user = null;
  }

  // ============ 核心业务方法 ============

  /**
   * 获取奖励列表（带缓存）
   * @param {Object} params - 查询参数
   * @returns {Promise<Array<Reward>>}
   */
  async getRewardList(params = {}) {
    // 1. 先尝试从缓存获取
    const cached = this._getCachedRewards();
    if (cached && !params.forceRefresh) {
      this.rewardList = cached;
      return cached;
    }

    try {
      // 2. 调用 API 获取
      const response = await rewardApi.getRewardList(params);
      const list = response.data?.list || [];

      // 3. 转换为领域实体
      this.rewardList = list.map(item => new Reward(item));

      // 4. 缓存结果
      this._cacheRewards(this.rewardList);

      // 5. 埋点：列表曝光
      this._trackListExposure(this.rewardList);

      return this.rewardList;
    } catch (error) {
      console.error('[RewardService] 获取奖励列表失败:', error);
      throw new Error('获取奖励列表失败，请稍后重试');
    }
  }

  /**
   * 领取奖励 - 核心业务逻辑
   * @param {string} rewardId - 奖励ID
   * @returns {Promise<Object>}
   */
  async claimReward(rewardId) {
    const reward = this.rewardList.find(r => r.id === rewardId);

    // ========== 前置业务校验 ==========
    if (!reward) {
      return { success: false, message: '奖励不存在' };
    }

    // 检查是否已领取
    if (reward.isClaimed()) {
      return { success: false, message: '您已领取过该奖励' };
    }

    // 检查是否已过期
    if (reward.isExpired()) {
      return { success: false, message: '该奖励已过期' };
    }

    // 检查领取资格（如会员等级限制）
    const checkResult = this._checkClaimEligibility(reward);
    if (!checkResult.eligible) {
      return { success: false, message: checkResult.message };
    }

    // ========== 执行业务操作 ==========
    try {
      // 1. 调用 API 领取
      const response = await rewardApi.claimReward(rewardId);

      if (response.data?.success) {
        // 2. 更新本地状态
        reward.status = 'claimed';
        reward.claimTime = new Date().toISOString();

        // 3. 更新缓存
        this._cacheRewards(this.rewardList);

        // 4. 发送成功通知（根据平台不同）
        await this._sendClaimSuccessNotification(reward);

        // 5. 埋点：领取成功
        await this._trackClaimSuccess(reward);

        return {
          success: true,
          message: '领取成功',
          reward: reward.toJSON()
        };
      } else {
        // 6. 埋点：领取失败
        await this._trackClaimFail(reward, response.data?.message);

        return {
          success: false,
          message: response.data?.message || '领取失败，请稍后重试'
        };
      }
    } catch (error) {
      console.error('[RewardService] 领取奖励失败:', error);

      // 埋点：领取异常
      await this._trackClaimFail(reward, error.message);

      return { success: false, message: '网络异常，请稍后重试' };
    }
  }

  /**
   * 获取单个奖励详情
   * @param {string} rewardId
   * @returns {Reward|null}
   */
  getRewardById(rewardId) {
    return this.rewardList.find(r => r.id === rewardId) || null;
  }

  /**
   * 获取可领取的奖励数量
   * @returns {number}
   */
  getClaimableCount() {
    return this.rewardList.filter(r => r.isClaimable()).length;
  }

  // ============ 内部辅助方法 ============

  /**
   * 检查领取资格
   * @param {Reward} reward
   * @returns {{eligible: boolean, message: string}}
   */
  _checkClaimEligibility(reward) {
    // 检查登录状态
    const userInfo = storage.get('user_info');
    if (!userInfo) {
      return { eligible: false, message: '请先登录' };
    }

    this.user = new User(userInfo);

    // 检查会员限制
    if (reward.rules?.memberOnly && !this.user.isValidMember()) {
      return { eligible: false, message: '仅限会员领取' };
    }

    // 检查等级限制
    if (reward.rules?.minLevel && this.user.level < reward.rules.minLevel) {
      return { eligible: false, message: `需要${reward.rules.minLevel}级以上` };
    }

    // 检查每日领取限制
    if (reward.rules?.dailyLimit) {
      const todayClaims = this._getTodayClaimCount(reward.id);
      if (todayClaims >= reward.rules.dailyLimit) {
        return { eligible: false, message: '今日领取次数已达上限' };
      }
    }

    return { eligible: true, message: '' };
  }

  /**
   * 发送领取成功通知（平台差异化处理）
   * @param {Reward} reward
   */
  async _sendClaimSuccessNotification(reward) {
    const message = `恭喜您获得 ${reward.name}`;

    if (platform.isApp()) {
      // App 使用原生 Toast
      await bridge.showToast(message);
    } else {
      // H5 可以自定义弹窗或 Toast
      await bridge.showToast(message);
    }
  }

  // ============ 缓存相关 ============

  _getCachedRewards() {
    const cached = storage.get(CACHE_KEY);
    if (cached && cached.timestamp) {
      // 检查是否过期
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data.map(item => new Reward(item));
      }
    }
    return null;
  }

  _cacheRewards(rewards) {
    storage.set(CACHE_KEY, {
      data: rewards.map(r => r.toJSON()),
      timestamp: Date.now()
    }, { expire: CACHE_DURATION });
  }

  // ============ 埋点相关 ============

  _trackListExposure(rewards) {
    bridge.track('reward_list_exposure', {
      count: rewards.length,
      claimableCount: rewards.filter(r => r.isClaimable()).length
    });
  }

  async _trackClaimSuccess(reward) {
    await bridge.track('reward_claim_success', {
      rewardId: reward.id,
      rewardType: reward.type,
      rewardValue: reward.value,
      platform: platform.type
    });

    // 同时上报后端埋点
    await rewardApi.trackRewardEvent('claim_success', {
      rewardId: reward.id,
      rewardType: reward.type
    });
  }

  async _trackClaimFail(reward, reason) {
    await bridge.track('reward_claim_fail', {
      rewardId: reward.id,
      reason,
      platform: platform.type
    });
  }

  _getTodayClaimCount(rewardId) {
    const key = `claim_count_${rewardId}_${new Date().toDateString()}`;
    return storage.get(key) || 0;
  }
}

// 导出单例
export const rewardService = new RewardService();
export default rewardService;
