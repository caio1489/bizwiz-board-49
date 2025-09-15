export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'master' | 'user';
  master_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends UserProfile {
  // Compatibility with existing interface
  masterAccountId?: string;
  createdAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  administrators: number;
}