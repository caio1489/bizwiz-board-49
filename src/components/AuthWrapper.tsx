import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { LoginForm } from './LoginForm';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'master' | 'user';
  master_account_id?: string;
  created_at: string;
  updated_at: string;
}

interface AuthUser extends Profile {
  // Compatibility with existing interface
  masterAccountId?: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  users: AuthUser[];
  addSubUser: (name: string, email: string, password: string) => Promise<boolean>;
  getMasterUsers: () => AuthUser[];
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const transformProfile = (profile: Profile): AuthUser => ({
    ...profile,
    id: profile.user_id,
    masterAccountId: profile.master_account_id,
    createdAt: profile.created_at,
  });

  const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // If no profile exists, create one
      if (!data) {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          const newProfile = {
            user_id: authUser.user.id,
            name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'Usuário',
            email: authUser.user.email || '',
            role: 'master' as const,
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            return null;
          }

          return createdProfile;
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const fetchAllUsers = async () => {
    if (!user || user.role !== 'master') return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`user_id.eq.${user.user_id},master_account_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data ? data.map(transformProfile) : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              const authUser = transformProfile(profile);
              setUser(authUser);
              // Fetch team users if master
              setTimeout(() => {
                if (authUser.role === 'master') {
                  fetchAllUsers();
                }
              }, 0);
            }
          }, 0);
        } else {
          setUser(null);
          setUsers([]);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        setTimeout(async () => {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            const authUser = transformProfile(profile);
            setUser(authUser);
            setTimeout(() => {
              if (authUser.role === 'master') {
                fetchAllUsers();
              }
            }, 0);
          }
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Re-fetch users when user changes
  useEffect(() => {
    if (user && user.role === 'master') {
      fetchAllUsers();
    }
  }, [user?.id]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro inesperado' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro inesperado' };
    }
  };

  const addSubUser = async (name: string, email: string, password: string): Promise<boolean> => {
    if (!user || user.role !== 'master') return false;

    try {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        toast({
          title: "Erro",
          description: "Email já cadastrado no sistema",
          variant: "destructive",
        });
        return false;
      }

      // Use service role key for admin operations
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name,
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);
        
        // Handle specific email validation error
        if (authError.message.includes('invalid')) {
          toast({
            title: "Erro",
            description: "Email inválido. Use um email válido (ex: usuario@gmail.com)",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro", 
            description: authError.message,
            variant: "destructive",
          });
        }
        return false;
      }

      if (!authData.user) {
        toast({
          title: "Erro",
          description: "Usuário não foi criado",
          variant: "destructive",
        });
        return false;
      }

      // Create profile as team member
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          name,
          email,
          role: 'user',
          master_account_id: user.user_id,
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        toast({
          title: "Erro",
          description: profileError.message,
          variant: "destructive",
        });
        return false;
      }

      // Refresh users list
      await fetchAllUsers();
      
      toast({
        title: "Sucesso!",
        description: "Usuário criado com sucesso. Ele deve verificar o email para ativar a conta.",
      });
      
      return true;
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro",
        description: error.message || 'Erro inesperado',
        variant: "destructive",
      });
      return false;
    }
  };

  const getMasterUsers = (): AuthUser[] => {
    if (!user || user.role !== 'master') return [];
    return users.filter(u => u.master_account_id === user.id || u.id === user.id);
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUsers([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <LoginForm login={login} register={register} />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        login,
        register,
        logout,
        users,
        addSubUser,
        getMasterUsers,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};