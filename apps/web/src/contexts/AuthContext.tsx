'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from 'shared';
import { apiRequest, getAuthToken, removeAuthToken } from '../utils/api';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        const token = getAuthToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const data = await apiRequest('/api/auth/me');
            setUser(data.user);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            removeAuthToken();
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const logout = () => {
        removeAuthToken();
        setUser(null);
    };

    const refreshUser = async () => {
        await fetchUser();
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
