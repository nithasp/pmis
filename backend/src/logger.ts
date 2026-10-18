import pino from 'pino';
import { config } from './config';

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.new_password',
  '*.confirm_password',
  '*.old_password',
  '*.refresh_token',
  '*.access_token',
];

export const logger = pino({
  level: config.logLevel,
  redact: { paths: REDACTED_PATHS, remove: true },
  base: null,
  ...(config.prettyLogs
    ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
    : {}),
});
