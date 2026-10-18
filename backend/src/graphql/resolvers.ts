import { GraphQLError, GraphQLScalarType, Kind, ValueNode } from 'graphql';
import {
  aisService,
  authService,
  contractService,
  documentService,
  masterService,
  optionsService,
  portDueService,
  reportService,
  roleService,
  surveyService,
  userService,
  vesselImportService,
  vesselService,
  vtmsService,
} from '../services';
import { AuthUser } from '../types/auth.types';
import { Row } from '../types/database.types';
import { GraphQLContext, ListInput } from '../types/graphql.types';
import { ListQuery } from '../types/pagination.types';
import { AppError } from '../utils/errors';
import { parseListQuery } from '../utils/paging';

const OFFICER_TYPES = ['SuperAdmin', 'Admin', 'User'];

function requireUser(ctx: GraphQLContext): AuthUser {
  if (!ctx.user) throw new GraphQLError('กรุณาเข้าสู่ระบบ', { extensions: { code: 'UNAUTHENTICATED', translation: 'Access denied. No token provided.' } });
  return ctx.user;
}

function requireOfficer(ctx: GraphQLContext): AuthUser {
  const user = requireUser(ctx);
  if (!OFFICER_TYPES.includes(user.type)) throw new GraphQLError('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้', { extensions: { code: 'FORBIDDEN', translation: 'forbidden' } });
  return user;
}

// Service errors keep their Thai message and English translation in the error extensions
async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError) {
      throw new GraphQLError(err.message, { extensions: { code: err.code.toUpperCase(), status: err.statusCode, translation: err.translation } });
    }
    throw err;
  }
}

const by = (user: AuthUser): string => `user:${user.userId}`;

const toQuery = (input?: ListInput | null): { query: ListQuery; filter: Row } => {
  const query = parseListQuery({ page: input?.page ?? 1, limit: input?.limit ?? 10, search: input?.search ?? '', Order: input?.order ?? [] });
  return { query, filter: input?.filter ?? {} };
};

const parseLiteral = (ast: ValueNode): unknown => {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.OBJECT:
      return Object.fromEntries(ast.fields.map((f) => [f.name.value, parseLiteral(f.value)]));
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    case Kind.NULL:
      return null;
    default:
      return null;
  }
};

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral,
});

async function profileWithPermissions(user: AuthUser): Promise<Row> {
  const profile = await userService.profileOf(user.userId);
  const permissions = user.type === 'User' ? [...(await roleService.permissionsOf(user.roleId))] : [];
  return { ...profile, permissions };
}

const OPTIONS: Record<string, () => Promise<unknown> | unknown> = {
  countries: () => optionsService.countries(),
  provinces: () => optionsService.provinces(),
  roles: () => optionsService.roles(),
  authorities: () => optionsService.authorities(),
  vesselFlags: () => optionsService.vesselFlags(),
  vesselTypes: () => optionsService.vesselTypes(),
  vesselStatus: () => optionsService.vesselStatus(),
  vesselImportStatus: () => optionsService.vesselImportStatus(),
  documentStatus: () => optionsService.documentStatus(),
  agencyDocumentStatus: () => optionsService.agencyDocumentStatus(),
  berths: () => optionsService.berths(),
  berthTypes: () => optionsService.berthTypes(),
  jetties: () => optionsService.jetties(),
  purposes: () => optionsService.purposes(),
  purposeTypes: () => optionsService.purposeTypes(),
  locations: () => optionsService.locations(),
  products: () => optionsService.products(),
  productGroups: () => optionsService.productGroups(),
  productTypes: () => optionsService.productTypes(),
  cargoTypes: () => optionsService.cargoTypes(),
  cargoWharfage: () => optionsService.cargoWharfage(),
  paymentMethods: () => optionsService.paymentMethods(),
  paymentTerms: () => optionsService.paymentTerms(),
  cargoOwners: () => optionsService.cargoOwners(),
  terms: () => optionsService.terms(),
};

const MASTER_KINDS: Record<string, (q: ListQuery, f: Row) => Promise<unknown>> = {
  port: (q, f) => masterService.listPorts(q, f),
  berth: (q, f) => masterService.listBerths(q, f),
  purpose: (q, f) => masterService.listPurposes(q, f),
  product: (q, f) => masterService.listProducts(q, f.status),
  productType: (q, f) => masterService.listProductTypes(q, f.status),
  vesselFlag: (q, f) => masterService.listFlags(q, f.status),
  locate: (q, f) => masterService.listSimple('locate', q, f.status),
  useBerth: (q, f) => masterService.listSimple('use-berth', q, f.status),
  cargoType: (q, f) => masterService.listSimple('cargo-type', q, f.status),
  cargoWharfage: (q, f) => masterService.listSimple('cargo-wharfage', q, f.status),
  vesselType: (q, f) => masterService.listSimple('vessel-type', q, f.status),
  productGroup: (q, f) => masterService.listSimple('product-group', q, f.status),
};

export const resolvers = {
  JSON: JSONScalar,

  Query: {
    me: (_: unknown, __: unknown, ctx: GraphQLContext) => run(() => profileWithPermissions(requireUser(ctx))),

    documents: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        const { query, filter } = toQuery(args.input);
        return documentService.list(requireUser(ctx), filter, query);
      }),
    document: (_: unknown, args: { id: number }, ctx: GraphQLContext) => run(() => documentService.detail(args.id, requireUser(ctx))),

    vessels: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        const { query, filter } = toQuery(args.input);
        return vesselService.list(requireUser(ctx), filter, query);
      }),
    vessel: (_: unknown, args: { id: number }, ctx: GraphQLContext) => run(() => (requireUser(ctx), vesselService.detail(args.id))),
    vesselHistory: (_: unknown, args: { id: number; input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireUser(ctx);
        const { query, filter } = toQuery(args.input);
        return vesselService.history(args.id, { begin: filter.approvedDateBegin, end: filter.approvedDateEnd }, query);
      }),
    governmentVessels: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) => run(() => (requireUser(ctx), vesselService.listGovernment(toQuery(args.input).query))),

    logBooks: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return vtmsService.listLogBooks(filter, query);
      }),
    logBook: (_: unknown, args: { id: number }, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), vtmsService.logBookDetail(args.id))),
    anchors: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return vtmsService.listAnchors(filter, query);
      }),
    vtmsSummary: (_: unknown, __: unknown, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), vtmsService.summary())),

    vesselImports: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        const { query, filter } = toQuery(args.input);
        return vesselImportService.list(requireUser(ctx), filter, query);
      }),
    vesselImportsSent: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return vesselImportService.listSend(filter, query);
      }),
    vesselImport: (_: unknown, args: { id: number }, ctx: GraphQLContext) => run(() => vesselImportService.detail(args.id, requireUser(ctx))),

    portDuesPending: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return portDueService.pendingList(filter, query);
      }),
    portDues: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return portDueService.list(filter, query);
      }),
    portDue: (_: unknown, args: { id: number }, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), portDueService.detail(args.id))),

    contracts: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return contractService.list(filter, query);
      }),
    contract: (_: unknown, args: { id: number }, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), contractService.detail(args.id))),
    contractRates: (_: unknown, args: Row, ctx: GraphQLContext) => run(async () => (requireOfficer(ctx), contractService.rates(args as never))),

    surveys: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return surveyService.list(filter, query);
      }),
    survey: (_: unknown, args: { id: number }, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), surveyService.detail(args.id))),
    surveyResult: (_: unknown, args: { id: number }, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), surveyService.result(args.id))),

    roles: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), roleService.list(toQuery(args.input).query))),
    role: (_: unknown, args: { id: number }, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), roleService.detail(args.id))),
    users: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return userService.listOfficers({ enabled: filter.enabled, roleId: filter.roleId }, query);
      }),
    vesselAgencies: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return userService.listAgencies(filter, query);
      }),

    options: (_: unknown, args: { kind: string }, ctx: GraphQLContext) =>
      run(async () => {
        if (!['countries', 'provinces', 'terms'].includes(args.kind)) requireUser(ctx);
        const source = OPTIONS[args.kind];
        if (!source) throw new AppError(`ไม่พบตัวเลือก ${args.kind}`, 404, 'not_found', `Unknown option kind. Use one of: ${Object.keys(OPTIONS).join(', ')}`);
        return source();
      }),
    masterData: (_: unknown, args: { kind: string; input?: ListInput }, ctx: GraphQLContext) =>
      run(async () => {
        requireUser(ctx);
        const source = MASTER_KINDS[args.kind];
        if (!source) throw new AppError(`ไม่พบข้อมูลพื้นฐาน ${args.kind}`, 404, 'not_found', `Unknown master data kind. Use one of: ${Object.keys(MASTER_KINDS).join(', ')}`);
        const { query, filter } = toQuery(args.input);
        return source(query, filter);
      }),

    aisMap: (_: unknown, __: unknown, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), aisService.map())),
    aisActivity: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) => run(() => (requireOfficer(ctx), aisService.activity(toQuery(args.input).query))),
    aisLogs: (_: unknown, args: { input?: ListInput }, ctx: GraphQLContext) =>
      run(() => {
        requireOfficer(ctx);
        const { query, filter } = toQuery(args.input);
        return aisService.logs(filter, query);
      }),

    report: (_: unknown, args: { name: string; startDate?: string; endDate?: string; berthId?: number; year?: string }, ctx: GraphQLContext) =>
      run(async () => {
        requireOfficer(ctx);
        if (!reportService.isReport(args.name)) throw new AppError(`ไม่พบรายงาน ${args.name}`, 404, 'not_found', 'report not found');
        return reportService.data(args.name, args);
      }),
  },

  Mutation: {
    login: (_: unknown, args: { email: string; password: string }, ctx: GraphQLContext) => run(() => authService.login(args.email, args.password, ctx.source)),
    demoLogin: (_: unknown, __: unknown, ctx: GraphQLContext) => run(() => authService.demoLogin(ctx.source)),
    refresh: (_: unknown, args: { refreshToken: string }, ctx: GraphQLContext) => run(() => authService.refresh(args.refreshToken, ctx.source)),
    logout: (_: unknown, __: unknown, ctx: GraphQLContext) =>
      run(async () => {
        if (ctx.user) await authService.logout(ctx.user.sessionId);
        return true;
      }),
    acceptTerm: (_: unknown, __: unknown, ctx: GraphQLContext) => run(async () => ({ ...(await userService.acceptTerm(requireUser(ctx).userId)), permissions: [] })),

    createDocumentDraft: (_: unknown, args: { input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return documentService.saveVessel(null, user, args.input, by(user));
      }),
    updateDocument: (_: unknown, args: { id: number; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return documentService.saveVessel(args.id, user, args.input, by(user));
      }),
    addDocumentBerth: (_: unknown, args: { documentId: number; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return documentService.saveBerth(args.documentId, null, user, args.input, by(user));
      }),
    addDocumentProduct: (_: unknown, args: { documentId: number; berthId: number; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return documentService.saveProduct(args.documentId, args.berthId, null, user, args.input, by(user));
      }),
    saveDocumentInvoice: (_: unknown, args: { documentId: number; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return documentService.saveInvoice(args.documentId, user, args.input, by(user));
      }),
    submitDocument: (_: unknown, args: { id: number }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return documentService.submitForReview(args.id, user, by(user));
      }),
    approveDocument: (_: unknown, args: { id: number; spacialBerths?: Row[] }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireOfficer(ctx);
        return documentService.approve(args.id, user, { spacialBerths: args.spacialBerths ?? [] }, by(user));
      }),
    rejectDocument: (_: unknown, args: { id: number; rejectNote: string }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireOfficer(ctx);
        return documentService.reject(args.id, user, args.rejectNote, by(user));
      }),
    cancelDocument: (_: unknown, args: { id: number }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return documentService.cancel(args.id, user, by(user), user.type !== 'Agency');
      }),

    createVessel: (_: unknown, args: { input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return vesselService.create(user, args.input, by(user));
      }),
    updateVessel: (_: unknown, args: { id: number; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return vesselService.update(user, args.id, args.input, by(user));
      }),

    saveLogBook: (_: unknown, args: { id?: number | null; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireOfficer(ctx);
        return vtmsService.saveLogBook(args.id ?? null, user, args.input, by(user));
      }),
    saveAnchor: (_: unknown, args: { id?: number | null; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireOfficer(ctx);
        return vtmsService.saveAnchors(args.id ?? null, user, args.input, by(user));
      }),
    saveVesselImport: (_: unknown, args: { id?: number | null; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireUser(ctx);
        return vesselImportService.save(args.id ?? null, user, args.input, by(user));
      }),
    approveVesselImport: (_: unknown, args: { id: number; grossTonnage?: number | null }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireOfficer(ctx);
        return vesselImportService.approve(args.id, user, args.grossTonnage, by(user));
      }),
    createPortDue: (_: unknown, args: { input: Row }, ctx: GraphQLContext) => run(() => portDueService.create(args.input, by(requireOfficer(ctx)))),
    cancelPortDue: (_: unknown, args: { id: number; note: string }, ctx: GraphQLContext) => run(() => portDueService.cancel(args.id, args.note, by(requireOfficer(ctx)))),
    saveContract: (_: unknown, args: { id?: number | null; input: Row }, ctx: GraphQLContext) => run(() => contractService.save(args.id ?? null, args.input, by(requireOfficer(ctx)))),
    saveSurvey: (_: unknown, args: { id?: number | null; input: Row }, ctx: GraphQLContext) => run(() => surveyService.save(args.id ?? null, args.input, by(requireOfficer(ctx)))),
    submitSurvey: (_: unknown, args: { input: Row }) => run(() => surveyService.submit(args.input)),
    saveRole: (_: unknown, args: { id?: number | null; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireOfficer(ctx);
        return args.id ? roleService.update(args.id, args.input, by(user)) : roleService.create(args.input, by(user));
      }),
    saveUser: (_: unknown, args: { id?: number | null; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireOfficer(ctx);
        return args.id ? userService.updateOfficer(args.id, args.input, by(user)) : userService.createOfficer(args.input, by(user));
      }),
    saveVesselAgency: (_: unknown, args: { id?: number | null; input: Row }, ctx: GraphQLContext) =>
      run(() => {
        const user = requireOfficer(ctx);
        return args.id ? userService.updateAgency(args.id, args.input, by(user)) : userService.createAgency(args.input, by(user));
      }),
  },
};
