import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/services/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  tenantId: string;
  permissions: string[];
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      apiClient.setAuthToken(token);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Auth initialization failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.signIn(email, password);
      
      const { user: userData, token, refreshToken } = response;
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refreshToken);
      apiClient.setAuthToken(token);
      
      setUser(userData);
      
      toast.success(`Welcome back, ${userData.firstName}!`);
      
      // Redirect to intended page or dashboard
      const returnUrl = router.query.returnUrl as string;
      router.push(returnUrl || '/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Sign in failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await apiClient.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      apiClient.setAuthToken(null);
      setUser(null);
      setIsLoading(false);
      router.push('/auth/signin');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await apiClient.updateProfile(data);
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.refreshToken(refreshTokenValue);
      const { token, refreshToken: newRefreshToken } = response;
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', newRefreshToken);
      apiClient.setAuthToken(token);
    } catch (error) {
      console.error('Token refresh failed:', error);
      await signOut();
      throw error;
    }
  };

  // Auto refresh token before expiry
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Auto refresh failed:', error);
      }
    }, 14 * 60 * 1000); // Refresh every 14 minutes (assuming 15 min token expiry)

    return () => clearInterval(refreshInterval);
  }, [user]);

  // Handle offline/online auth state
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        refreshToken().catch(console.error);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user]);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    updateProfile,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push(`/auth/signin?returnUrl=${encodeURIComponent(router.asPath)}`);
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-intel-50 dark:bg-intel-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-intel-600 dark:text-intel-400">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect to sign in
    }

    return <WrappedComponent {...props} />;
  };
}

// Hook for checking permissions
export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission) || user.role === 'admin';
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions || [],
    role: user?.role,
  };
}