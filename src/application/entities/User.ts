import type { UserInfo } from '@/types';

export class User {
  id: string;
  name: string;
  avatar: string;
  level: number;
  points: number;
  isMember: boolean;
  memberExpiry: string | null;

  constructor(data: Partial<UserInfo> = {}) {
    this.id = data.id ?? '';
    this.name = data.name ?? '';
    this.avatar = data.avatar ?? '';
    this.level = data.level ?? 0;
    this.points = data.points ?? 0;
    this.isMember = data.isMember ?? false;
    this.memberExpiry = data.memberExpiry ?? null;
  }

  isValidMember(): boolean {
    if (!this.isMember) {
      return false;
    }
    if (!this.memberExpiry) {
      return true;
    }
    return Date.now() < new Date(this.memberExpiry).getTime();
  }

  getLevelName(): string {
    const levels = ['普通用户', '铜牌会员', '银牌会员', '金牌会员', '钻石会员'];
    return levels[this.level] ?? '普通用户';
  }
}
