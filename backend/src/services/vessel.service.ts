import { withTransaction } from '../database';
import { VesselRepository } from '../repositories/vessel.repository';
import { AuthUser, UploadFileRef } from '../types/auth.types';
import { Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { toDate } from '../utils/dates';
import { forbidden, notFound } from '../utils/errors';
import { idOrNull, iso, num, str } from '../utils/rows';
import { FileService } from './file.service';

export function toVessel(row: Row, uploadFiles: UploadFileRef[] = []): Row {
  return {
    id: row.id,
    vesselFlagId: row.vessel_flag_id ?? 0,
    vesselFlagName: str(row.vessel_flag_name),
    vesselFlagImage: str(row.vessel_flag_path),
    vesselTypeId: row.vessel_type_id ?? 0,
    vesselTypeName: str(row.vessel_type_name),
    owner: str(row.owner),
    ownerId: row.owner_id ?? null,
    name: str(row.name),
    imoNumber: str(row.imo_number),
    mmsiNumber: str(row.mmsi_number),
    dsvNumber: str(row.dsv_number),
    officialNumber: str(row.official_number),
    callSign: str(row.call_sign),
    loadWeight: num(row.load_weight),
    grossTonnage: num(row.gross_tonnage),
    netTonnage: num(row.net_tonnage),
    lengthOverall: num(row.length_overall),
    breadthExtreme: num(row.breadth_extreme),
    depth: num(row.depth),
    mainEngine: str(row.main_engine),
    bandAndModel: str(row.band_and_model),
    licenseExpiredDate: row.license_expired_date ?? null,
    vesselLicenseExpiredDate: row.license_expired_date ?? null,
    createdName: str(row.created_by),
    updatedName: str(row.updated_by),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    uploadFiles,
  };
}

// The snake_case form the VTMS pages read (log book / anchor "vessel" object)
export function toVesselSnake(row: Row | null | undefined): Row {
  if (!row) return { id: 0, owner: '', vessel_flag: { id: 0, name: '', image_path: '' }, name: '', vessel_type: '', imo_number: '', mmsi_number: '', official_number: '', call_sign: '', license_expired_date: null, load_weight: 0, gross_tonnage: 0, net_tonnage: 0, length_overall: 0, breadth_extreme: 0, depth: 0, main_engine: '', band_and_model: '' };
  return {
    id: row.id,
    owner: str(row.owner),
    vessel_flag: { id: row.vessel_flag_id ?? 0, name: str(row.vessel_flag_name), image_path: str(row.vessel_flag_path) },
    name: str(row.name),
    vessel_type: str(row.vessel_type_name),
    vessel_type_id: row.vessel_type_id ?? 0,
    imo_number: str(row.imo_number),
    mmsi_number: str(row.mmsi_number),
    official_number: str(row.official_number),
    call_sign: str(row.call_sign),
    license_expired_date: row.license_expired_date ?? null,
    load_weight: num(row.load_weight),
    gross_tonnage: num(row.gross_tonnage),
    net_tonnage: num(row.net_tonnage),
    length_overall: num(row.length_overall),
    breadth_extreme: num(row.breadth_extreme),
    depth: num(row.depth),
    main_engine: str(row.main_engine),
    band_and_model: str(row.band_and_model),
    authority_name: str(row.authority_name),
    displacement: num(row.displacement),
  };
}

const vesselColumns = (input: Row): Row => ({
  name: str(input.name).trim(),
  owner: str(input.owner).trim(),
  imo_number: str(input.imoNumber).trim(),
  mmsi_number: str(input.mmsiNumber).trim(),
  dsv_number: str(input.dsvNumber).trim(),
  official_number: str(input.officialNumber).trim(),
  call_sign: str(input.callSign).trim(),
  load_weight: num(input.loadWeight),
  gross_tonnage: num(input.grossTonnage),
  net_tonnage: num(input.netTonnage),
  length_overall: num(input.lengthOverall),
  breadth_extreme: num(input.breadthExtreme),
  depth: num(input.depth),
  main_engine: str(input.mainEngine).trim(),
  band_and_model: str(input.bandAndModel).trim(),
  vessel_flag_id: idOrNull(input.vesselFlagId),
  vessel_type_id: idOrNull(input.vesselTypeId),
  license_expired_date: toDate(input.vesselLicenseExpiredDate ?? input.licenseExpiredDate),
});

export function toGovernment(row: Row, uploadFiles: UploadFileRef[] = []): Row {
  return {
    id: row.id,
    name: str(row.name),
    vesselFlagId: row.vessel_flag_id ?? 0,
    vesselFlagName: str(row.vessel_flag_name),
    vesselFlagImage: str(row.vessel_flag_path),
    vesselTypeId: row.vessel_type_id ?? 1,
    vesselTypeName: str(row.vessel_type_name),
    officialNumber: str(row.official_number),
    authorityId: row.authority_id ?? 0,
    authority_id: row.authority_id ?? 0,
    authorityName: str(row.authority_name),
    authority_name: str(row.authority_name),
    loa: num(row.length_overall),
    lengthOverall: num(row.length_overall),
    breadth: num(row.breadth),
    breadthExtreme: num(row.breadth),
    draft: num(row.depth),
    depth: num(row.depth),
    displaceent: num(row.displacement),
    displacement: num(row.displacement),
    fileId: row.file_id ?? 0,
    createdName: str(row.created_by),
    updatedName: str(row.updated_by),
    uploadFiles,
  };
}

export function createVesselService(vessels: VesselRepository, files: FileService) {
  const isAgency = (user: AuthUser): boolean => user.type === 'Agency';

  return {
    toVessel,

    async list(user: AuthUser, filter: { flag?: unknown; type?: unknown; owner?: string; showAll?: unknown }, query: ListQuery): Promise<PagedResult<Row>> {
      const showAll = filter.showAll === true || filter.showAll === 'true';
      const page = await vessels.list(
        { flag: idOrNull(filter.flag), type: idOrNull(filter.type), owner: filter.owner, ownerId: isAgency(user) && !showAll ? user.userId : null },
        query,
      );
      const refs = await files.refsMany('vessel', page.data.map((r) => r.id as number));
      return { ...page, data: page.data.map((r) => toVessel(r, refs.get(r.id as number) ?? [])) };
    },

    async detail(id: number): Promise<Row> {
      const row = await vessels.findById(id);
      if (!row) throw notFound('ข้อมูลเรือ', 'vessel not found');
      return toVessel(row, await files.refs('vessel', id));
    },

    async raw(id: number): Promise<Row | null> {
      return vessels.findById(id);
    },

    async create(user: AuthUser, input: Row, by: string): Promise<Row> {
      const ownerId = isAgency(user) ? user.userId : idOrNull(input.ownerId);
      const created = await withTransaction(async (tx) => {
        const row = await vessels.create({ ...vesselColumns(input), owner_id: ownerId, created_by: by, updated_by: by }, tx);
        await files.syncLinks('vessel', row.id as number, input.uploadFiles, tx);
        return row;
      });
      return this.detail(created.id as number);
    },

    async update(user: AuthUser, id: number, input: Row, by: string): Promise<Row> {
      const existing = await vessels.findById(id);
      if (!existing) throw notFound('ข้อมูลเรือ', 'vessel not found');
      if (isAgency(user) && existing.owner_id !== user.userId) throw forbidden();
      await withTransaction(async (tx) => {
        await vessels.update(id, { ...vesselColumns(input), updated_by: by }, tx);
        if (Array.isArray(input.uploadFiles)) await files.syncLinks('vessel', id, input.uploadFiles, tx);
      });
      return this.detail(id);
    },

    async history(id: number, filter: { begin?: unknown; end?: unknown }, query: ListQuery): Promise<PagedResult<Row>> {
      const page = await vessels.history(id, filter, query);
      return {
        ...page,
        data: page.data.map((r) => ({
          ...toVessel({
            ...r,
            id: r.vessel_id,
            owner: r.vessel_owner,
            name: r.vessel_name,
            imo_number: r.vessel_imo_number,
            mmsi_number: r.vessel_mmsi_number,
            dsv_number: r.vessel_dsv_number,
            official_number: r.vessel_official_number,
            call_sign: r.vessel_call_sign,
            load_weight: r.vessel_load_weight,
            gross_tonnage: r.vessel_gross_tonnage,
            net_tonnage: r.vessel_net_tonnage,
            length_overall: r.vessel_length_overall,
            breadth_extreme: r.vessel_breadth_extreme,
            depth: r.vessel_depth,
            main_engine: r.vessel_main_engine,
            band_and_model: r.vessel_band_and_model,
            license_expired_date: r.vessel_license_expired_date,
            created_by: r.created_name,
            updated_by: r.updated_name,
          }),
          documentId: r.document_id,
          docNumber: str(r.doc_number),
          documentStatus: str(r.document_status),
          approvedDate: iso(r.approved_at),
          requestDate: iso(r.request_date),
        })),
      };
    },

    async listGovernment(query: ListQuery): Promise<PagedResult<Row>> {
      const page = await vessels.listGovernment(query);
      const refs = await Promise.all(page.data.map(async (r) => (r.file_id ? await files.find(r.file_id as number) : null)));
      return {
        ...page,
        data: await Promise.all(page.data.map(async (r, i) => toGovernment(r, refs[i] ? [await files.toRef(refs[i]!)] : []))),
      };
    },

    async governmentDetail(id: number): Promise<Row> {
      const row = await vessels.findGovernment(id);
      if (!row) throw notFound('ข้อมูลเรือราชการ', 'government vessel not found');
      const file = row.file_id ? await files.find(row.file_id as number) : null;
      return toGovernment(row, file ? [await files.toRef(file)] : []);
    },

    async rawGovernment(id: number): Promise<Row | null> {
      return vessels.findGovernment(id);
    },

    async saveGovernment(id: number | null, input: Row, by: string): Promise<Row> {
      const data: Row = {
        name: str(input.name).trim(),
        vessel_flag_id: idOrNull(input.vesselFlagId) ?? 218,
        vessel_type_id: idOrNull(input.vesselTypeId) ?? 1,
        official_number: str(input.officialNumber).trim(),
        authority_id: idOrNull(input.authority_id ?? input.authorityId),
        length_overall: num(input.lengthOverall ?? input.loa),
        breadth: num(input.breadthExtreme ?? input.breadth),
        depth: num(input.depth ?? input.draft),
        displacement: num(input.displacement ?? input.displaceent),
        updated_by: by,
      };
      const fileId = await files.resolveId({ id: input.fileId, filePath: input.filePath });
      if (fileId) data.file_id = fileId;
      else if (Array.isArray(input.uploadFiles) && input.uploadFiles[0]) data.file_id = await files.resolveId(input.uploadFiles[0]);
      if (id === null) {
        const row = await vessels.createGovernment({ ...data, created_by: by });
        return this.governmentDetail(row.id as number);
      }
      if (!(await vessels.updateGovernment(id, data))) throw notFound('ข้อมูลเรือราชการ', 'government vessel not found');
      return this.governmentDetail(id);
    },

    async removeGovernment(id: number): Promise<void> {
      if (!(await vessels.softDeleteGovernment(id))) throw notFound('ข้อมูลเรือราชการ', 'government vessel not found');
    },
  };
}

export type VesselService = ReturnType<typeof createVesselService>;
