import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../config/redis';
import { plagiarismDetector } from '../plagiarism/PlagiarismDetector';
import { PlagiarismReport } from '../models/PlagiarismReport';
import { logger } from '../logger';

const router = Router();

/**
 * POST /scan or POST /contest/:contestId/analyze
 * Trigger full tournament plagiarism scan
 */
router.post('/scan', async (req: Request, res: Response): Promise<void> => {
  try {
    const contestId = req.body.contestId || req.query.contestId;
    const threshold = parseFloat(req.body.threshold) || 0.7;

    if (!contestId) {
      res.status(400).json({
        success: false,
        error: 'contestId is required in the request body or query parameter.',
      });
      return;
    }

    const report = await plagiarismDetector.analyzeContest(String(contestId), threshold);

    res.status(200).json({
      success: true,
      data: report,
      message: `Plagiarism analysis complete for contest ${contestId}.`,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[Plagiarism Route] Scan Error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze contest plagiarism.',
    });
  }
});

/**
 * GET /scan/:contestId
 */
router.get('/scan/:contestId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { contestId } = req.params;

    const report = await PlagiarismReport.findOne({ contestId })
      .populate('matches.submission1Id', 'language executionTimeMs submittedAt')
      .populate('matches.submission2Id', 'language executionTimeMs submittedAt');

    if (!report) {
      res.status(404).json({
        success: false,
        error: `No plagiarism report found for contest ${contestId}. Please run analysis first.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[Plagiarism Route] Results Error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve plagiarism results.',
    });
  }
});

/**
 * POST /contest/:contestId/analyze
 * Trigger full tournament plagiarism scan
 */
router.post('/contest/:contestId/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { contestId } = req.params;
    const threshold = parseFloat(req.body.threshold) || 0.7;

    const report = await plagiarismDetector.analyzeContest(contestId, threshold);

    res.status(200).json({
      success: true,
      data: report,
      message: `Plagiarism analysis complete for contest ${contestId}.`,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[Plagiarism Route] Contest Analyze Error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze contest plagiarism.',
    });
  }
});

/**
 * GET /contest/:contestId/results
 * Fetch stored plagiarism report for a contest
 */
router.get('/contest/:contestId/results', async (req: Request, res: Response): Promise<void> => {
  try {
    const { contestId } = req.params;

    const report = await PlagiarismReport.findOne({ contestId })
      .populate('matches.submission1Id', 'language executionTimeMs submittedAt')
      .populate('matches.submission2Id', 'language executionTimeMs submittedAt');

    if (!report) {
      res.status(404).json({
        success: false,
        error: `No plagiarism report found for contest ${contestId}. Please run analysis first.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[Plagiarism Route] Results Error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve plagiarism results.',
    });
  }
});

/**
 * POST /submission/:submissionId/check
 * Check an individual submission against peer solutions
 */
router.post('/submission/:submissionId/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const threshold = parseFloat(req.body.threshold) || 0.7;

    const result = await plagiarismDetector.checkSubmission(submissionId, threshold);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[Plagiarism Route] Submission Check Error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check submission plagiarism.',
    });
  }
});

/**
 * GET /health and GET /api/health
 */
const healthHandler = async (_req: Request, res: Response) => {
  const isMongoOnline = mongoose.connection.readyState === 1;
  const isRedisOnline = redisClient.status === 'ready' || redisClient.status === 'connect';

  res.status(200).json({
    service: 'plagiarism-service',
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: isMongoOnline ? 'connected' : 'disconnected',
    redis: isRedisOnline ? 'connected' : 'disconnected',
    connections: {
      mongodb: isMongoOnline ? 'connected' : 'disconnected',
      redis: isRedisOnline ? 'connected' : 'disconnected',
    },
  });
};

router.get('/health', healthHandler);
router.get('/api/health', healthHandler);

export default router;
