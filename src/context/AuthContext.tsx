import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Exhibition } from '../types';
import { db } from '../lib/db';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isExhibitionUser: boolean;
  isAuthenticated: boolean;
  activeExhibition: Exhibition | null;
  setActiveExhibition: (exhibition: Exhibition | null) => void;
  login: (emailOrMobile: string, password: string) => Promise<{ success: boolean; message?: string }>;
  /** True while the signed-in account still has to choose a new password. */
  mustChangePassword: boolean;
  /**
   * Sets a new password for the signed-in account.
   *
   * `currentPassword` is required when changing a password from inside the
   * app, so someone at an unattended screen cannot take the account over. The
   * first-sign-in flow omits it, because signing in just proved the password.
   */
  changePassword: (
    newPassword: string,
    currentPassword?: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('divine_foods_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeExhibition, setActiveExhibition] = useState<Exhibition | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (user) {
      // Normalize role uppercase
      if (user.role && typeof user.role === 'string') {
        const normalized = user.role.toUpperCase() as UserRole;
        if (user.role !== normalized) {
          setUser(prev => prev ? { ...prev, role: normalized } : null);
          return;
        }
      }
      localStorage.setItem('divine_foods_current_user', JSON.stringify(user));
      // Set active exhibition if user is assigned to one
      const exhibitions = db.getExhibitions();
      if (user.assigned_exhibition_id) {
        const exh = exhibitions.find(e => e.id === user.assigned_exhibition_id);
        if (exh) {
          setActiveExhibition(exh);
        } else {
          setActiveExhibition(exhibitions.find(e => e.status === 'ACTIVE') || exhibitions[0] || null);
        }
      } else {
        // Default to first active exhibition
        setActiveExhibition(exhibitions.find(e => e.status === 'ACTIVE') || exhibitions[0] || null);
      }
    } else {
      localStorage.removeItem('divine_foods_current_user');
      setActiveExhibition(null);
    }
  }, [user]);

  const login = async (
    emailOrMobile: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!emailOrMobile.trim() || !password) {
      return { success: false, message: 'Please enter your email or mobile number and password.' };
    }

    await db.ensureInitialCredentials();
    const matched = await db.verifyCredentials(emailOrMobile, password);

    // The same message for an unknown account and a wrong password, so the
    // form cannot be used to discover which email addresses exist.
    if (!matched) {
      return { success: false, message: 'Incorrect email/mobile number or password.' };
    }

    if (!matched.is_active) {
      return {
        success: false,
        message: 'This account has been deactivated. Please contact Divine Foods Administrator.',
      };
    }

    const normalizedUser = {
      ...matched,
      role: (matched.role || 'ADMIN').toUpperCase() as UserRole,
    };
    // The session copy never carries credentials.
    delete (normalizedUser as Partial<User>).password;
    delete (normalizedUser as Partial<User>).password_hash;
    delete (normalizedUser as Partial<User>).password_salt;

    setMustChangePassword(!!matched.must_change_password);
    setUser(normalizedUser);
    return { success: true };
  };

  const changePassword = async (
    newPassword: string,
    currentPassword?: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: 'No account is signed in.' };

    if (currentPassword !== undefined) {
      const confirmed = await db.verifyCredentials(user.email, currentPassword);
      if (!confirmed || confirmed.id !== user.id) {
        return { success: false, message: 'Your current password is not correct.' };
      }
    }

    try {
      await db.setUserPassword(user.id, newPassword);
      setMustChangePassword(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Could not update the password.' };
    }
  };

  const logout = () => {
    setMustChangePassword(false);
    setUser(null);
  };

  const userRoleStr = (user?.role || '').toUpperCase();
  const isAdmin = userRoleStr === 'ADMIN';
  const isExhibitionUser = userRoleStr === 'EXHIBITION_USER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAdmin,
        isExhibitionUser,
        isAuthenticated: !!user,
        activeExhibition,
        setActiveExhibition,
        login,
        mustChangePassword,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
