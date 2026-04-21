import type { ApiResponse, RewardDTO, RequestResponse } from '@/types';
import request from './request';
import platform from '../platform';

const baseURL = '/api';

export const rewardApi = {
  getRewardList(params: Record<string, unknown> = {}): Promise<RequestResponse<ApiResponse<{ list: RewardDTO[] }>>> {
    return request.post<ApiResponse<{ list: RewardDTO[] }>>(`${baseURL}/reward/list`, {
      ...params,
      platform: platform.type,
      timestamp: Date.now()
    });
  },

  claimReward(
    rewardId: string
  ): Promise<RequestResponse<ApiResponse<{ success: boolean; rewardId: string }>>> {
    return request.post<ApiResponse<{ success: boolean; rewardId: string }>>(`${baseURL}/reward/claim`, {
      rewardId,
      platform: platform.type,
      timestamp: Date.now()
    });
  },

  getUserRewardStatus(
    userId: string
  ): Promise<RequestResponse<ApiResponse<{ claimedList: RewardDTO[] }>>> {
    return request.get<ApiResponse<{ claimedList: RewardDTO[] }>>(`${baseURL}/reward/status`, {
      userId,
      platform: platform.type
    });
  },

  trackRewardEvent(event: string, params: Record<string, unknown>) {
    return request.post<ApiResponse<Record<string, never>>>(`${baseURL}/track/reward`, {
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
