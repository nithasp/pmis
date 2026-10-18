import { makeExecutableSchema } from '@graphql-tools/schema';
import { Request, RequestHandler } from 'express';
import { ASTVisitor, GraphQLError, ValidationContext } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';
import { config } from '../config';
import { tokenService } from '../services';
import { AuthUser } from '../types/auth.types';
import { bearerToken, requestSource } from '../utils/request';
import { resolvers } from './resolvers';
import { GraphQLContext } from '../types/graphql.types';
import { typeDefs } from './typeDefs';

export const GRAPHQL_PATH = '/graphql';

export const schema = makeExecutableSchema({ typeDefs, resolvers });

async function userFromRequest(req: Request): Promise<AuthUser | null> {
  const token = bearerToken(req.headers.authorization);
  if (!token) return null;
  try {
    return await tokenService.authenticate(token);
  } catch {
    return null;
  }
}

const disableIntrospection = (context: ValidationContext): ASTVisitor => ({
  Field(node) {
    if (node.name.value === '__schema' || node.name.value === '__type') {
      context.reportError(new GraphQLError('Introspection is disabled', { nodes: [node] }));
    }
  },
});

// Same JWT as the REST API: send `Authorization: Bearer <token>` with every GraphQL request.
export const graphqlHandler: RequestHandler = createHandler<GraphQLContext>({
  schema,
  context: async (req) => ({ user: await userFromRequest(req.raw), source: requestSource(req.raw) }),
  validationRules: config.graphql.introspection ? [] : [disableIntrospection],
});
