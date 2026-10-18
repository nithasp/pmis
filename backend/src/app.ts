import { randomUUID } from 'crypto';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import path from 'path';
import pinoHttp from 'pino-http';
import { config } from './config';
import { checkDatabase } from './database';
import { GRAPHQL_PATH, graphqlHandler } from './graphql';
import { logger } from './logger';
import { recordActivity } from './middleware/activity';
import { errorMiddleware, notFoundMiddleware } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';
import apiRoutes from './routes';
import altairRoutes, { ALTAIR_PATH } from './routes/altair.routes';
import { UPLOAD_DIR } from './storage/local.storage';

export const API_PREFIX = '/api/v1';
export const HEALTH_PATH = '/healthz';
const DOCS_DIR = path.resolve(process.cwd(), 'public', 'docs');
const MAX_REQUEST_ID_LENGTH = 64;

const app = express();

app.set('trust proxy', config.trustProxy);
app.set('etag', false);

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const forwarded = req.headers['x-request-id'];
      const id = typeof forwarded === 'string' && forwarded.length > 0 && forwarded.length <= MAX_REQUEST_ID_LENGTH ? forwarded : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    autoLogging: { ignore: (req) => req.url === HEALTH_PATH || (req.url?.startsWith(ALTAIR_PATH) ?? false) || (req.url?.startsWith('/uploads') ?? false) },
  }),
);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(express.urlencoded({ extended: false, limit: config.jsonBodyLimit }));

app.get(HEALTH_PATH, async (_req: Request, res: Response) => {
  if (!(await checkDatabase())) {
    res.status(503).json({ status: 'unavailable' });
    return;
  }
  res.json({ status: 'ok' });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'PMIS API is running', rest: API_PREFIX, graphql: GRAPHQL_PATH, altair: `${ALTAIR_PATH}/`, docs: '/docs/' });
});

if (config.storage.driver === 'local') {
  app.use('/uploads', express.static(UPLOAD_DIR, { index: false, maxAge: '1h' }));
}

app.use('/docs', express.static(DOCS_DIR, { index: 'index.html', maxAge: '5m' }));
app.use(ALTAIR_PATH, altairRoutes);
app.use(GRAPHQL_PATH, apiLimiter, graphqlHandler);

// The frontend's log-book service prefixes one path with /api/v1 twice; it lands on the same route
app.use(`${API_PREFIX}${API_PREFIX}`, (req, _res, next) => {
  req.url = req.url.replace(/^\/+/, '/');
  next();
}, apiLimiter, recordActivity, apiRoutes);
app.use(API_PREFIX, apiLimiter, recordActivity, apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
