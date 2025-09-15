import { supabase } from '@/integrations/supabase/client';
import { UserProfile, CreateUserData } from '@/types/auth';

export class UserService {
  static async createSubUser(masterUserId: string, userData: CreateUserData): Promise<UserProfile | null> {
    try {
      // 1. Verificar se o email já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', userData.email)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('Email já cadastrado no sistema');
      }

      // 2. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: userData.name,
            is_subuser: true,
            master_account_id: masterUserId,
          },
        },
      });

      if (authError || !authData?.user) {
        throw new Error(authError?.message || 'Erro ao criar usuário no Auth');
      }

      // 3. Aguardar criação do profile via trigger
      const newUserId = authData.user.id;
      const profile = await this.waitForProfileCreation(newUserId, 10000);

      if (!profile) {
        throw new Error('Profile não foi criado automaticamente pelo trigger');
      }

      return profile;
    } catch (error) {
      console.error('Erro no UserService.createSubUser:', error);
      throw error;
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro no UserService.getUserProfile:', error);
      return null;
    }
  }

  static async getTeamUsers(masterUserId: string): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`user_id.eq.${masterUserId},master_account_id.eq.${masterUserId}`);

      if (error) {
        console.error('Erro ao buscar usuários da equipe:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro no UserService.getTeamUsers:', error);
      return [];
    }
  }

  static async createMasterProfile(authUser: any): Promise<UserProfile | null> {
    try {
      const newProfile = {
        user_id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
        email: authUser.email || '',
        role: 'master' as const,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar profile master:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro no UserService.createMasterProfile:', error);
      return null;
    }
  }

  private static async waitForProfileCreation(userId: string, timeoutMs: number): Promise<UserProfile | null> {
    const started = Date.now();
    
    while (Date.now() - started < timeoutMs) {
      const profile = await this.getUserProfile(userId);
      if (profile) {
        return profile;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
  }
}