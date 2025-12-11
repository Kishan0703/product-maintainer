import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = Cookies.get('auth_token');

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

export function setAuthToken(token: string) {
    Cookies.set('auth_token', token, { expires: 7 });
}

export function getAuthToken(): string | undefined {
    return Cookies.get('auth_token');
}

export function removeAuthToken() {
    Cookies.remove('auth_token');
}
