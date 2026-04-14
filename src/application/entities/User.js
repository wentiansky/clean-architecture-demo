// application/entities/User.js
// 用户领域实体

export class User {
  constructor(data = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.avatar = data.avatar || '';
    this.level = data.level || 0;
    this.points = data.points || 0;
    this.isMember = data.isMember || false;
    this.memberExpiry = data.memberExpiry || null;
  }

  // 检查是否是有效会员
  isValidMember() {
    if (!this.isMember) return false;
    if (!this.memberExpiry) return true;
    return Date.now() < new Date(this.memberExpiry).getTime();
  }

  // 获取会员等级名称
  getLevelName() {
    const levels = ['普通用户', '铜牌会员', '银牌会员', '金牌会员', '钻石会员'];
    return levels[this.level] || '普通用户';
  }
}
