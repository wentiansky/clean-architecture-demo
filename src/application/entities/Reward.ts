import type { RewardDTO } from '@/types';

export class Reward {
  id: string;
  name: string;
  type: RewardDTO['type'];
  value: number;
  description: string;
  icon: string;
  status: RewardDTO['status'];
  claimTime: string | null;
  expireTime: string | null;
  rules: RewardDTO['rules'];

  constructor(data: Partial<RewardDTO> = {}) {
    this.id = data.id ?? '';
    this.name = data.name ?? '';
    this.type = data.type ?? 'coupon';
    this.value = data.value ?? 0;
    this.description = data.description ?? '';
    this.icon = data.icon ?? '';
    this.status = data.status ?? 'available';
    this.claimTime = data.claimTime ?? null;
    this.expireTime = data.expireTime ?? null;
    this.rules = data.rules ?? {};
  }

  isClaimable(): boolean {
    return this.status === 'available' && !this.isExpired();
  }

  isExpired(): boolean {
    if (!this.expireTime) {
      return false;
    }

    return Date.now() > new Date(this.expireTime).getTime();
  }

  isClaimed(): boolean {
    return this.status === 'claimed';
  }

  getDisplayValue(): string | number {
    if (this.type === 'cash') {
      return `¥${this.value}`;
    }
    if (this.type === 'points') {
      return `${this.value}积分`;
    }
    if (this.type === 'coupon') {
      return `${this.value}元券`;
    }
    return this.value;
  }

  getButtonText(): string {
    if (this.isClaimed()) {
      return '已领取';
    }
    if (this.isExpired()) {
      return '已过期';
    }
    return '立即领取';
  }

  toJSON(): RewardDTO {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      value: this.value,
      description: this.description,
      icon: this.icon,
      status: this.status,
      claimTime: this.claimTime,
      expireTime: this.expireTime,
      rules: this.rules
    };
  }
}
