import { config } from '../config';
import { logger } from '../logger';
import { Mail } from '../types/mail.types';

// The demo deployment has no mail server: every e-mail is written to the log (with its link), and
// the link is also returned to the caller so a tester can open it. Set MAIL_DRIVER=smtp and the
// SMTP_* values to deliver real mail.
export const mailService = {
  async send(mail: Mail): Promise<void> {
    if (config.mail.driver === 'smtp') {
      logger.warn({ to: mail.to, subject: mail.subject }, 'MAIL_DRIVER=smtp is configured but no SMTP transport is bundled; logging instead');
    }
    logger.info({ to: mail.to, subject: mail.subject, link: mail.link }, 'e-mail (log driver)');
  },

  registerLink: (token: string): string => `${config.frontendUrl}/register?token=${encodeURIComponent(token)}`,
  resetLink: (token: string): string => `${config.frontendUrl}/change-password?token=${encodeURIComponent(token)}`,
  surveyLink: (token: string): string => `${config.frontendUrl}/survey/answer?token=${encodeURIComponent(token)}`,
};
