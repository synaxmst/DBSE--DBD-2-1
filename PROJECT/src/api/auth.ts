import apiClient from './client';
import type { User } from '../types/judge';

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  name?: string;
  institution?: string;
  role?: 'user' | 'admin' | 'setter';
}

const normalizeUser = (raw: any): User => {
  if (!raw) return raw;
  return {
    id: raw._id ? raw._id.toString() : raw.id || '',
    username: raw.username || '',
    name: raw.name || raw.username || '',
    email: raw.email || '',
    role: raw.role || 'user',
    rating: raw.rating ?? 1500,
    rank: raw.rank ?? 0,
    solvedCount: raw.solvedProblems ? raw.solvedProblems.length : (raw.solvedCount ?? 0),
    easySolved: raw.easySolved ?? 0,
    mediumSolved: raw.mediumSolved ?? 0,
    hardSolved: raw.hardSolved ?? 0,
    avatarUrl: raw.avatarUrl,
    institution: raw.institution,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
};

/**
 * Authenticate user with credentials
 */
export const login = async (identifier: string, password: string): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/login', { identifier, password });
  const data = response.data.data;
  return {
    token: data.token,
    user: normalizeUser(data.user),
  };
};

/**
 * Register a new user account
 */
export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/register', payload);
  const data = response.data.data;
  return {
    token: data.token,
    user: normalizeUser(data.user),
  };
};

/**
 * Fetch authenticated user profile and stats
 */
export const getMe = async (): Promise<User> => {
  const response = await apiClient.get('/auth/me');
  return normalizeUser(response.data.data);
};

/**
 * Update authenticated user profile
 */
export const updateProfile = async (data: {
  name?: string;
  institution?: string;
  avatarUrl?: string;
}): Promise<User> => {
  const response = await apiClient.put('/auth/profile', data);
  return normalizeUser(response.data.data);
};
