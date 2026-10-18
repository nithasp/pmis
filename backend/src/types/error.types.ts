export type ErrorCode =
  | 'bad_request'
  | 'invalid_request'
  | 'no_token'
  | 'token_expired'
  | 'token_invalid'
  | 'invalid_credentials'
  | 'forbidden'
  | 'read_only'
  | 'not_found'
  | 'conflict'
  | 'gone'
  | 'rate_limited'
  | 'internal_error';

export interface HandledError {
  statusCode: number;
  message: string;
  translation: string;
  code: ErrorCode;
}
