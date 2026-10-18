import { DOCUMENT_STATUS_EN, DOCUMENT_STATUS_TH, PENDING_CONFIRMATION_STATUSES, VESSEL_STATUS_EN, VESSEL_STATUS_TH } from '../constants/statuses';
import pool, { withTransaction } from '../database';
import { DocumentRepository } from '../repositories/document.repository';
import { VesselRepository } from '../repositories/vessel.repository';
import { AuthUser, RoleType, UploadFileRef } from '../types/auth.types';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { formatDateTime, toDate } from '../utils/dates';
import { AppError, forbidden, notFound } from '../utils/errors';
import { idOrNull, iso, num, str } from '../utils/rows';
import { FileService, UploadInput } from './file.service';
import { pdfToBuffer } from './template.service';

const PENDING = ['PendingReview', 'PendingApproval', ...PENDING_CONFIRMATION_STATUSES];
const OFFICER_TYPES = ['SuperAdmin', 'Admin', 'User'];
const REVIEW_ROLES: RoleType[] = ['SuperAdmin', 'Admin', 'DocumentReviewer'];
const APPROVE_ROLES: RoleType[] = ['SuperAdmin', 'Admin', 'DocumentApprove', 'StatApprove'];
const BERTH_ROLES: Partial<Record<RoleType, string[]>> = {
  SuperAdmin: ['MIT', 'TCT', 'Spacial', 'Other'],
  Admin: ['MIT', 'TCT', 'Spacial', 'Other'],
  DocumentBerthOfficer: ['MIT', 'TCT', 'Spacial', 'Other'],
  DocumentBerthOfficerMIT: ['MIT'],
  DocumentBerthOfficerTCT: ['TCT'],
  DocumentBerthOfficerSpacial: ['Spacial'],
};
const CONFIRMABLE_TYPES = ['MIT', 'TCT', 'Spacial'];

export const statusLabels = (status: string) => ({
  statusDes: DOCUMENT_STATUS_TH[status] ?? status,
  statusDesEn: DOCUMENT_STATUS_EN[status] ?? status,
});

export function toDocumentVessel(row: Row, files: UploadFileRef[] = []): Row {
  return {
    documentVesselId: row.document_vessel_id ?? 0,
    vesselFlagId: row.vessel_flag_id ?? 0,
    vesselTypeId: row.vessel_type_id ?? 0,
    vesselId: row.vessel_id ?? 0,
    vesselOwner: str(row.vessel_owner),
    vesselOwnerId: row.vessel_owner_id ?? 0,
    vesselName: str(row.vessel_name),
    vesselImoNumber: str(row.vessel_imo_number),
    vesselMMSiNumber: str(row.vessel_mmsi_number),
    vesselDSVNumber: str(row.vessel_dsv_number),
    vesselOfficialNumber: str(row.vessel_official_number),
    vesselCallSign: str(row.vessel_call_sign),
    vesselNationality: str(row.vessel_nationality),
    vesselCountry: str(row.vessel_country),
    vesselLoadWeight: num(row.vessel_load_weight),
    vesselGrossTonnage: num(row.vessel_gross_tonnage),
    vesselNetTonnage: num(row.vessel_net_tonnage),
    vesselLengthOverall: num(row.vessel_length_overall),
    vesselBreadthExtreme: num(row.vessel_breadth_extreme),
    vesselDepth: num(row.vessel_depth),
    vesselMainEngine: str(row.vessel_main_engine),
    vesselBandAndModel: str(row.vessel_band_and_model),
    vesselLicenseExpiredDate: row.vessel_license_expired_date ?? null,
    vesselFlagName: str(row.vessel_flag_name),
    vesselFlagPath: str(row.vessel_flag_path),
    vesselFlag: str(row.vessel_flag_name),
    vesselTypeName: str(row.vessel_type_name),
    vesselUploadFiles: files,
  };
}

export function toDocumentListItem(row: Row): Row {
  const labels = statusLabels(str(row.status));
  return {
    id: row.id,
    createAt: iso(row.request_date ?? row.created_at),
    requestDate: iso(row.request_date ?? row.created_at),
    status: row.status,
    statusDes: labels.statusDes,
    statusDesEn: labels.statusDesEn,
    docNumber: str(row.doc_number),
    vesselId: row.vessel_id ?? 0,
    vesselName: str(row.vessel_name),
    name: str(row.vessel_name),
    imoNumber: str(row.vessel_imo_number),
    officialNumber: str(row.vessel_official_number),
    grt: num(row.vessel_gross_tonnage),
    loa: num(row.vessel_length_overall),
    eta: iso(row.eta),
    etd: iso(row.etd),
    berthNames: str(row.berth_names),
    purpose: str(row.purpose_names),
    vesselStatus: row.vessel_status,
    vesselStatusDes: VESSEL_STATUS_TH[str(row.vessel_status)] ?? str(row.vessel_status),
    vesselStatusDesEn: VESSEL_STATUS_EN[str(row.vessel_status)] ?? str(row.vessel_status),
    portAt: iso(row.port_at),
    departuredAt: iso(row.departured_at),
    portDues: num(row.port_dues),
    vesselFlagId: row.vessel_flag_id ?? 0,
    vesselFlagName: str(row.vessel_flag_name),
    vesselFlagImage: str(row.vessel_flag_path),
    vesselTypeId: row.vessel_type_id ?? 0,
    vesselTypeName: str(row.vessel_type_name),
    callSign: str(row.vessel_call_sign),
    agencyName: str(row.agency_name),
    agencyUserId: row.agency_user_id,
    isNewShip: row.is_new_ship === true,
    approvedAt: iso(row.approved_at),
    approveDate: iso(row.approved_at),
    submittedAt: iso(row.submitted_at),
    updatedAt: iso(row.updated_at),
  };
}

const toProduct = (row: Row): Row => ({
  id: row.id,
  purposeId: row.purpose_id ?? 0,
  purposeName: str(row.purpose_name),
  productTypeId: row.product_type_id ?? 0,
  productTypeName: str(row.product_type_name),
  productGroupId: row.product_group_id ?? 0,
  productGroupName: str(row.product_group_name),
  cargoWharfageId: row.cargo_wharfage_id ?? 0,
  cargoWharfageName: str(row.cargo_wharfage_name),
  mTonQty: num(row.m_ton_qty),
  rTonQty: num(row.r_ton_qty),
  packageAmount: num(row.package_amount),
  receiver: str(row.receiver),
  cargoOwnerId: row.cargo_owner_id ?? 0,
  cargoOwnerName: str(row.cargo_owner_name),
  berthType: str(row.berth_type),
});

const toBerth = (row: Row, products: Row[], files: UploadFileRef[]): Row => ({
  id: row.id,
  berthId: row.berth_id ?? 0,
  berthName: str(row.berth_name_alt),
  berthNameTh: str(row.berth_name_th),
  berthNameEn: str(row.berth_name_en),
  berthType: str(row.berth_type),
  purposeTypeId: row.purpose_type_id ?? 0,
  purposeTypeName: str(row.purpose_type_name),
  purposeId: row.purpose_id ?? 0,
  purposeName: str(row.purpose_name),
  cargoTypeId: row.cargo_type_id ?? 0,
  cargoTypeName: str(row.cargo_type_name),
  cargoWharfageId: products[0]?.cargoWharfageId ?? 0,
  passengers: num(row.passengers),
  estimatedArrival: iso(row.estimated_arrival),
  estimatedDeparture: iso(row.estimated_departure),
  note: str(row.note),
  sequence: num(row.sequence, 1),
  jettyId: row.jetty_id ?? 0,
  selectedJettyId: row.jetty_id ?? 0,
  jettyName: str(row.jetty_name),
  etb: iso(row.etb),
  etd: iso(row.etd),
  berthSaveDate: iso(row.berth_save_date),
  cargoWorkTime: str(row.cargo_work_time),
  isConfirmed: !!row.berth_save_date,
  products,
  files,
});

const toInvoice = (row: Row | null): Row => ({
  id: row?.id ?? 0,
  customerId: row?.customer_id ?? null,
  customerCode: str(row?.customer_code),
  customerReference: str(row?.customer_code),
  name: str(row?.name),
  taxId: str(row?.tax_id),
  contactName: str(row?.contact_name),
  paymentMethodId: row?.payment_method_id ?? 0,
  paymentMethodName: str(row?.payment_method_name),
  paymentPeriodDay: num(row?.payment_period_day, 30),
  paymentTermId: row?.payment_term_id ?? 0,
  paymentTermName: str(row?.payment_term_name),
  countryId: row?.country_id ?? 0,
  countryName: str(row?.country_name),
  subDistrictId: row?.sub_district_id ?? 0,
  subDistrictName: str(row?.sub_district_name),
  districtId: row?.district_id ?? 0,
  districtName: str(row?.district_name),
  provinceId: row?.province_id ?? 0,
  provinceName: str(row?.province_name),
  postCode: str(row?.post_code),
  stageProvince: str(row?.stage_province),
  address: str(row?.address),
  phoneNumber: str(row?.phone_number),
  secondaryPhoneNumber: str(row?.secondary_phone_number),
});

const vesselColumns = (input: Row): Row => ({
  vessel_id: idOrNull(input.vesselId),
  vessel_flag_id: idOrNull(input.vesselFlagId),
  vessel_type_id: idOrNull(input.vesselTypeId),
  vessel_owner: str(input.vesselOwner),
  vessel_name: str(input.vesselName).trim(),
  vessel_imo_number: str(input.vesselImoNumber),
  vessel_mmsi_number: str(input.vesselMMSiNumber ?? input.vesselMmsiNumber),
  vessel_dsv_number: str(input.vesselDSVNumber ?? input.vesselDsvNumber),
  vessel_official_number: str(input.vesselOfficialNumber),
  vessel_call_sign: str(input.vesselCallSign),
  vessel_nationality: str(input.vesselNationality),
  vessel_country: str(input.vesselCountry),
  vessel_load_weight: num(input.vesselLoadWeight),
  vessel_gross_tonnage: num(input.vesselGrossTonnage),
  vessel_net_tonnage: num(input.vesselNetTonnage),
  vessel_length_overall: num(input.vesselLengthOverall),
  vessel_breadth_extreme: num(input.vesselBreadthExtreme),
  vessel_depth: num(input.vesselDepth),
  vessel_main_engine: str(input.vesselMainEngine),
  vessel_band_and_model: str(input.vesselBandAndModel),
  vessel_license_expired_date: toDate(input.vesselLicenseExpiredDate),
});

export function createDocumentService(documents: DocumentRepository, vessels: VesselRepository, files: FileService) {
  const isAgency = (user: AuthUser): boolean => user.type === 'Agency';
  const isOfficer = (user: AuthUser): boolean => OFFICER_TYPES.includes(user.type);
  const berthTypesOf = (user: AuthUser): string[] => BERTH_ROLES[user.roleType] ?? [];

  async function load(id: number, db?: Queryable): Promise<Row> {
    const row = await documents.findById(id, db);
    if (!row) throw notFound('ใบคำร้อง', 'document not found');
    return row;
  }

  function assertCanRead(user: AuthUser, doc: Row): void {
    if (isAgency(user) && doc.agency_user_id !== user.userId) throw forbidden('ไม่มีสิทธิ์เข้าถึงใบคำร้องนี้', 'forbidden');
  }

  function assertCanEdit(user: AuthUser, doc: Row): void {
    assertCanRead(user, doc);
    if (isAgency(user) && !['Draft', 'PendingEdit'].includes(str(doc.status))) {
      throw new AppError('ใบคำร้องนี้ไม่สามารถแก้ไขได้ในสถานะปัจจุบัน', 400, 'bad_request', 'The request cannot be edited in its current status');
    }
    if (isOfficer(user) && !['Draft', 'PendingEdit', ...PENDING].includes(str(doc.status))) {
      throw new AppError('ใบคำร้องนี้ไม่สามารถแก้ไขได้ในสถานะปัจจุบัน', 400, 'bad_request', 'The request cannot be edited in its current status');
    }
  }

  async function berthsOf(documentId: number, db?: Queryable): Promise<Row[]> {
    const rows = await documents.berths(documentId, db);
    const products = await documents.products(rows.map((r) => r.id as number), db);
    const berthFiles = await files.refsMany('documentBerth', rows.map((r) => r.id as number), db);
    return rows.map((r) => toBerth(r, (products.get(r.id as number) ?? []).map(toProduct), berthFiles.get(r.id as number) ?? []));
  }

  async function detailOf(doc: Row, user?: AuthUser, db?: Queryable): Promise<Row> {
    const id = doc.id as number;
    const [berths, invoice, spacial, docFiles] = await Promise.all([
      berthsOf(id, db),
      documents.invoice(id, db),
      documents.spacialBerths(id, db),
      files.refs('document', id, db),
    ]);
    const labels = statusLabels(str(doc.status));
    const status = str(doc.status);
    const unconfirmed = berths.filter((b) => CONFIRMABLE_TYPES.includes(str(b.berthType)) && !b.isConfirmed);
    const canApprove =
      !!user &&
      PENDING_CONFIRMATION_STATUSES.includes(status) &&
      unconfirmed.some((b) => berthTypesOf(user).includes(str(b.berthType)));
    return {
      id,
      requestDate: iso(doc.request_date ?? doc.created_at),
      createAt: iso(doc.request_date ?? doc.created_at),
      docNumber: str(doc.doc_number),
      estimatedArrival: iso(doc.eta),
      estimatedDeparture: iso(doc.etd),
      status,
      statusDescription: labels.statusDes,
      statusDes: labels.statusDes,
      statusDesEn: labels.statusDesEn,
      vesselStatus: doc.vessel_status,
      vesselStatusDes: VESSEL_STATUS_TH[str(doc.vessel_status)] ?? str(doc.vessel_status),
      vesselStatusDesEn: VESSEL_STATUS_EN[str(doc.vessel_status)] ?? str(doc.vessel_status),
      rejectedNote: Array.isArray(doc.reject_notes) ? doc.reject_notes : [],
      vessel: toDocumentVessel(doc, docFiles),
      invoice: toInvoice(invoice),
      berths,
      spacialBerths: spacial.map((s) => ({
        berthId: s.berth_id,
        berthName: str(s.berth_name),
        berthType: str(s.berth_type),
        jettyId: s.jetty_id ?? 0,
        jettyName: str(s.jetty_name),
        eta: iso(s.eta),
        etb: iso(s.etb),
        etd: iso(s.etd),
      })),
      vesselDocuments: docFiles,
      canApprove,
      isNewShip: doc.is_new_ship === true,
      agencyName: str(doc.agency_name),
      agencyUserId: doc.agency_user_id,
      agencyEmail: str(doc.agency_email),
      agencyPhone: str(doc.agency_phone),
      portAt: iso(doc.port_at),
      departuredAt: iso(doc.departured_at),
      approvedAt: iso(doc.approved_at),
      submittedAt: iso(doc.submitted_at),
      portDues: num(doc.port_dues),
      berthNames: str(doc.berth_names),
    };
  }

  const emptyDraft = (): Row => ({
    id: 0,
    requestDate: null,
    docNumber: '',
    estimatedArrival: null,
    estimatedDeparture: null,
    status: 'Draft',
    statusDescription: DOCUMENT_STATUS_TH.Draft,
    statusDes: DOCUMENT_STATUS_TH.Draft,
    vesselStatus: 'PendingBerth',
    vesselStatusDes: VESSEL_STATUS_TH.PendingBerth,
    rejectedNote: [],
    vessel: toDocumentVessel({}),
    invoice: toInvoice(null),
    berths: [],
    spacialBerths: [],
    vesselDocuments: [],
    canApprove: false,
    isNewShip: false,
  });

  async function setStatus(doc: Row, status: string, by: string, extra: Row = {}, db?: Queryable): Promise<void> {
    await documents.update(doc.id as number, { status, updated_by: by, ...extra }, db);
  }

  return {
    toDocumentListItem,

    // ---- lists ---------------------------------------------------------------------------------
    list(user: AuthUser, filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      return documents
        .list(
          {
            agencyUserId: isAgency(user) ? user.userId : null,
            status: filter.status,
            excludeDraft: !isAgency(user),
            berthId: filter.berthId,
            begin: filter.begin,
            end: filter.end,
            etaBegin: filter.etaBegin,
            etaEnd: filter.etaEnd,
            vesselStatus: filter.vesselStatus,
            vesselFlagId: filter.vesselFlagId,
            purposeId: filter.purposeId,
            keyword: filter.keyword,
          },
          query,
        )
        .then((page) => ({ ...page, data: page.data.map(toDocumentListItem) }));
    },

    vesselDocuments(user: AuthUser, vesselId: number, filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      return documents
        .list(
          { agencyUserId: isAgency(user) ? user.userId : null, vesselId, excludeDraft: true, status: filter.status, approvedBegin: filter.approvedDateBegin, approvedEnd: filter.approvedDateEnd },
          query,
        )
        .then((page) => ({ ...page, data: page.data.map(toDocumentListItem) }));
    },

    // ---- detail / draft -----------------------------------------------------------------------
    async detail(id: number, user: AuthUser): Promise<Row> {
      const doc = await load(id);
      assertCanRead(user, doc);
      return detailOf(doc, user);
    },

    async draft(user: AuthUser): Promise<Row> {
      const doc = await documents.findDraft(user.userId);
      return doc ? detailOf(doc, user) : emptyDraft();
    },

    // The vessel step of the form: creates the agency's draft, or updates the vessel block of a document
    async saveVessel(id: number | null, user: AuthUser, input: Row, by: string): Promise<Row> {
      const docId = await withTransaction(async (tx) => {
        let doc: Row | null = id === null ? await documents.findDraft(user.userId, tx) : await load(id, tx);
        if (id !== null && doc) assertCanEdit(user, doc);
        if (!doc) {
          if (!isAgency(user)) throw forbidden('เฉพาะตัวแทนเรือเท่านั้นที่สร้างใบคำร้องได้', 'Only vessel agencies can create a request');
          doc = await documents.create({ agency_user_id: user.userId, status: 'Draft', created_by: by, updated_by: by }, tx);
        }
        const columns = vesselColumns(input);
        if (!columns.vessel_id && columns.vessel_name) {
          const { rows } = await tx.query(
            'SELECT id FROM vessels WHERE deleted_at IS NULL AND LOWER(name) = LOWER($1) AND ($2 = \'\' OR imo_number = $2) ORDER BY id LIMIT 1',
            [columns.vessel_name, columns.vessel_imo_number],
          );
          if (rows[0]) columns.vessel_id = rows[0].id as number;
        }
        if (columns.vessel_id) {
          const vessel = await vessels.findById(columns.vessel_id as number, tx);
          if (vessel) {
            columns.vessel_owner_id = vessel.owner_id ?? null;
            if (!columns.vessel_flag_id) columns.vessel_flag_id = vessel.vessel_flag_id ?? null;
            if (!columns.vessel_type_id) columns.vessel_type_id = vessel.vessel_type_id ?? null;
          }
        }
        await documents.upsertVessel(doc.id as number, columns, tx);
        await documents.update(doc.id as number, { is_new_ship: !columns.vessel_id, updated_by: by }, tx);
        if (Array.isArray(input.vesselUploadFiles)) await files.syncLinks('document', doc.id as number, input.vesselUploadFiles, tx);
        return doc.id as number;
      });
      return detailOf(await load(docId), user);
    },

    // ---- berths -------------------------------------------------------------------------------
    async berthDetail(documentId: number, berthId: number, user: AuthUser): Promise<Row> {
      const doc = await load(documentId);
      assertCanRead(user, doc);
      const berths = await berthsOf(documentId);
      const berth = berths.find((b) => b.id === berthId);
      if (!berth) throw notFound('ท่าเทียบเรือในใบคำร้อง', 'document berth not found');
      return berth;
    },

    async saveBerth(documentId: number, berthId: number | null, user: AuthUser, input: Row, by: string): Promise<Row> {
      const doc = await load(documentId);
      assertCanEdit(user, doc);
      const berthMasterId = idOrNull(input.berthId);
      if (!berthMasterId) throw new AppError('กรุณาเลือกท่าเทียบเรือ', 400, 'invalid_request', 'berthId is required');
      const { rows: masters } = await pool.query('SELECT id, berth_type FROM berths WHERE id = $1 AND deleted_at IS NULL', [berthMasterId]);
      if (!masters[0]) throw notFound('ท่าเทียบเรือ', 'berth not found');
      const data: Row = {
        berth_id: berthMasterId,
        berth_type: str(input.berthType) || str(masters[0].berth_type),
        purpose_type_id: idOrNull(input.purposeTypeId),
        purpose_id: idOrNull(input.purposeId),
        cargo_type_id: idOrNull(input.cargoTypeId),
        passengers: Math.round(num(input.passengers)),
        estimated_arrival: toDate(input.estimatedArrival),
        estimated_departure: toDate(input.estimatedDeparture),
        note: str(input.note),
      };
      if (!data.estimated_arrival) throw new AppError('กรุณาระบุวันเวลาที่คาดว่าจะมาถึง (ETA)', 400, 'invalid_request', 'estimatedArrival is required');
      if (data.estimated_departure && data.estimated_departure < data.estimated_arrival) {
        throw new AppError('วันออกจากท่าต้องไม่ก่อนวันเข้าเทียบท่า', 400, 'invalid_request', 'estimatedDeparture must not be before estimatedArrival');
      }
      let id = berthId;
      if (id === null) {
        const existing = await documents.berths(documentId);
        const row = await documents.insertBerth({ document_id: documentId, sequence: Math.round(num(input.sequence)) || existing.length + 1, ...data });
        id = row.id as number;
      } else {
        const existing = await documents.berthById(id);
        if (!existing || existing.document_id !== documentId) throw notFound('ท่าเทียบเรือในใบคำร้อง', 'document berth not found');
        await documents.updateBerth(id, data);
      }
      await documents.update(documentId, { updated_by: by });
      return this.berthDetail(documentId, id, user);
    },

    async deleteBerth(documentId: number, berthId: number, user: AuthUser, by: string): Promise<void> {
      const doc = await load(documentId);
      assertCanEdit(user, doc);
      const existing = await documents.berthById(berthId);
      if (!existing || existing.document_id !== documentId) throw notFound('ท่าเทียบเรือในใบคำร้อง', 'document berth not found');
      await documents.deleteBerth(berthId);
      await documents.update(documentId, { updated_by: by });
    },

    // ---- products -----------------------------------------------------------------------------
    async productDetail(documentId: number, berthId: number, productId: number, user: AuthUser): Promise<Row> {
      const doc = await load(documentId);
      assertCanRead(user, doc);
      const row = await documents.productById(productId);
      if (!row || row.document_berth_id !== berthId) throw notFound('สินค้า', 'product not found');
      return toProduct(row);
    },

    async saveProduct(documentId: number, berthId: number, productId: number | null, user: AuthUser, input: Row, by: string): Promise<Row> {
      const doc = await load(documentId);
      assertCanEdit(user, doc);
      const berth = await documents.berthById(berthId);
      if (!berth || berth.document_id !== documentId) throw notFound('ท่าเทียบเรือในใบคำร้อง', 'document berth not found');
      let cargoOwnerId = idOrNull(input.cargoOwnerId);
      const receiver = str(input.receiver).trim();
      if (!cargoOwnerId && receiver) {
        const { rows } = await pool.query('SELECT id FROM cargo_owners WHERE LOWER(name) = LOWER($1) LIMIT 1', [receiver]);
        cargoOwnerId = rows[0] ? (rows[0].id as number) : ((await pool.query('INSERT INTO cargo_owners (name) VALUES ($1) RETURNING id', [receiver])).rows[0].id as number);
      }
      const data: Row = {
        purpose_id: idOrNull(input.purposeId) ?? berth.purpose_id,
        product_type_id: idOrNull(input.productTypeId),
        product_group_id: idOrNull(input.productGroupId),
        cargo_wharfage_id: idOrNull(input.cargoWharfageId),
        m_ton_qty: num(input.mTonQty),
        r_ton_qty: num(input.rTonQty),
        package_amount: Math.round(num(input.packageAmount)),
        receiver,
        cargo_owner_id: cargoOwnerId,
        berth_type: str(input.berthType) || str(berth.berth_type),
      };
      let id = productId;
      if (id === null) id = (await documents.insertProduct({ document_berth_id: berthId, ...data })).id as number;
      else {
        const existing = await documents.productById(id);
        if (!existing || existing.document_berth_id !== berthId) throw notFound('สินค้า', 'product not found');
        await documents.updateProduct(id, data);
      }
      await documents.update(documentId, { updated_by: by });
      return this.productDetail(documentId, berthId, id, user);
    },

    async deleteProduct(documentId: number, berthId: number, productId: number, user: AuthUser): Promise<void> {
      const doc = await load(documentId);
      assertCanEdit(user, doc);
      const existing = await documents.productById(productId);
      if (!existing || existing.document_berth_id !== berthId) throw notFound('สินค้า', 'product not found');
      await documents.deleteProduct(productId);
    },

    // ---- invoice ------------------------------------------------------------------------------
    async saveInvoice(documentId: number, user: AuthUser, input: Row, by: string): Promise<Row> {
      const doc = await load(documentId);
      assertCanEdit(user, doc);
      const data: Row = {
        customer_id: idOrNull(input.customerId),
        name: str(input.name).trim(),
        tax_id: str(input.taxId).trim(),
        contact_name: str(input.contactName),
        payment_method_id: idOrNull(input.paymentMethodId),
        payment_term_id: idOrNull(input.paymentTermId),
        country_id: idOrNull(input.countryId),
        sub_district_id: idOrNull(input.subDistrictId),
        district_id: idOrNull(input.districtId),
        province_id: idOrNull(input.provinceId),
        post_code: str(input.postCode),
        stage_province: str(input.stageProvince),
        address: str(input.address),
        phone_number: str(input.phoneNumber),
        secondary_phone_number: str(input.secondaryPhoneNumber),
      };
      await withTransaction(async (tx) => {
        // Billing details are remembered as a customer so the next request can pick them from the search box
        if (!data.customer_id && data.tax_id) {
          const { rows } = await tx.query('SELECT id FROM customers WHERE tax_id = $1 LIMIT 1', [data.tax_id]);
          if (rows[0]) data.customer_id = rows[0].id as number;
          else {
            const { rows: created } = await tx.query(
              `INSERT INTO customers (code, name, tax_id, contact_name, payment_method_id, payment_term_id, country_id, province_id, district_id, sub_district_id,
                 post_code, stage_province, address, phone_number, secondary_phone_number)
               VALUES ('', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
              [data.name, data.tax_id, data.contact_name, data.payment_method_id, data.payment_term_id, data.country_id, data.province_id, data.district_id, data.sub_district_id, data.post_code, data.stage_province, data.address, data.phone_number, data.secondary_phone_number],
            );
            data.customer_id = created[0].id as number;
            await tx.query("UPDATE customers SET code = 'C' || LPAD(id::text, 6, '0') WHERE id = $1", [data.customer_id]);
          }
        }
        await documents.upsertInvoice(documentId, data, tx);
        await documents.update(documentId, { updated_by: by }, tx);
      });
      return detailOf(await load(documentId), user);
    },

    // ---- workflow -----------------------------------------------------------------------------
    async submitForReview(documentId: number, user: AuthUser, by: string): Promise<Row> {
      const doc = await load(documentId);
      assertCanEdit(user, doc);
      if (!['Draft', 'PendingEdit'].includes(str(doc.status))) {
        throw new AppError('ใบคำร้องนี้ถูกยื่นแล้ว', 400, 'bad_request', 'The request has already been submitted');
      }
      if (!str(doc.vessel_name)) throw new AppError('กรุณากรอกข้อมูลเรือก่อนยื่นคำร้อง', 400, 'invalid_request', 'Vessel information is required');
      const berths = await documents.berths(documentId);
      if (!berths.length) throw new AppError('กรุณาเพิ่มท่าเทียบเรืออย่างน้อย 1 ท่า', 400, 'invalid_request', 'At least one berth is required');
      if (!(await documents.invoice(documentId))) throw new AppError('กรุณากรอกข้อมูลใบแจ้งหนี้', 400, 'invalid_request', 'Invoice information is required');
      await withTransaction(async (tx) => {
        const patch: Row = { status: 'PendingReview', submitted_at: new Date(), updated_by: by };
        if (!doc.doc_number) patch.doc_number = await documents.nextDocNumber(tx);
        if (!doc.request_date) patch.request_date = new Date();
        await documents.update(documentId, patch, tx);
      });
      return detailOf(await load(documentId), user);
    },

    async cancel(documentId: number, user: AuthUser, by: string, admin: boolean): Promise<Row> {
      const doc = await load(documentId);
      assertCanRead(user, doc);
      if (admin && !isOfficer(user)) throw forbidden();
      if (['Canceled', 'AdminCanceled'].includes(str(doc.status))) throw new AppError('ใบคำร้องนี้ถูกยกเลิกแล้ว', 400, 'bad_request', 'The request is already canceled');
      if (str(doc.status) === 'Approved' && doc.vessel_status === 'Berth') {
        throw new AppError('เรือเทียบท่าแล้ว ไม่สามารถยกเลิกใบคำร้องได้', 400, 'bad_request', 'The vessel has already berthed');
      }
      await setStatus(doc, admin ? 'AdminCanceled' : 'Canceled', by);
      return detailOf(await load(documentId), user);
    },

    async reject(documentId: number, user: AuthUser, note: string, by: string): Promise<Row> {
      const doc = await load(documentId);
      if (!isOfficer(user)) throw forbidden();
      if (!PENDING.includes(str(doc.status))) throw new AppError('ใบคำร้องนี้ไม่อยู่ในสถานะที่ส่งกลับได้', 400, 'bad_request', 'The request cannot be sent back in its current status');
      const snapshot = await detailOf(doc, user);
      const notes = Array.isArray(doc.reject_notes) ? doc.reject_notes : [];
      await withTransaction(async (tx) => {
        await documents.addHistory(documentId, str(doc.status), snapshot, tx);
        await setStatus(doc, 'PendingEdit', by, { reject_notes: JSON.stringify([...notes, { date: new Date().toISOString(), message: note, by, fromStatus: doc.status }]) }, tx);
      });
      return detailOf(await load(documentId), user);
    },

    // VTMS asks the agency to correct an approved request
    async requestEdit(documentId: number, user: AuthUser, note: string, by: string): Promise<Row> {
      const doc = await load(documentId);
      if (!isOfficer(user)) throw forbidden();
      if (['Canceled', 'AdminCanceled', 'Draft'].includes(str(doc.status))) {
        throw new AppError('ใบคำร้องนี้ไม่อยู่ในสถานะที่ขอแก้ไขได้', 400, 'bad_request', 'The request cannot be sent for editing in its current status');
      }
      const snapshot = await detailOf(doc, user);
      const notes = Array.isArray(doc.reject_notes) ? doc.reject_notes : [];
      await withTransaction(async (tx) => {
        await documents.addHistory(documentId, str(doc.status), snapshot, tx);
        await setStatus(doc, 'PendingEdit', by, { reject_notes: JSON.stringify([...notes, { date: new Date().toISOString(), message: note, by, fromStatus: doc.status }]) }, tx);
      });
      return detailOf(await load(documentId), user);
    },

    async recall(documentId: number, user: AuthUser, by: string): Promise<Row> {
      const doc = await load(documentId);
      if (!isOfficer(user)) throw forbidden();
      if (str(doc.status) !== 'PendingEdit') throw new AppError('เรียกคืนได้เฉพาะใบคำร้องที่รอแก้ไข', 400, 'bad_request', 'Only requests pending edit can be recalled');
      const notes = Array.isArray(doc.reject_notes) ? [...doc.reject_notes] : [];
      const last = notes.pop();
      const back = last?.fromStatus && PENDING.includes(String(last.fromStatus)) ? String(last.fromStatus) : 'PendingReview';
      await setStatus(doc, back, by, { reject_notes: JSON.stringify(notes) });
      return detailOf(await load(documentId), user);
    },

    async approve(documentId: number, user: AuthUser, input: Row, by: string): Promise<Row> {
      const doc = await load(documentId);
      if (!isOfficer(user)) throw forbidden();
      const status = str(doc.status);

      if (status === 'PendingReview') {
        if (!REVIEW_ROLES.includes(user.roleType)) throw forbidden('เฉพาะเจ้าหน้าที่ตรวจคำร้องเท่านั้น', 'forbidden');
        await setStatus(doc, 'PendingApproval', by);
        return detailOf(await load(documentId), user);
      }

      if (status === 'PendingApproval') {
        if (!APPROVE_ROLES.includes(user.roleType)) throw forbidden('เฉพาะเจ้าหน้าที่อนุมัติคำร้องเท่านั้น', 'forbidden');
        const berths = await documents.berths(documentId);
        const needsConfirmation = berths.some((b) => CONFIRMABLE_TYPES.includes(str(b.berth_type)));
        await this.finishApproval(doc, needsConfirmation ? 'PendingConfirmation' : 'Approved', by);
        return detailOf(await load(documentId), user);
      }

      if (PENDING_CONFIRMATION_STATUSES.includes(status)) {
        const mine = berthTypesOf(user);
        if (!mine.length) throw forbidden('เฉพาะเจ้าหน้าที่ท่าเรือเท่านั้น', 'forbidden');
        const berths = await documents.berths(documentId);
        const target = berths.filter((b) => CONFIRMABLE_TYPES.includes(str(b.berth_type)) && mine.includes(str(b.berth_type)) && !b.berth_save_date);
        if (!target.length) throw new AppError('ท่าเรือของท่านยืนยันใบคำร้องนี้แล้ว', 400, 'bad_request', 'Your berth has already confirmed this request');
        const choices: Row[] = Array.isArray(input.spacialBerths) ? input.spacialBerths : [];
        await withTransaction(async (tx) => {
          for (const b of target) {
            const choice = choices.find((c) => idOrNull(c.berthId) === b.berth_id);
            await documents.updateBerth(b.id as number, { berth_save_date: new Date(), jetty_id: idOrNull(choice?.jettyId) ?? b.jetty_id }, tx);
          }
          if (choices.length) {
            const existing = await documents.spacialBerths(documentId, tx);
            const merged = [
              ...existing.filter((e) => !choices.some((c) => idOrNull(c.berthId) === e.berth_id)),
              ...choices.filter((c) => idOrNull(c.berthId)).map((c) => ({ berth_id: idOrNull(c.berthId), jetty_id: idOrNull(c.jettyId), eta: null, etb: null, etd: null })),
            ];
            await documents.replaceSpacialBerths(documentId, merged, tx);
          }
          const after = await documents.berths(documentId, tx);
          const types = new Set(after.filter((b) => CONFIRMABLE_TYPES.includes(str(b.berth_type))).map((b) => str(b.berth_type)));
          const confirmed = new Set(after.filter((b) => CONFIRMABLE_TYPES.includes(str(b.berth_type)) && b.berth_save_date).map((b) => str(b.berth_type)));
          if (confirmed.size >= types.size) await this.finishApproval(doc, 'Approved', by, tx);
          else await setStatus(doc, confirmed.size === 0 ? 'PendingConfirmation' : `PendingConfirmation${Math.min(confirmed.size, 2)}`, by, {}, tx);
        });
        return detailOf(await load(documentId), user);
      }

      throw new AppError('ใบคำร้องนี้ไม่อยู่ในสถานะที่อนุมัติได้', 400, 'bad_request', 'The request cannot be approved in its current status');
    },

    // Approval registers a new vessel from the request so later requests can reuse it
    async finishApproval(doc: Row, status: string, by: string, db?: Queryable): Promise<void> {
      const run = async (tx: Queryable) => {
        const extra: Row = status === 'Approved' ? { approved_at: new Date() } : {};
        if (status === 'Approved' && !doc.vessel_id && str(doc.vessel_name)) {
          const vessel = await vessels.create(
            {
              name: str(doc.vessel_name),
              owner: str(doc.vessel_owner),
              owner_id: doc.agency_user_id,
              imo_number: str(doc.vessel_imo_number),
              mmsi_number: str(doc.vessel_mmsi_number),
              dsv_number: str(doc.vessel_dsv_number),
              official_number: str(doc.vessel_official_number),
              call_sign: str(doc.vessel_call_sign),
              load_weight: num(doc.vessel_load_weight),
              gross_tonnage: num(doc.vessel_gross_tonnage),
              net_tonnage: num(doc.vessel_net_tonnage),
              length_overall: num(doc.vessel_length_overall),
              breadth_extreme: num(doc.vessel_breadth_extreme),
              depth: num(doc.vessel_depth),
              main_engine: str(doc.vessel_main_engine),
              band_and_model: str(doc.vessel_band_and_model),
              vessel_flag_id: doc.vessel_flag_id ?? null,
              vessel_type_id: doc.vessel_type_id ?? null,
              license_expired_date: doc.vessel_license_expired_date ?? null,
              created_by: by,
              updated_by: by,
            },
            tx,
          );
          await documents.upsertVessel(doc.id as number, { vessel_id: vessel.id, vessel_owner_id: doc.agency_user_id }, tx);
          for (const f of await files.refs('document', doc.id as number, tx)) await files.addLink('vessel', vessel.id as number, f.id, f.fileType, tx);
        }
        await setStatus(doc, status, by, extra, tx);
      };
      if (db) await run(db);
      else await withTransaction(run);
    },

    async history(documentId: number, user: AuthUser): Promise<Row> {
      const doc = await load(documentId);
      assertCanRead(user, doc);
      const latest = await documents.latestHistory(documentId);
      const current = await detailOf(doc, user);
      return { documentHistory: latest ? latest.snapshot : current, history: latest ? [{ status: latest.status, createdAt: iso(latest.created_at) }] : [] };
    },

    // ---- berth files --------------------------------------------------------------------------
    async uploadBerthFile(documentId: number, berthId: number, input: UploadInput, user: AuthUser): Promise<UploadFileRef> {
      const doc = await load(documentId);
      assertCanRead(user, doc);
      const berth = await documents.berthById(berthId);
      if (!berth || berth.document_id !== documentId) throw notFound('ท่าเทียบเรือในใบคำร้อง', 'document berth not found');
      const ref = await files.upload(input);
      await files.addLink('documentBerth', berthId, ref.id, ref.fileType || 'other');
      return ref;
    },

    async deleteBerthFile(documentId: number, berthId: number, fileId: number, user: AuthUser): Promise<void> {
      const doc = await load(documentId);
      assertCanRead(user, doc);
      await files.removeLink('documentBerth', berthId, fileId);
    },

    // ---- ship table (MIT / TCT) ---------------------------------------------------------------
    async berthQueue(berthAlt: string, query: ListQuery): Promise<Row[]> {
      const page = await documents.berthQueue(berthAlt.toUpperCase() === 'SPACIAL' ? 'Spacial' : berthAlt.toUpperCase(), { ...query, limit: null, offset: 0 });
      return page.data.map((r) => ({
        ...toDocumentListItem(r),
        id: r.document_berth_id,
        documentId: r.id,
        berthId: r.berth_id ?? 0,
        eta: iso(r.estimated_arrival),
        etb: iso(r.etb),
        etd: iso(r.etd ?? r.estimated_departure),
        berthNames: str(r.berth_name_alt),
        berthSaveDate: iso(r.berth_save_date),
        jettyId: r.jetty_id ?? 0,
        jettyName: str(r.jetty_name),
        cargoWorkTime: str(r.cargo_work_time),
      }));
    },

    async updateBerthEtd(documentBerthId: number, input: Row, by: string): Promise<Row> {
      const berth = await documents.berthById(documentBerthId);
      if (!berth) throw notFound('ท่าเทียบเรือในใบคำร้อง', 'document berth not found');
      const etb = toDate(input.etb);
      const etd = toDate(input.etd);
      if (etb && etd && etd < etb) throw new AppError('ETD ต้องไม่ก่อน ETB', 400, 'invalid_request', 'etd must not be before etb');
      await documents.updateBerth(documentBerthId, {
        jetty_id: idOrNull(input.jettyId) ?? berth.jetty_id,
        etb: etb ?? berth.etb,
        etd: etd ?? berth.etd,
        berth_save_date: new Date(),
        cargo_work_time: etb && etd ? `${Math.round(((etd.getTime() - etb.getTime()) / 3_600_000) * 10) / 10} ชม.` : str(berth.cargo_work_time),
      });
      await documents.update(berth.document_id as number, { updated_by: by });
      return toBerth((await documents.berthById(documentBerthId))!, [], []);
    },

    async vesselsIn(berthAlt: string, query: ListQuery): Promise<Row[]> {
      const page = await documents.vesselsIn(berthAlt.toUpperCase() === 'SPACIAL' ? 'Spacial' : berthAlt.toUpperCase(), { ...query, limit: null, offset: 0 });
      return page.data.map((r) => ({
        ...toDocumentListItem(r),
        id: r.log_book_id,
        logBookId: r.log_book_id,
        documentId: r.id,
        documentBerthId: r.document_berth_id,
        berthId: r.berth_id ?? 0,
        eta: iso(r.mooring_date),
        etb: iso(r.mooring_date ?? r.etb),
        etd: iso(r.etd ?? r.departure_date),
        berthNames: str(r.berth_name_alt),
        berthSaveDate: iso(r.berth_save_date),
        jettyId: r.jetty_id ?? 0,
        jettyName: str(r.jetty_name),
        cargoWorkTime: str(r.cargo_work_time),
      }));
    },

    async updateVesselInEtd(logBookId: number, input: Row, by: string): Promise<Row> {
      const etd = toDate(input.etd);
      if (!etd) throw new AppError('กรุณาระบุ ETD', 400, 'invalid_request', 'etd is required');
      const { rows } = await pool.query(
        `SELECT ld.id, ld.document_berth_id FROM log_book_details ld JOIN log_books lb ON lb.id = ld.log_book_id
         WHERE lb.id = $1 AND ld.type_doc = 'Arrival' ORDER BY ld.id DESC LIMIT 1`,
        [logBookId],
      );
      if (!rows[0]) throw notFound('บันทึกเรือเข้า', 'vessel-in record not found');
      if (rows[0].document_berth_id) await documents.updateBerth(rows[0].document_berth_id as number, { etd });
      await pool.query('UPDATE log_books SET updated_at = NOW(), updated_by = $2 WHERE id = $1', [logBookId, by]);
      return { id: logBookId, etd: etd.toISOString() };
    },

    // ---- PDF ----------------------------------------------------------------------------------
    async exportPdf(documentId: number, user: AuthUser): Promise<Buffer> {
      const doc = await load(documentId);
      assertCanRead(user, doc);
      const detail = await detailOf(doc, user);
      return pdfToBuffer((pdf) => {
        pdf.font('thai-bold').fontSize(18).text('สำนักงานท่าเรืออุตสาหกรรมมาบตาพุด', { align: 'center' });
        pdf.fontSize(15).text('ใบคำร้องขอนำเรือเข้าเทียบท่า (Berth Request Form)', { align: 'center' });
        pdf.moveDown(0.5);
        pdf.font('thai').fontSize(12);
        pdf.text(`เลขที่คำร้อง: ${detail.docNumber || '-'}    วันที่ยื่น: ${formatDateTime(detail.requestDate) || '-'}    สถานะ: ${detail.statusDescription}`);
        pdf.text(`ตัวแทนเรือ: ${detail.agencyName}`);
        pdf.moveDown();
        pdf.font('thai-bold').fontSize(13).text('ข้อมูลเรือ');
        pdf.font('thai').fontSize(12);
        const v = detail.vessel as Row;
        const vesselLines = [
          ['ชื่อเรือ', v.vesselName, 'สัญชาติ (ธง)', v.vesselFlagName],
          ['IMO Number', v.vesselImoNumber, 'Official Number', v.vesselOfficialNumber],
          ['Call Sign', v.vesselCallSign, 'MMSI', v.vesselMMSiNumber],
          ['ประเภทเรือ', v.vesselTypeName, 'เจ้าของเรือ', v.vesselOwner],
          ['GRT', num(v.vesselGrossTonnage).toLocaleString(), 'NRT', num(v.vesselNetTonnage).toLocaleString()],
          ['LOA (m)', num(v.vesselLengthOverall).toLocaleString(), 'Beam (m)', num(v.vesselBreadthExtreme).toLocaleString()],
          ['Draft (m)', num(v.vesselDepth).toLocaleString(), 'DWT', num(v.vesselLoadWeight).toLocaleString()],
        ];
        for (const [a, b, c, d] of vesselLines) pdf.text(`${a}: ${b || '-'}        ${c}: ${d || '-'}`);
        pdf.moveDown();
        pdf.font('thai-bold').fontSize(13).text('ท่าเทียบเรือที่ขอใช้');
        pdf.font('thai').fontSize(12);
        for (const [i, b] of (detail.berths as Row[]).entries()) {
          pdf.text(`${i + 1}. ท่า ${b.berthName} (${b.berthType})  วัตถุประสงค์: ${b.purposeTypeName}${b.purposeName ? ` - ${b.purposeName}` : ''}`);
          pdf.text(`    ETA: ${formatDateTime(b.estimatedArrival) || '-'}    ETD: ${formatDateTime(b.estimatedDeparture) || '-'}    ตำแหน่งเทียบท่า: ${b.cargoTypeName || '-'}${b.jettyName ? `    Jetty: ${b.jettyName}` : ''}`);
          for (const p of b.products as Row[]) {
            pdf.text(`      - ${p.productTypeName || p.productGroupName || 'สินค้า'}: ${num(p.mTonQty).toLocaleString()} M/Ton, ${num(p.rTonQty).toLocaleString()} R/Ton${p.receiver ? `  ผู้รับ: ${p.receiver}` : ''}`);
          }
          if (b.note) pdf.text(`    หมายเหตุ: ${b.note}`);
        }
        pdf.moveDown();
        pdf.font('thai-bold').fontSize(13).text('ข้อมูลใบแจ้งหนี้');
        pdf.font('thai').fontSize(12);
        const inv = detail.invoice as Row;
        pdf.text(`ชื่อลูกค้า: ${inv.name || '-'}    เลขประจำตัวผู้เสียภาษี: ${inv.taxId || '-'}`);
        pdf.text(`ผู้ติดต่อ: ${inv.contactName || '-'}    วิธีชำระเงิน: ${inv.paymentMethodName || '-'}    เงื่อนไข: ${inv.paymentTermName || '-'}`);
        pdf.text(`ที่อยู่: ${[inv.address, inv.subDistrictName, inv.districtName, inv.provinceName, inv.postCode, inv.countryName].filter(Boolean).join(' ')}`);
        pdf.moveDown(2);
        pdf.fontSize(10).fillColor('#666').text(`พิมพ์เมื่อ ${formatDateTime(new Date())}`, { align: 'right' });
      });
    },
  };
}

export type DocumentService = ReturnType<typeof createDocumentService>;
