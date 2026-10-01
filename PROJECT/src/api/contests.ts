import apiClient from './client';
import type { Contest, LeaderboardEntry } from '../types/judge';

export const normalizeContest = (raw: any): Contest => {
  if (!raw) return raw;

  let status: 'Upcoming' | 'Live' | 'Ended' = 'Upcoming';
  const rawStatus = (raw.status || '').toLowerCase();
  if (rawStatus === 'live') status = 'Live';
  else if (rawStatus === 'ended') status = 'Ended';
  else status = 'Upcoming';

  const problemIds = (raw.problemIds || []).map((p: any) =>
    typeof p === 'object' ? p._id?.toString() || p.id : p.toString()
  );

  return {
    id: raw._id ? raw._id.toString() : raw.id || '',
    title: raw.title || '',
    slug: raw.slug || '',
    description: raw.description || '',
    startTime: raw.startTime ? new Date(raw.startTime).toISOString() : new Date().toISOString(),
    endTime: raw.endTime ? new Date(raw.endTime).toISOString() : new Date().toISOString(),
    durationMinutes: raw.durationMinutes ?? 90,
    status,
    participantCount: raw.registeredUserIds ? raw.registeredUserIds.length : (raw.participantCount ?? 0),
    problemIds,
    scoringMode: raw.scoringMode,
    bannerBadge: raw.bannerBadge || (status === 'Live' ? 'LIVE NOW • Division 1' : 'Rated (Div. 1 + Div. 2)'),
    editorial: raw.editorial || '',
  };
};

export const normalizeLeaderboardEntry = (raw: any, index: number): LeaderboardEntry => {
  const user = raw.user || {};
  return {
    rank: raw.rank ?? index + 1,
    user: {
      id: raw.userId || user._id?.toString() || user.id || `usr-${index + 1}`,
      username: raw.username || user.username || 'Coder',
      name: raw.name || user.name || raw.username || 'Contestant',
      rating: raw.rating || user.rating || 1500,
      avatarUrl: raw.avatarUrl || user.avatarUrl,
      institution: raw.institution || user.institution || 'Global',
    },
    score: raw.score ?? 0,
    solvedCount: raw.solvedCount ?? 0,
    penaltyMinutes: raw.penaltyMinutes ?? 0,
    problemResults: raw.problemResults || {},
  };
};

/**
 * Fetch all upcoming, live, and ended contests
 */
export const getContests = async (status?: string): Promise<Contest[]> => {
  const response = await apiClient.get('/contests', { params: { status } });
  const data = response.data.data;
  return (Array.isArray(data) ? data : []).map(normalizeContest);
};

/**
 * Fetch single contest details by ID or slug
 */
export const getContest = async (idOrSlug: string): Promise<Contest> => {
  const response = await apiClient.get(`/contests/${idOrSlug}`);
  const data = response.data.data;
  return normalizeContest(data.contest || data);
};

/**
 * Register authenticated user for a tournament
 */
export const registerForContest = async (contestId: string): Promise<{ registeredCount: number }> => {
  const response = await apiClient.post(`/contests/${contestId}/register`);
  return response.data.data;
};

/**
 * Fetch leaderboard standings for a contest
 */
export const getLeaderboard = async (
  contestId: string,
  page: number = 1,
  limit: number = 50
): Promise<{
  entries: LeaderboardEntry[];
  total: number;
}> => {
  const response = await apiClient.get(`/contests/${contestId}/leaderboard`, {
    params: { page, limit },
  });
  const data = response.data.data;
  const rawList = data.entries || data.leaderboard || [];

  return {
    entries: rawList.map(normalizeLeaderboardEntry),
    total: data.pagination?.total || rawList.length,
  };
};

/**
 * Payload for creating a new contest
 */
export interface CreateContestPayload {
  title: string;
  slug?: string;
  description?: string;
  startTime: string; // ISO datetime string
  endTime: string;   // ISO datetime string
  durationMinutes: number;
  problemIds: string[];
  bannerBadge?: string;
  editorial?: string;
}

/**
 * Create a new contest tournament (Admin/Setter only)
 */
export const createContest = async (payload: CreateContestPayload): Promise<Contest> => {
  const response = await apiClient.post('/contests', payload);
  return normalizeContest(response.data.data);
};

/**
 * Update contest editorial markdown (Admin/Setter only)
 */
export const updateContestEditorial = async (
  contestId: string,
  editorial: string
): Promise<Contest> => {
  const response = await apiClient.put(`/contests/${contestId}/editorial`, { editorial });
  return normalizeContest(response.data.data);
};

