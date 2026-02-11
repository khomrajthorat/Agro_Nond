import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext({});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false); // ✅ FIX 1: Make it a state variable

  // Initialize auth state from HttpOnly Cookie Session
  useEffect(() => {
    const initializeAuth = async () => {
      // We don't check for token in LS anymore.
      // We check if we have user_data to show UI immediately (optimistic),
      // but real source of truth is the API call which sends the cookie.

      const storedUser = localStorage.getItem('user_data');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // If no user data, assume not logged in to avoid 401 error on fresh load
        setLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        // This request will send the HttpOnly cookie. 
        // If valid, we get 200 OK and user data.
        const profileData = await api.users.getProfile();

        const updatedUser = {
          ...(storedUser ? JSON.parse(storedUser) : {}),
          ...profileData,
          role: profileData.role || 'farmer'
        };

        setUser(updatedUser);
        localStorage.setItem('user_data', JSON.stringify(updatedUser)); // Keep user data for basic UI
      } catch (error) {
        console.warn('Session check failed:', error);
        // If 401/403, clear everything
        localStorage.removeItem('user_data');
        setUser(null);
      } finally {
        setProfileLoading(false);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Send OTP
  const signInWithPhone = useCallback(async (phone) => {
    try {
      setLoading(true);
      await api.auth.login(phone);
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify OTP
  const verifyOtp = useCallback(async (phone, token) => {
    try {
      setLoading(true);
      const data = await api.auth.verify(phone, token);

      // ✅ FIX 5: Ensure role exists in the user object
      const userWithRole = {
        ...data.user,
        role: data.user.role || 'farmer' // Default to farmer if no role
      };

      // Store session (Only user data, token is HttpOnly cookie)
      // localStorage.setItem('auth_token', data.token); // REMOVED
      localStorage.setItem('user_data', JSON.stringify(userWithRole));

      setUser(userWithRole);
      return { data: { ...data, user: userWithRole }, error: null };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRole = useCallback(async (role) => {
    // ... existing implementation ...
    if (!user) return { error: { message: 'No user logged in' } };

    try {
      // Use API wrapper
      const response = await api.users.setRole(role);

      // Update local state
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser)); // Keep synced

      return { data: response, error: null };
    } catch (error) {
      console.error('Update role error:', error);
      return { error };
    }
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      // Call backend logout (Clear cookies)
      await api.auth.logout();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      logout();
      setLoading(false);
      return { error: null };
    }
  }, []);

  const logout = () => {
    // localStorage.removeItem('auth_token'); // REMOVED
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const refreshProfile = useCallback(async () => {
    try {
      const profileData = await api.users.getProfile();
      // Backend returns flat structure: { id, phone, role, name, location... }
      // Frontend expects: { full_name, ... }

      const updatedUser = {
        ...user,
        ...profileData,
        full_name: profileData.name || profileData.full_name || user?.full_name
      };

      setUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error('Refresh profile error:', error);
      return null;
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    session: user, // Backward compatibility
    profile: user, // Backward compatibility: merged user and profile
    loading,
    profileLoading, // ✅ Now this is the actual state variable
    signInWithPhone,
    verifyOtp,
    updateRole,
    signOut,
    refreshProfile
  }), [user, loading, signInWithPhone, verifyOtp, updateRole, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;