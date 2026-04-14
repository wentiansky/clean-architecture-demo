// adapter/api/reward.js
// 奖励相关 API

import request from './request';
import platform from '../platform';

const baseURL = '/api';

export const rewardApi = {
  // 获取奖励列表
  getRewardList(params) {
    return request.post(`${baseURL}/reward/list`, {
      ...params,
      platform: platform.type,
      timestamp: Date.now()
    });
  },

  // 领取奖励
  claimReward(rewardId) {
    return request.post(`${baseURL}/reward/claim`, {
      rewardId,
      platform: platform.type,
      timestamp: Date.now()
    });
  },

  // 获取用户奖励状态
  getUserRewardStatus(userId) {
    return request.get(`${baseURL}/reward/status`, {
      userId,
      platform: platform.type
    });
  },

  // 上报奖励领取结果（埋点）
  trackRewardEvent(event, params) {
    return request.post(`${baseURL}/track/reward`, {
      event,
      params: {
        ...params,
        platform: platform.type,
        timestamp: Date.now()
      }
    });
  }
};

export default rewardApi;
