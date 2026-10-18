import { RenderOptions, SANDBOX_FRAME_CSP, getDistDirectory, isSandboxFrame, renderAltair, renderInitSnippet } from 'altair-static';
import express, { Request, Response, Router } from 'express';
import helmet from 'helmet';
import { config } from '../config';
import { GRAPHQL_PATH } from '../graphql';
import { SAMPLE_OPERATIONS } from '../graphql/operations';
import { tokenService, userRepository } from '../services';
import { asyncHandler } from '../utils/asyncHandler';

export const ALTAIR_PATH = '/altair';

// Altair is a single-page app with inline styles, web workers and a sandboxed frame for scripts,
// none of which pass the API's own policy. It gets one of its own, on this path only.
const altairCsp = helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    connectSrc: ["'self'", 'https:', 'http:', 'ws:', 'wss:'],
    workerSrc: ["'self'", 'blob:'],
    frameSrc: ["'self'", 'blob:', 'data:'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'self'"],
  },
});

// With demo access on, the explorer opens already signed in as the demo account. The token is the
// same one POST /auth/demo hands to anyone who asks, so nothing more is exposed.
async function demoToken(req: Request): Promise<string> {
  if (!config.demo.loginEnabled) return '';
  const user = await userRepository.findByEmail(config.demo.email);
  if (!user || !user.enabled || !user.is_demo) return '';
  const pair = await tokenService.issueSession(user, true, { ipAddress: req.ip ?? null, userAgent: 'altair' });
  return pair.access_token;
}

async function renderOptions(req: Request): Promise<RenderOptions> {
  const endpointURL = `${config.publicUrl || `${req.protocol}://${req.get('host') ?? 'localhost'}`}${GRAPHQL_PATH}`;
  const initialHeaders = { Authorization: 'Bearer {{accessToken}}' };
  return {
    baseURL: `${ALTAIR_PATH}/`,
    endpointURL,
    initialHeaders,
    serveInitialOptionsInSeperateRequest: true,
    preserveState: false,
    disableAccount: true,
    initialEnvironments: {
      base: { title: 'PMIS API', variables: { accessToken: await demoToken(req) } },
    },
    initialSettings: { 'schema.reloadOnStart': true, theme: 'dark' },
    initialWindows: SAMPLE_OPERATIONS.filter((operation) => operation.pinned).map((operation) => ({
      initialName: operation.name,
      endpointURL,
      initialQuery: operation.query,
      initialVariables: JSON.stringify(operation.variables ?? {}, null, 2),
      initialHeaders,
    })),
  };
}

const router = Router();

router.use(altairCsp);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const path = req.originalUrl.replace(/\?.*/, '');
    if (!path.endsWith('/')) {
      res.redirect(301, `${path}/`);
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(renderAltair(await renderOptions(req)));
  }),
);

router.get(
  '/initial_options.js',
  asyncHandler(async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.type('text/javascript').send(renderInitSnippet(await renderOptions(req)));
  }),
);

router.use(
  express.static(getDistDirectory(), {
    index: false,
    setHeaders: (res, filePath) => {
      if (isSandboxFrame(filePath)) res.setHeader('Content-Security-Policy', SANDBOX_FRAME_CSP);
    },
  }),
);

export default router;
