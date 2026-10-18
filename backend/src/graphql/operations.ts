import { SampleOperation } from '../types/graphql.types';

// The tabs Altair opens with. They run as-is against the seeded database with the demo token.
export const SAMPLE_OPERATIONS: SampleOperation[] = [
  {
    name: 'Me',
    pinned: true,
    query: `# The explorer is already signed in as the demo account (see the Environments panel).
# Run "Demo login" to get a fresh token, or "Login" with a seeded account.
query Me {
  me {
    id
    email
    fullName
    type
    roleType
    roleName
    isDemo
    permissions
  }
}`,
  },
  {
    name: 'Request forms',
    pinned: true,
    query: `query RequestForms($input: ListInput) {
  documents(input: $input) {
    totalItems
    totalPages
    data {
      id
      docNumber
      status
      statusDes
      vesselName
      imoNumber
      grt
      eta
      berthNames
      vesselStatus
      agencyName
    }
  }
}`,
    variables: { input: { page: 1, limit: 10, filter: { status: 'PendingReview' }, order: [{ column: 'createAt', dir: 'desc' }] } },
  },
  {
    name: 'Request form detail',
    pinned: true,
    query: `query RequestForm($id: Int!) {
  document(id: $id)
}`,
    variables: { id: 1 },
  },
  {
    name: 'Vessels',
    pinned: true,
    query: `query Vessels($input: ListInput) {
  vessels(input: $input) {
    totalItems
    data {
      id
      name
      imoNumber
      officialNumber
      grossTonnage
      vesselFlagName
      vesselTypeName
    }
  }
}`,
    variables: { input: { page: 1, limit: 10, search: '', filter: { showAll: true } } },
  },
  {
    name: 'VTMS',
    pinned: true,
    query: `query Vtms($input: ListInput) {
  vtmsSummary {
    vessel_in
    vessel_out
    vessel_dock
    anchor
  }
  logBooks(input: $input) {
    totalItems
    data
  }
}`,
    variables: { input: { page: 1, limit: 5 } },
  },
  {
    name: 'Port dues and reports',
    pinned: true,
    query: `query PortDuesAndReports {
  portDues(input: { page: 1, limit: 5 }) {
    totalItems
    data
  }
  report(name: "sum-vessel-agency", startDate: "2025-01-01", endDate: "2026-12-31")
}`,
  },
  {
    name: 'Options',
    pinned: true,
    query: `query Options {
  berths: options(kind: "berths")
  purposeTypes: options(kind: "purposeTypes")
  documentStatus: options(kind: "documentStatus")
}`,
  },
  {
    name: 'Demo login',
    pinned: true,
    query: `mutation DemoLogin {
  demoLogin {
    token {
      access_token
      refresh_token
    }
    user {
      fullName
      roleType
      isDemo
    }
  }
}`,
  },
  {
    name: 'Login',
    pinned: true,
    query: `mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token {
      access_token
      refresh_token
    }
    user {
      id
      fullName
      roleType
    }
  }
}`,
    variables: { email: 'admin@pmis.local', password: 'Admin@12345678' },
  },
];
