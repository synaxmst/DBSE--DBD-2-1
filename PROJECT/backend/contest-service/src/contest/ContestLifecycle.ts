import cron from 'node-cron';
import { Contest } from '../models/Contest';
import { emitToContest, broadcastGlobal } from '../socket/SocketManager';
import { leaderboardService } from '../leaderboard/LeaderboardService';
import { logger } from '../logger';

export class ContestLifecycle {
  private cronTask: cron.ScheduledTask | null = null;
  private isRunningCheck: boolean = false;

  /**
   * Start the recurring 1-minute contest state machine monitor
   */
  public start(): void {
    logger.info('[Contest Lifecycle] Starting contest schedule monitor (Running every minute)...');

    // Run an initial check immediately on startup
    this.checkContests();

    // Schedule cron every minute
    this.cronTask = cron.schedule('* * * * *', async () => {
      await this.checkContests();
    });
  }

  /**
   * Stop the recurring cron monitor
   */
  public stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      logger.info('[Contest Lifecycle] Stopped contest schedule monitor.');
    }
  }

  /**
   * Check and transition contest states
   */
  public async checkContests(): Promise<void> {
    if (this.isRunningCheck) return;
    this.isRunningCheck = true;

    try {
      const now = new Date();

      // 1. Check for Upcoming -> Live transitions
      const upcomingToStart = await Contest.find({
        status: 'upcoming',
        startTime: { $lte: now },
      });

      for (const contest of upcomingToStart) {
        contest.status = 'live';
        await contest.save();

        logger.info(`[Contest Lifecycle] 🏁 Contest LIVE: "${contest.title}" (${contest._id})`);

        // Emit room event and global notification
        emitToContest(contest._id.toString(), 'contest:started', {
          contestId: contest._id.toString(),
          title: contest.title,
          startTime: contest.startTime,
          endTime: contest.endTime,
          status: 'live',
        });

        broadcastGlobal('notification:contest_started', {
          contestId: contest._id.toString(),
          title: contest.title,
          message: `Contest "${contest.title}" is now LIVE!`,
        });
      }

      // 2. Check for Live -> Ended transitions
      const liveToEnd = await Contest.find({
        status: 'live',
        endTime: { $lte: now },
      });

      for (const contest of liveToEnd) {
        contest.status = 'ended';

        // Fetch final standings from Redis to freeze into MongoDB
        try {
          const finalLeaderboard = await leaderboardService.getLeaderboard(
            contest._id.toString(),
            1,
            500
          );

          contest.finalRankings = finalLeaderboard.entries.map((entry) => ({
            rank: entry.rank,
            userId: entry.userId as any,
            username: entry.username,
            score: entry.score,
            solvedCount: entry.solvedCount,
            penaltyMinutes: entry.penaltyMinutes,
          }));
        } catch (rankErr: any) {
          logger.warn({ err: rankErr }, `[Contest Lifecycle] Notice freezing final rankings for contest ${contest._id}: ${rankErr.message}`);
        }

        await contest.save();

        logger.info(`[Contest Lifecycle] 🏆 Contest ENDED: "${contest.title}" (${contest._id}). Finalized ${contest.finalRankings.length} participant rankings.`);

        // Emit room event and global notification
        emitToContest(contest._id.toString(), 'contest:ended', {
          contestId: contest._id.toString(),
          title: contest.title,
          status: 'ended',
          topRankings: contest.finalRankings.slice(0, 10),
        });

        broadcastGlobal('notification:contest_ended', {
          contestId: contest._id.toString(),
          title: contest.title,
          message: `Contest "${contest.title}" has concluded. Official final rankings are available.`,
        });
      }
    } catch (error: any) {
      logger.error({ err: error }, '[Contest Lifecycle] Error evaluating contest state machine: ' + error.message);
    } finally {
      this.isRunningCheck = false;
    }
  }
}

export const contestLifecycle = new ContestLifecycle();
