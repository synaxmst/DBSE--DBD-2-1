import { redisClient } from '../config/redis';
import { User, IUser } from '../models/User';
import { emitToContest } from '../socket/SocketManager';
import { logger } from '../logger';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  name: string;
  avatarUrl?: string;
  institution?: string;
  rating: number;
  score: number;
  solvedCount: number;
  penaltyMinutes: number;
}

export interface PaginatedLeaderboard {
  contestId: string;
  entries: LeaderboardEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class LeaderboardService {
  /**
   * Fetch paginated contest leaderboard standings from Redis Sorted Sets
   */
  public async getLeaderboard(
    contestId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedLeaderboard> {
    const redisKey = `contest:${contestId}:leaderboard`;
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    // 1. Query Redis Sorted Set by highest score descending
    const rawData = await redisClient.zrevrange(redisKey, start, stop, 'WITHSCORES');
    const total = await redisClient.zcard(redisKey);

    if (rawData.length === 0) {
      return {
        contestId,
        entries: [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // 2. Parse userId and score pairs
    const pairs: Array<{ userId: string; score: number }> = [];
    for (let i = 0; i < rawData.length; i += 2) {
      pairs.push({
        userId: rawData[i],
        score: parseFloat(rawData[i + 1]),
      });
    }

    // 3. Batch fetch user profile details from MongoDB
    const userIds = pairs.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } }).select(
      'username name avatarUrl institution rating'
    );
    const userMap = new Map<string, IUser>();
    users.forEach((u) => userMap.set(u._id.toString(), u));

    // 4. Map into leaderboard entries with decoded scores
    const entries: LeaderboardEntry[] = pairs.map((pair, index) => {
      const user = userMap.get(pair.userId);
      const solvedCount = Math.max(0, Math.floor(pair.score / 1000000));
      const penaltyMinutes = Math.max(0, solvedCount * 1000000 - pair.score);

      return {
        rank: start + index + 1,
        userId: pair.userId,
        username: user?.username || 'Unknown',
        name: user?.name || user?.username || 'Anonymous Contestant',
        avatarUrl: user?.avatarUrl,
        institution: user?.institution,
        rating: user?.rating || 1500,
        score: pair.score,
        solvedCount,
        penaltyMinutes,
      };
    });

    return {
      contestId,
      entries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Update participant score in Redis Sorted Set and emit real-time WebSocket update
   */
  public async updateScore(
    contestId: string,
    userId: string,
    solvedCount: number,
    penaltyMinutes: number
  ): Promise<number> {
    const score = solvedCount * 1000000 - penaltyMinutes;
    const redisKey = `contest:${contestId}:leaderboard`;

    // 1. ZADD in Redis
    await redisClient.zadd(redisKey, score, userId);

    // 2. Query updated rank (0-indexed)
    const rankIndex = await redisClient.zrevrank(redisKey, userId);
    const displayRank = rankIndex !== null ? rankIndex + 1 : 1;

    // 3. Fetch user details for notification
    const user = await User.findById(userId).select('username name avatarUrl rating');

    const updatePayload = {
      contestId,
      userId,
      username: user?.username || 'Contestant',
      name: user?.name || user?.username,
      avatarUrl: user?.avatarUrl,
      score,
      solvedCount,
      penaltyMinutes,
      rank: displayRank,
      timestamp: new Date().toISOString(),
    };

    // 4. Broadcast live update to contest room via WebSocket
    emitToContest(contestId, 'leaderboard:update', updatePayload);

    logger.info(`[LeaderboardService] Updated score for user ${userId} in contest ${contestId}: rank #${displayRank}, score=${score}`);
    return displayRank;
  }

  /**
   * Retrieve a specific user's live rank in a contest
   */
  public async getUserRank(
    contestId: string,
    userId: string
  ): Promise<{
    rank: number | null;
    score: number | null;
    solvedCount: number;
    penaltyMinutes: number;
  }> {
    const redisKey = `contest:${contestId}:leaderboard`;

    const [rankIndex, rawScore] = await Promise.all([
      redisClient.zrevrank(redisKey, userId),
      redisClient.zscore(redisKey, userId),
    ]);

    if (rankIndex === null || rawScore === null) {
      return { rank: null, score: null, solvedCount: 0, penaltyMinutes: 0 };
    }

    const score = parseFloat(rawScore);
    const solvedCount = Math.max(0, Math.floor(score / 1000000));
    const penaltyMinutes = Math.max(0, solvedCount * 1000000 - score);

    return {
      rank: rankIndex + 1,
      score,
      solvedCount,
      penaltyMinutes,
    };
  }
}

export const leaderboardService = new LeaderboardService();
