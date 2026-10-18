// The GraphQL surface mirrors the REST API: the same services answer both, and the same Bearer
// token authorises both. Rich sub-documents (berths, products, invoice...) travel as JSON so the
// shapes stay identical to what the REST endpoints (and the Nuxt frontend) already use.
export const typeDefs = /* GraphQL */ `
  scalar JSON

  type Token {
    access_token: String!
    refresh_token: String!
  }

  type Profile {
    id: Int!
    email: String!
    name: String!
    fullName: String!
    type: String!
    roleId: Int
    roleName: String!
    roleType: String!
    company: String!
    phone: String!
    mobilePhone: String!
    status: String!
    enabled: Boolean!
    isAcceptedTerm: Boolean!
    isFirstLogin: Boolean!
    isDemo: Boolean!
    permissions: [String!]!
  }

  type LoginResult {
    token: Token!
    user: Profile!
  }

  type Page {
    totalItems: Int!
    totalPages: Int!
    data: [JSON!]!
  }

  type DocumentListItem {
    id: Int!
    docNumber: String!
    status: String!
    statusDes: String!
    vesselName: String!
    imoNumber: String!
    officialNumber: String!
    grt: Float!
    eta: String
    berthNames: String!
    vesselStatus: String!
    vesselStatusDes: String!
    agencyName: String!
    createAt: String
    approvedAt: String
    isNewShip: Boolean!
  }

  type DocumentPage {
    totalItems: Int!
    totalPages: Int!
    data: [DocumentListItem!]!
  }

  type Vessel {
    id: Int!
    name: String!
    owner: String!
    imoNumber: String!
    mmsiNumber: String!
    officialNumber: String!
    callSign: String!
    grossTonnage: Float!
    netTonnage: Float!
    lengthOverall: Float!
    breadthExtreme: Float!
    depth: Float!
    vesselFlagId: Int!
    vesselFlagName: String!
    vesselTypeId: Int!
    vesselTypeName: String!
    uploadFiles: JSON!
  }

  type VesselPage {
    totalItems: Int!
    totalPages: Int!
    data: [Vessel!]!
  }

  type VtmsSummary {
    vessel_in: Int!
    vessel_out: Int!
    vessel_dock: Int!
    anchor: Int!
  }

  input ListInput {
    page: Int = 1
    limit: Int = 10
    search: String
    order: JSON
    filter: JSON
  }

  type Query {
    "The signed-in account, with the permission codes of its role"
    me: Profile!
    "Request forms visible to the caller (agencies see their own)"
    documents(input: ListInput): DocumentPage!
    document(id: Int!): JSON!
    vessels(input: ListInput): VesselPage!
    vessel(id: Int!): Vessel!
    vesselHistory(id: Int!, input: ListInput): Page!
    governmentVessels(input: ListInput): Page!
    logBooks(input: ListInput): Page!
    logBook(id: Int!): JSON!
    anchors(input: ListInput): Page!
    vtmsSummary: VtmsSummary!
    vesselImports(input: ListInput): Page!
    vesselImportsSent(input: ListInput): Page!
    vesselImport(id: Int!): JSON!
    portDuesPending(input: ListInput): Page!
    portDues(input: ListInput): Page!
    portDue(id: Int!): JSON!
    contracts(input: ListInput): Page!
    contract(id: Int!): JSON!
    contractRates(start: String!, end: String!, initialRate: Float!, annualIncreaseRate: Float!, rateChangeCycle: Int!, rateChangeStartYear: String): JSON!
    surveys(input: ListInput): Page!
    survey(id: Int!): JSON!
    surveyResult(id: Int!): JSON!
    roles(input: ListInput): Page!
    role(id: Int!): JSON!
    users(input: ListInput): Page!
    vesselAgencies(input: ListInput): Page!
    "Dropdown sources: countries, berths, purposes, purposeTypes, vesselFlags, vesselTypes, products, productTypes, productGroups, cargoTypes, cargoWharfage, paymentMethods, paymentTerms, documentStatus, vesselImportStatus, jetties, cargoOwners, roles"
    options(kind: String!): JSON!
    masterData(kind: String!, input: ListInput): Page!
    aisMap: JSON!
    aisActivity(input: ListInput): Page!
    aisLogs(input: ListInput): Page!
    "Report rows as served to the PDF pages: sum-submit-late-order, sum-submit-late-list, user-document-count, document-count, approved-agency, sum-vessel-agency, sum-port-due-agency, sum-cargo-value-port-agency and the sum-foreigner-* variants"
    report(name: String!, startDate: String, endDate: String, berthId: Int, year: String): JSON!
  }

  type Mutation {
    login(email: String!, password: String!): LoginResult!
    "Signs in as the shared read-only-capable demo account, exactly like POST /auth/demo"
    demoLogin: LoginResult!
    refresh(refreshToken: String!): LoginResult!
    logout: Boolean!
    acceptTerm: Profile!
    createDocumentDraft(input: JSON!): JSON!
    updateDocument(id: Int!, input: JSON!): JSON!
    addDocumentBerth(documentId: Int!, input: JSON!): JSON!
    addDocumentProduct(documentId: Int!, berthId: Int!, input: JSON!): JSON!
    saveDocumentInvoice(documentId: Int!, input: JSON!): JSON!
    submitDocument(id: Int!): JSON!
    approveDocument(id: Int!, spacialBerths: JSON): JSON!
    rejectDocument(id: Int!, rejectNote: String!): JSON!
    cancelDocument(id: Int!): JSON!
    createVessel(input: JSON!): Vessel!
    updateVessel(id: Int!, input: JSON!): Vessel!
    saveLogBook(id: Int, input: JSON!): JSON!
    saveAnchor(id: Int, input: JSON!): JSON!
    saveVesselImport(id: Int, input: JSON!): JSON!
    approveVesselImport(id: Int!, grossTonnage: Float): JSON!
    createPortDue(input: JSON!): JSON!
    cancelPortDue(id: Int!, note: String!): JSON!
    saveContract(id: Int, input: JSON!): JSON!
    saveSurvey(id: Int, input: JSON!): JSON!
    submitSurvey(input: JSON!): JSON!
    saveRole(id: Int, input: JSON!): JSON!
    saveUser(id: Int, input: JSON!): JSON!
    saveVesselAgency(id: Int, input: JSON!): JSON!
  }
`;
