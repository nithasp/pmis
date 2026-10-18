import { AuthUser, SessionSource } from './auth.types';
import { Row } from './database.types';

export interface SampleOperation {
  name: string;
  query: string;
  variables?: Record<string, unknown>;
  pinned?: boolean;
}

export interface GraphQLContext extends Record<PropertyKey, unknown> {
  user: AuthUser | null;
  source: SessionSource;
}

export interface ListInput {
  page?: number | null;
  limit?: number | null;
  search?: string | null;
  order?: unknown;
  filter?: Row | null;
}
