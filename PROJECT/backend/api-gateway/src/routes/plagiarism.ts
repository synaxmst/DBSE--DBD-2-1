import { Router, Request, Response } from 'express';
import http from 'http';
import https from 'https';
import { authenticate, authorize } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();
const PLAGIARISM_SERVICE_URL = process.env.PLAGIARISM_SERVICE_URL || 'http://localhost:4002';

/**
 * Helper to proxy HTTP requests to the Plagiarism Service
 */
const proxyToPlagiarismService = (req: Request, res: Response, targetPath?: string) => {
  try {
    const urlPath = targetPath ?? req.url;
    const targetUrl = new URL(urlPath, PLAGIARISM_SERVICE_URL);

    // Merge search queries if present
    if (req.query && Object.keys(req.query).length > 0) {
      Object.entries(req.query).forEach(([key, val]) => {
        if (typeof val === 'string') {
          targetUrl.searchParams.set(key, val);
        }
      });
    }

    const isHttps = targetUrl.protocol === 'https:';
    const httpLib = isHttps ? https : http;

    const requestHeaders: http.OutgoingHttpHeaders = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      Accept: 'application/json',
    };

    if (req.headers.authorization) {
      requestHeaders.Authorization = req.headers.authorization;
    }

    const options: http.RequestOptions = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: req.method,
      headers: requestHeaders,
      timeout: 30000,
    };

    const proxyReq = httpLib.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode || 200);

      // Copy headers from target response
      if (proxyRes.headers['content-type']) {
        res.setHeader('Content-Type', proxyRes.headers['content-type']);
      }

      proxyRes.pipe(res);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Plagiarism service timed out after 30 seconds.',
        });
      }
    });

    proxyReq.on('error', (err: any) => {
      logger.error({ err }, '[API Gateway -> Plagiarism Service Proxy Error]: ' + err.message);
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: `Plagiarism service at ${PLAGIARISM_SERVICE_URL} is unreachable (${err.code || err.message}). Ensure backend/plagiarism-service is running on port 4002.`,
        });
      }
    });

    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) && req.body) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }

    proxyReq.end();
  } catch (error: any) {
    logger.error({ err: error }, '[Plagiarism Proxy Dispatch Error]: ' + (error?.message || error));
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to dispatch proxy request to plagiarism service.',
      });
    }
  }
};

/**
 * Proxy POST /api/plagiarism/scan
 */
router.post('/scan', authenticate, authorize('admin', 'setter'), (req: Request, res: Response) => {
  proxyToPlagiarismService(req, res, '/scan');
});

/**
 * Proxy POST /api/plagiarism/contest/:contestId/analyze
 */
router.post('/contest/:contestId/analyze', authenticate, authorize('admin', 'setter'), (req: Request, res: Response) => {
  proxyToPlagiarismService(req, res);
});

/**
 * Proxy GET /api/plagiarism/contest/:contestId/results
 */
router.get('/contest/:contestId/results', authenticate, authorize('admin', 'setter'), (req: Request, res: Response) => {
  proxyToPlagiarismService(req, res);
});

/**
 * Proxy GET /api/plagiarism/scan/:contestId
 */
router.get('/scan/:contestId', authenticate, authorize('admin', 'setter'), (req: Request, res: Response) => {
  proxyToPlagiarismService(req, res);
});

/**
 * Catch-all proxy for any POST/GET/other to /api/plagiarism and /api/plagiarism/*
 */
router.all('/*', authenticate, authorize('admin', 'setter'), (req: Request, res: Response) => {
  proxyToPlagiarismService(req, res);
});

router.all('/', authenticate, authorize('admin', 'setter'), (req: Request, res: Response) => {
  proxyToPlagiarismService(req, res, '/');
});

export default router;
