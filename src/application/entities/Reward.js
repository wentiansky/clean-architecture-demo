// application/entities/Reward.js
// 奖励领域实体

export class Reward {
  constructor(data = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.type = data.type || ''; // coupon, points, cash, etc.
    this.value = data.value || 0;
    this.description = data.description || '';
    this.icon = data.icon || '';
    this.status = data.status || 'available'; // available, claimed, expired
    this.claimTime = data.claimTime || null;
    this.expireTime = data.expireTime || null;
    this.rules = data.rules || {}; // 领取规则
  }

  // 检查是否可领取
  isClaimable() {
    return this.status === 'available' && !this.isExpired();
  }

  // 检查是否已过期
  isExpired() {
    if (!this.expireTime) return false;
    return Date.now() > new Date(this.expireTime).getTime();
  }

  // 检查是否已领取
  isClaimed() {
    return this.status === 'claimed';
  }

  // 获取显示文本
  getDisplayValue() {
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

  // 获取按钮文本
  getButtonText() {
    if (this.isClaimed()) return '已领取';
    if (this.isExpired()) return '已过期';
    return '立即领取';
  }

  // 转换为纯数据对象
  toJSON() {
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
