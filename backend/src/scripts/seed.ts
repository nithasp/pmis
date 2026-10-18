import { config } from '../config';
import { ROLE_PRESETS } from '../constants/permissions';
import pool from '../database';
import { logger } from '../logger';
import { FileRepository } from '../repositories/file.repository';
import { hashPassword, randomToken } from '../services/password.service';
import { pdfToBuffer } from '../services/template.service';
import { storage } from '../storage';
import { Queryable, Row } from '../types/database.types';
import { SeedContext } from '../types/seed.types';
import aisBerths from './seed/ais-berths.json';
import aisShips from './seed/ais-last.json';
import {
  AUTHORITIES,
  BERTHS,
  CARGO_OWNERS,
  CARGO_TYPES,
  CARGO_WHARFAGES,
  COUNTRIES,
  CUSTOMERS,
  LOCATES,
  PAYMENT_METHODS,
  PAYMENT_TERMS,
  PILOTS,
  PORTS,
  PRODUCT_GROUPS,
  PROVINCES,
  PURPOSES,
  PURPOSE_TYPES,
  TERMS_CONTENT,
  THAILAND_COUNTRY_ID,
  THAILAND_FLAG_ID,
  TUGS,
  USE_BERTHS,
  VESSEL_FLAGS,
  VESSEL_TYPES,
} from './seed/masterData';
import { AGENCIES, GOVERNMENT_VESSELS, OFFICERS, SURVEYS, SURVEY_TEXT_ANSWERS, VESSELS } from './seed/people';
import { addDays, addHours, atHour, createRandom } from './seed/random';

const rnd = createRandom(20260401);
const NOW = new Date();
const AGENCY_PASSWORD = 'Agency@12345678';
const OFFICER_PASSWORD = 'Officer@12345678';
const SEED_BY = 'seed';

const TRUNCATE = `
  TRUNCATE TABLE activity_logs, refresh_tokens, verification_tokens, survey_answers, survey_tokens, survey_options, survey_questions,
    survey_sections, surveys, ais_logs, ais_activities, ais_ships, contract_files, contract_rates, contracts, port_dues,
    vessel_import_files, vessel_import_products, vessel_imports, anchors, log_book_products, log_book_pilots, log_book_tugs,
    log_book_details, log_books, document_histories, document_spacial_berths, document_invoices, document_berth_files,
    document_berth_products, document_berths, document_files, document_vessels, documents, vessel_governments, vessel_files, vessels,
    customers, cargo_owners, authorities, payment_terms, payment_methods, tugs, pilots, products, product_types, product_groups,
    cargo_wharfages, cargo_types, purposes, purpose_types, use_berths, locates, jetties, berths, ports, vessel_flags, vessel_types,
    sub_districts, districts, provinces, countries, user_addresses, terms, user_files, users, roles, files
  RESTART IDENTITY CASCADE`;

async function insert(db: Queryable, table: string, data: Row): Promise<number> {
  const cols = Object.keys(data);
  const { rows } = await db.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    cols.map((c) => data[c]),
  );
  return rows[0].id as number;
}

const daysAgo = (days: number, hour = 9): Date => atHour(addDays(NOW, -days), hour, rnd.int(0, 5) * 10);
const money = (n: number): number => Math.round(n * 100) / 100;

const PLACEHOLDER_FILES: { key: string; title: string; type: string }[] = [
  { key: 'ship_particulars', title: "Ship's Particulars", type: 'ship_particulars' },
  { key: 'ship_registry', title: 'Certificate of Registry', type: 'ship_registry' },
  { key: 'internation_tonnage_cert', title: 'International Tonnage Certificate', type: 'internation_tonnage_cert' },
  { key: 'last_10_ports', title: 'Last 10 Ports of Call', type: 'last_10_ports' },
  { key: 'power_of_attorney', title: 'หนังสือมอบอำนาจ (Power of Attorney)', type: 'power_of_attorney' },
  { key: 'legal_entity_cert', title: 'หนังสือรับรองนิติบุคคล', type: 'legal_entity_cert' },
  { key: 'national_id', title: 'สำเนาบัตรประจำตัวประชาชน', type: 'national_id' },
  { key: 'power_of_attorney_nation_id', title: 'สำเนาบัตรประชาชนผู้รับมอบอำนาจ', type: 'power_of_attorney_nation_id' },
  { key: 'contract', title: 'สัญญาอนุญาตให้ใช้ท่าเทียบเรือ', type: 'contract' },
  { key: 'statement', title: 'Statement of Facts / B/L & Timesheet', type: 'statement' },
  { key: 'cargo_manifest', title: 'Cargo Manifest', type: 'cargo_manifest' },
  { key: 'surveyor', title: 'Surveyor Report / Invoice', type: 'surveyor' },
  { key: 'certificate_quantity', title: 'Certificate of Quantity (CoQ)', type: 'certificate_quantity' },
  { key: 'berth_booking', title: 'ใบขอจองท่าเรือ', type: 'berth_booking' },
  { key: 'other', title: 'เอกสารอื่น ๆ', type: 'other' },
  { key: 'berth_plan', title: 'Berthing Plan', type: 'berth_plan' },
  { key: 'government_logbook', title: 'บันทึกการเดินเรือราชการ', type: 'logbook' },
];

async function seedFiles(ctx: SeedContext): Promise<void> {
  const files = new FileRepository();
  for (const item of PLACEHOLDER_FILES) {
    const buffer = await pdfToBuffer((doc) => {
      doc.font('thai-bold').fontSize(20).text(item.title, { align: 'center' });
      doc.moveDown();
      doc.font('thai').fontSize(12).text('เอกสารตัวอย่างสำหรับระบบสาธิต PMIS (sample document for the PMIS demo).');
      doc.moveDown();
      doc.text('สำนักงานท่าเรืออุตสาหกรรมมาบตาพุด / Map Ta Phut Industrial Port Office');
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#666').text(`Generated by npm run seed on ${NOW.toISOString().slice(0, 10)}`);
    });
    const key = `seed/${item.key}.pdf`;
    const uploaded = await storage.upload(key, buffer, 'application/pdf');
    const stored = await files.create({
      fileName: `${item.key}.pdf`,
      storageKey: uploaded.key,
      storageDriver: storage.name,
      url: uploaded.url,
      mimeType: 'application/pdf',
      sizeBytes: buffer.length,
      fileType: item.type,
      uploadedBy: null,
    }, ctx.db);
    ctx.files[item.key] = stored.id;
  }
}

async function seedMaster(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  for (const c of COUNTRIES) await db.query('INSERT INTO countries (id, code, name_th, name_en) VALUES ($1, $2, $3, $4)', [c.id, c.code, c.nameTh, c.nameEn]);

  for (const p of PROVINCES) {
    const provinceId = await insert(db, 'provinces', { name_th: p.nameTh, name_en: p.nameEn, geography_id: p.geographyId });
    ctx.provinces[p.nameTh] = provinceId;
    for (const d of p.districts) {
      const districtId = await insert(db, 'districts', { province_id: provinceId, name_th: d.nameTh, name_en: d.nameEn });
      ctx.districts[`${p.nameTh}/${d.nameTh}`] = districtId;
      for (const s of d.subDistricts) {
        const id = await insert(db, 'sub_districts', { district_id: districtId, name_th: s.nameTh, name_en: s.nameEn, zipcode: s.zipcode });
        ctx.subDistricts[`${p.nameTh}/${d.nameTh}/${s.nameTh}`] = { id, zipcode: s.zipcode };
      }
    }
  }

  for (const name of VESSEL_TYPES) ctx.vesselTypes[name] = await insert(db, 'vessel_types', { name, created_by: SEED_BY, updated_by: SEED_BY });

  for (const f of VESSEL_FLAGS) {
    await db.query('INSERT INTO vessel_flags (id, name, code, path, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $5)', [f.id, f.name, f.code, `https://flagcdn.com/w80/${f.code}.png`, SEED_BY]);
    ctx.flags[f.code] = f.id;
  }
  await db.query("SELECT setval('vessel_flags_id_seq', 1000, false)");

  for (const p of PORTS) {
    const country = COUNTRIES.find((c) => c.code === p.country)!;
    ctx.ports[p.locode] = await insert(db, 'ports', { name: p.name, locode: p.locode, country_id: country.id, created_by: SEED_BY, updated_by: SEED_BY });
  }

  for (const b of BERTHS) {
    const id = await insert(db, 'berths', { name_th: b.nameTh, name_en: b.nameEn, name_alt: b.nameAlt, berth_type: b.berthType, vessel_type_id: ctx.vesselTypes[b.vesselType], port_due_rate: b.rate, created_by: SEED_BY, updated_by: SEED_BY });
    const jetties: number[] = [];
    for (const name of b.jetties) jetties.push(await insert(db, 'jetties', { berth_id: id, name }));
    ctx.berths.push({ id, type: b.berthType, alt: b.nameAlt, rate: b.rate, jetties });
  }

  for (const name of LOCATES) ctx.locates.push(await insert(db, 'locates', { name, created_by: SEED_BY, updated_by: SEED_BY }));
  for (const name of USE_BERTHS) ctx.useBerths.push(await insert(db, 'use_berths', { name, created_by: SEED_BY, updated_by: SEED_BY }));

  for (const t of PURPOSE_TYPES) ctx.purposeTypes[t.code] = await insert(db, 'purpose_types', { code: t.code, name_en: t.nameEn, name_th: t.nameTh });
  for (const p of PURPOSES) {
    const typeId = ctx.purposeTypes[p.type]!;
    const id = await insert(db, 'purposes', { name: p.name, purpose_type_id: typeId, is_government: p.government === true, created_by: SEED_BY, updated_by: SEED_BY });
    ctx.purposes.push({ id, type: p.type, typeId });
  }

  for (const name of CARGO_TYPES) ctx.cargoTypes.push(await insert(db, 'cargo_types', { name, created_by: SEED_BY, updated_by: SEED_BY }));
  for (const w of CARGO_WHARFAGES) ctx.cargoWharfages.push(await insert(db, 'cargo_wharfages', { name: w.name, purpose_type_ids: w.purposeTypes, created_by: SEED_BY, updated_by: SEED_BY }));

  for (const g of PRODUCT_GROUPS) {
    const groupId = await insert(db, 'product_groups', { name: g.name, created_by: SEED_BY, updated_by: SEED_BY });
    for (const t of g.types) {
      const typeId = await insert(db, 'product_types', { name: t.name, product_group_id: groupId, created_by: SEED_BY, updated_by: SEED_BY });
      const products: { id: number; name: string }[] = [];
      for (const name of t.products) products.push({ id: await insert(db, 'products', { name, product_type_id: typeId, product_group_id: groupId, created_by: SEED_BY, updated_by: SEED_BY }), name });
      ctx.productTypes.push({ id: typeId, groupId, name: t.name, products });
    }
  }

  for (const p of PILOTS) ctx.pilots.push(await insert(db, 'pilots', { name: p.name, number: p.number, tel: p.tel }));
  for (const t of TUGS) ctx.tugs.push(await insert(db, 'tugs', { name: t.name, type: t.type }));
  for (const m of PAYMENT_METHODS) ctx.paymentMethods.push({ id: await insert(db, 'payment_methods', { name: m.name, payment_period_day: m.days }), days: m.days });
  for (const t of PAYMENT_TERMS) ctx.paymentTerms.push(await insert(db, 'payment_terms', { name: t.name, days: t.days }));
  for (const name of AUTHORITIES) await insert(db, 'authorities', { name });
  for (const name of CARGO_OWNERS) ctx.cargoOwners.push(await insert(db, 'cargo_owners', { name }));

  const rayong = ctx.subDistricts['ระยอง/เมืองระยอง/มาบตาพุด']!;
  for (const [i, c] of CUSTOMERS.entries()) {
    const id = await insert(db, 'customers', {
      code: `C${String(i + 1).padStart(6, '0')}`,
      name: c.name,
      tax_id: c.taxId,
      contact_name: c.contact,
      payment_method_id: ctx.paymentMethods[i % ctx.paymentMethods.length]!.id,
      payment_term_id: ctx.paymentTerms[i % ctx.paymentTerms.length],
      country_id: THAILAND_COUNTRY_ID,
      province_id: ctx.provinces['ระยอง'],
      district_id: ctx.districts['ระยอง/เมืองระยอง'],
      sub_district_id: rayong.id,
      post_code: rayong.zipcode,
      address: `${rnd.int(1, 300)} ถนนสุขุมวิท นิคมอุตสาหกรรมมาบตาพุด`,
      phone_number: c.phone,
      secondary_phone_number: `08${rnd.digits(8)}`,
    });
    ctx.customers.push(id);
  }

  await insert(db, 'terms', { version: '1.0', content: TERMS_CONTENT });
}

async function seedAccounts(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  for (const preset of ROLE_PRESETS) {
    ctx.roles[preset.roleType] = await insert(db, 'roles', { name: preset.name, role_type: preset.roleType, activated: true, is_system: true, permissions: preset.permissions, created_by: SEED_BY, updated_by: SEED_BY });
  }
  await insert(db, 'roles', { name: 'เจ้าหน้าที่ตรวจเอกสาร (ชั่วคราว)', role_type: 'DocumentReviewer', activated: false, is_system: false, permissions: ['view_dashboard_document', 'view_document'], created_by: SEED_BY, updated_by: SEED_BY });

  const adminHash = await hashPassword(config.adminSeed.password);
  ctx.officers.admin = await insert(db, 'users', {
    email: config.adminSeed.email, password_hash: adminHash, type: 'SuperAdmin', role_id: ctx.roles.SuperAdmin, full_name: 'ผู้ดูแลระบบ PMIS', phone: '038-683-305', mobile_phone: '081-000-0001',
    status: 'Approved', enabled: true, is_accepted_term: true, is_first_login: false, approved_at: daysAgo(400), created_by: SEED_BY, updated_by: SEED_BY,
  });
  ctx.officers.demo = await insert(db, 'users', {
    email: config.demo.email, password_hash: await hashPassword(config.demo.password), type: 'SuperAdmin', role_id: ctx.roles.SuperAdmin, full_name: 'Demo Account (ผู้เยี่ยมชม)', phone: '038-683-300', mobile_phone: '081-000-0000',
    status: 'Approved', enabled: true, is_accepted_term: true, is_first_login: false, is_demo: true, approved_at: daysAgo(400), created_by: SEED_BY, updated_by: SEED_BY,
  });

  const officerHash = await hashPassword(OFFICER_PASSWORD);
  for (const o of OFFICERS) {
    const type = o.roleType === 'Admin' ? 'Admin' : 'User';
    ctx.officers[o.roleType] = await insert(db, 'users', {
      email: o.email, password_hash: officerHash, type, role_id: ctx.roles[o.roleType], full_name: o.fullName, phone: o.phone, mobile_phone: `08${rnd.digits(8)}`,
      status: 'Approved', enabled: true, is_accepted_term: true, is_first_login: false, approved_at: daysAgo(380), created_by: SEED_BY, updated_by: SEED_BY,
    });
  }

  const agencyHash = await hashPassword(AGENCY_PASSWORD);
  for (const [i, a] of AGENCIES.entries()) {
    const sub = ctx.subDistricts[`${a.province}/${a.district}/${a.subDistrict}`]!;
    const createdAt = daysAgo(a.status === 'Approved' ? 330 - i * 20 : rnd.int(2, 9));
    const id = await insert(db, 'users', {
      email: a.email, password_hash: agencyHash, type: 'Agency', role_id: ctx.roles.Agency, person_type: a.personType, tax: a.tax, company: a.company, full_name: a.fullName,
      phone: a.phone, mobile_phone: a.mobile, address: a.address, country_id: THAILAND_COUNTRY_ID, province_id: ctx.provinces[a.province], district_id: ctx.districts[`${a.province}/${a.district}`],
      sub_district_id: sub.id, zip_code: sub.zipcode, status: a.status, enabled: true, is_accepted_term: true, is_first_login: false,
      approved_at: a.status === 'Approved' ? addDays(createdAt, 2) : null, created_at: createdAt, updated_at: createdAt, created_by: a.fullName, updated_by: a.fullName,
    });
    const docs = a.personType === 'corporate' ? ['legal_entity_cert', 'power_of_attorney', 'power_of_attorney_nation_id'] : ['national_id'];
    for (const key of docs) await db.query('INSERT INTO user_files (user_id, file_id, file_type) VALUES ($1, $2, $3)', [id, ctx.files[key], key]);
    await insert(db, 'user_addresses', {
      user_id: id, tax: a.tax, company: a.company || a.fullName, full_name: a.fullName, payment_method_id: ctx.paymentMethods[i % ctx.paymentMethods.length]!.id,
      payment_term_id: ctx.paymentTerms[i % ctx.paymentTerms.length], address: a.address, country_id: THAILAND_COUNTRY_ID, sub_district_id: sub.id,
      district_id: ctx.districts[`${a.province}/${a.district}`], province_id: ctx.provinces[a.province], zip_code: sub.zipcode,
    });
    ctx.agencies.push({ id, company: a.company || a.fullName, fullName: a.fullName, email: a.email });
  }
}

async function seedVessels(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  const approvedAgencies = ctx.agencies.slice(0, 11);
  for (const [i, v] of VESSELS.entries()) {
    const owner = approvedAgencies[i % approvedAgencies.length]!;
    const flagId = ctx.flags[v.flag]!;
    const typeId = ctx.vesselTypes[v.type]!;
    const createdAt = daysAgo(300 - i * 5);
    const id = await insert(db, 'vessels', {
      name: v.name, owner: owner.company, owner_id: owner.id, imo_number: v.imo, mmsi_number: v.mmsi, dsv_number: v.imo ? `DSV-${v.imo.slice(-4)}` : '', official_number: v.official, call_sign: v.callSign,
      load_weight: v.dwt, gross_tonnage: v.grt, net_tonnage: v.nrt, length_overall: v.loa, breadth_extreme: v.beam, depth: v.draft, main_engine: v.engine, band_and_model: v.engine.split(' ')[0],
      vessel_flag_id: flagId, vessel_type_id: typeId, license_expired_date: addDays(NOW, rnd.int(60, 900)).toISOString().slice(0, 10),
      created_at: createdAt, updated_at: createdAt, created_by: owner.fullName, updated_by: owner.fullName,
    });
    for (const key of ['ship_particulars', 'ship_registry', 'internation_tonnage_cert']) await db.query('INSERT INTO vessel_files (vessel_id, file_id, file_type) VALUES ($1, $2, $3)', [id, ctx.files[key], key]);
    ctx.vessels.push({ id, name: v.name, imo: v.imo, official: v.official, callSign: v.callSign, mmsi: v.mmsi, flagId, typeId, ownerId: owner.id, grt: v.grt, loa: v.loa, beam: v.beam, draft: v.draft, owner: owner.company, nrt: v.nrt, dwt: v.dwt, engine: v.engine });
  }
  const { rows: authorities } = await db.query('SELECT id, name FROM authorities');
  for (const g of GOVERNMENT_VESSELS) {
    ctx.governmentVessels.push(
      await insert(db, 'vessel_governments', {
        name: g.name, vessel_flag_id: THAILAND_FLAG_ID, vessel_type_id: ctx.vesselTypes[g.type], official_number: g.official, authority_id: authorities.find((a) => a.name === g.authority)?.id ?? null,
        length_overall: g.loa, breadth: g.beam, depth: g.draft, displacement: g.displacement, file_id: ctx.files.ship_particulars, created_by: SEED_BY, updated_by: SEED_BY,
      }),
    );
  }
}

const STATUS_PLAN: string[] = [
  ...Array<string>(6).fill('Draft'),
  ...Array<string>(8).fill('PendingReview'),
  ...Array<string>(6).fill('PendingApproval'),
  ...Array<string>(4).fill('PendingConfirmation'),
  ...Array<string>(2).fill('PendingConfirmation1'),
  ...Array<string>(5).fill('PendingEdit'),
  ...Array<string>(30).fill('Approved'),
  ...Array<string>(3).fill('Canceled'),
  ...Array<string>(2).fill('AdminCanceled'),
];

async function seedDocuments(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  const thaiYear = NOW.getFullYear() + 543;
  let counter = 0;
  const plan = rnd.sample(STATUS_PLAN, STATUS_PLAN.length);
  for (const [i, status] of plan.entries()) {
    const vesselIndex = i % ctx.vessels.length;
    const vessel = ctx.vessels[vesselIndex]!;
    const agency = ctx.agencies.find((a) => a.id === vessel.ownerId)!;
    const isApproved = status === 'Approved';
    const requestDate = isApproved ? daysAgo(rnd.int(3, 330)) : ['Canceled', 'AdminCanceled'].includes(status) ? daysAgo(rnd.int(10, 200)) : daysAgo(rnd.int(0, 14));
    const eta = addHours(requestDate, rnd.int(26, 200));
    const docNumber = status === 'Draft' ? '' : `PMIS-${thaiYear}-${String(++counter).padStart(5, '0')}`;
    const approvedAt = isApproved ? addHours(requestDate, rnd.int(4, 40)) : null;
    const rejectNotes = status === 'PendingEdit' ? [{ date: addHours(requestDate, 5).toISOString(), message: rnd.pick(['กรุณาแนบ Ship Particulars ฉบับล่าสุด', 'GRT ไม่ตรงกับ International Tonnage Certificate', 'ระบุวัตถุประสงค์การเทียบท่าให้ชัดเจน', 'เอกสารมอบอำนาจหมดอายุ']), by: 'user:reviewer', fromStatus: 'PendingReview' }] : [];
    const documentId = await insert(db, 'documents', {
      doc_number: docNumber, agency_user_id: agency.id, status, vessel_status: 'PendingBerth', request_date: status === 'Draft' ? null : requestDate, submitted_at: status === 'Draft' ? null : requestDate,
      approved_at: approvedAt, reject_notes: JSON.stringify(rejectNotes), is_new_ship: false, created_at: requestDate, updated_at: approvedAt ?? requestDate, created_by: agency.fullName, updated_by: isApproved ? 'user:approver' : agency.fullName,
    });
    await db.query(
      `INSERT INTO document_vessels (document_id, vessel_id, vessel_flag_id, vessel_type_id, vessel_owner, vessel_owner_id, vessel_name, vessel_imo_number, vessel_mmsi_number, vessel_dsv_number,
         vessel_official_number, vessel_call_sign, vessel_nationality, vessel_country, vessel_load_weight, vessel_gross_tonnage, vessel_net_tonnage, vessel_length_overall, vessel_breadth_extreme,
         vessel_depth, vessel_main_engine, vessel_band_and_model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [documentId, vessel.id, vessel.flagId, vessel.typeId, vessel.owner, vessel.ownerId, vessel.name, vessel.imo, vessel.mmsi, vessel.imo ? `DSV-${vessel.imo.slice(-4)}` : '', vessel.official, vessel.callSign,
        VESSEL_FLAGS.find((f) => f.id === vessel.flagId)?.name ?? '', VESSEL_FLAGS.find((f) => f.id === vessel.flagId)?.name ?? '', vessel.dwt, vessel.grt, vessel.nrt, vessel.loa, vessel.beam, vessel.draft, vessel.engine, vessel.engine.split(' ')[0]],
    );
    for (const key of ['ship_particulars', 'ship_registry', 'internation_tonnage_cert', 'last_10_ports', 'power_of_attorney']) {
      await db.query('INSERT INTO document_files (document_id, file_id, file_type) VALUES ($1, $2, $3)', [documentId, ctx.files[key], key]);
    }

    const berthCount = rnd.chance(0.25) ? 2 : 1;
    const berthChoices = rnd.sample(ctx.berths, berthCount);
    const docBerthIds: number[] = [];
    for (const [seq, berth] of berthChoices.entries()) {
      const purpose = rnd.pick(ctx.purposes.filter((p) => ['Loading', 'Discharge', 'DischargeLoading'].includes(p.type)));
      const berthEta = addHours(eta, seq * 30);
      const berthEtd = addHours(berthEta, rnd.int(18, 60));
      const confirmed = isApproved || status === 'PendingConfirmation1' && seq === 0;
      const jettyId = confirmed ? rnd.pick(berth.jetties) : null;
      const docBerthId = await insert(db, 'document_berths', {
        document_id: documentId, berth_id: berth.id, berth_type: berth.type, purpose_type_id: purpose.typeId, purpose_id: purpose.id, cargo_type_id: rnd.pick(ctx.cargoTypes), passengers: 0,
        estimated_arrival: berthEta, estimated_departure: berthEtd, note: rnd.chance(0.3) ? 'ขอใช้เครนท่าเรือ 1 ตัว' : '', sequence: seq + 1, jetty_id: jettyId,
        etb: confirmed ? berthEta : null, etd: confirmed ? berthEtd : null, berth_save_date: confirmed ? approvedAt ?? requestDate : null, cargo_work_time: confirmed ? `${rnd.int(12, 48)} ชม.` : '',
      });
      docBerthIds.push(docBerthId);
      for (let p = 0; p < rnd.int(1, 3); p++) {
        const type = rnd.pick(ctx.productTypes);
        await insert(db, 'document_berth_products', {
          document_berth_id: docBerthId, purpose_id: purpose.id, product_type_id: type.id, product_group_id: type.groupId, cargo_wharfage_id: rnd.pick(ctx.cargoWharfages),
          m_ton_qty: rnd.int(500, 25000), r_ton_qty: rnd.int(400, 20000), package_amount: rnd.int(0, 400), receiver: '', cargo_owner_id: rnd.pick(ctx.cargoOwners), berth_type: berth.type,
        });
      }
      if (['MIT', 'TCT'].includes(berth.type)) await db.query('INSERT INTO document_berth_files (document_berth_id, file_id, file_type) VALUES ($1, $2, $3)', [docBerthId, ctx.files.berth_plan, 'berth_plan']);
    }
    if (status !== 'Draft' || rnd.chance(0.5)) {
      const customerIndex = i % ctx.customers.length;
      const c = CUSTOMERS[customerIndex]!;
      const rayong = ctx.subDistricts['ระยอง/เมืองระยอง/มาบตาพุด']!;
      await db.query(
        `INSERT INTO document_invoices (document_id, customer_id, name, tax_id, contact_name, payment_method_id, payment_term_id, country_id, sub_district_id, district_id, province_id, post_code, address, phone_number, secondary_phone_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [documentId, ctx.customers[customerIndex], c.name, c.taxId, c.contact, ctx.paymentMethods[customerIndex % ctx.paymentMethods.length]!.id, ctx.paymentTerms[customerIndex % ctx.paymentTerms.length], THAILAND_COUNTRY_ID, rayong.id, ctx.districts['ระยอง/เมืองระยอง'], ctx.provinces['ระยอง'], rayong.zipcode, `${rnd.int(1, 300)} ถนนสุขุมวิท นิคมอุตสาหกรรมมาบตาพุด`, c.phone, `08${rnd.digits(8)}`],
      );
    }
    if (status === 'PendingEdit') {
      await db.query('INSERT INTO document_histories (document_id, status, snapshot) VALUES ($1, $2, $3)', [documentId, 'PendingReview', JSON.stringify({ id: documentId, docNumber, status: 'PendingReview', vessel: { vesselName: vessel.name, vesselGrossTonnage: vessel.grt - 20, vesselOwner: vessel.owner, vesselImoNumber: vessel.imo, vesselOfficialNumber: vessel.official, vesselCallSign: vessel.callSign, vesselTypeId: vessel.typeId, vesselLoadWeight: vessel.dwt, vesselNetTonnage: vessel.nrt, vesselLengthOverall: vessel.loa, vesselBreadthExtreme: vessel.beam, vesselDepth: vessel.draft, vesselMainEngine: vessel.engine, vesselBandAndModel: vessel.engine.split(' ')[0], vesselFlagId: vessel.flagId }, estimatedArrival: addHours(eta, -6).toISOString(), estimatedDeparture: addHours(eta, 40).toISOString(), berths: [] })]);
    }
    ctx.documents.push({ id: documentId, vesselIndex, agencyId: agency.id, status, berthIds: berthChoices.map((b) => b.id), docBerthIds, approvedAt, etaFirst: eta, grt: vessel.grt, berthIndex: ctx.berths.indexOf(berthChoices[0]!) });
  }
}

async function seedLogBooks(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  const approved = ctx.documents.filter((d) => d.status === 'Approved' && d.approvedAt);
  for (const doc of approved) {
    const vessel = ctx.vessels[doc.vesselIndex]!;
    const berth = ctx.berths.find((b) => b.id === doc.berthIds[0])!;
    const eta = doc.etaFirst;
    if (eta > NOW) continue;
    const mooring = addHours(eta, rnd.int(-2, 6));
    const departed = addHours(mooring, 30) < NOW && rnd.chance(0.75);
    const departure = departed ? addHours(mooring, rnd.int(16, 70)) : null;
    const jettyId = rnd.pick(berth.jetties);
    const base = {
      document_id: doc.id, document_berth_id: doc.docBerthIds[0], vessel_id: vessel.id, vessel_kind: 'vessel', gross_tonnage: vessel.grt, depth: vessel.draft, voyage: `V${rnd.digits(3)}${rnd.pick(['N', 'S', 'E', 'W'])}`,
      port_id_next: rnd.pick(Object.values(ctx.ports)), port_id_last: rnd.pick(Object.values(ctx.ports)), agency_name: 'Agency', created_by: 'user:vtms', updated_by: 'user:vtms',
    };
    const purpose = rnd.pick(ctx.purposes.filter((p) => ['Loading', 'Discharge', 'DischargeLoading'].includes(p.type)));
    const arrivalId = await insert(db, 'log_books', { ...base, status: 'Arrival', created_at: mooring, updated_at: mooring });
    await insert(db, 'log_book_details', { log_book_id: arrivalId, type_doc: 'Arrival', document_berth_id: doc.docBerthIds[0], berth_id: berth.id, jetty_id: jettyId, purpose_id: purpose.id, cargo_type_id: rnd.pick(ctx.cargoTypes), cargo_wharfage_id: rnd.pick(ctx.cargoWharfages), locate_id: ctx.locates[0], use_berth_id: ctx.useBerths[0], mooring_date: mooring, departure_date: null });
    for (const tugId of rnd.sample(ctx.tugs, rnd.int(1, 2))) await insert(db, 'log_book_tugs', { log_book_id: arrivalId, tug_id: tugId, status: 'Vessel In', status_code: 'Arrival' });
    await insert(db, 'log_book_pilots', { log_book_id: arrivalId, pilot_id: rnd.pick(ctx.pilots), status: 'Vessel In', status_code: 'Arrival' });
    const type = rnd.pick(ctx.productTypes);
    await insert(db, 'log_book_products', { log_book_id: arrivalId, product_type_id: type.id, product_group_id: type.groupId, m_ton_qty: rnd.int(500, 20000), r_ton_qty: rnd.int(400, 18000), status: 'Vessel In' });
    ctx.logBooks.push({ id: arrivalId, documentId: doc.id, vesselId: vessel.id, berthId: berth.id, jettyId, mooring, departure, grt: vessel.grt });
    if (departure) {
      const departureId = await insert(db, 'log_books', { ...base, status: 'Departure', created_at: departure, updated_at: departure });
      await insert(db, 'log_book_details', { log_book_id: departureId, type_doc: 'Departure', document_berth_id: doc.docBerthIds[0], berth_id: berth.id, jetty_id: jettyId, purpose_id: purpose.id, cargo_type_id: rnd.pick(ctx.cargoTypes), cargo_wharfage_id: rnd.pick(ctx.cargoWharfages), locate_id: ctx.locates[0], use_berth_id: ctx.useBerths[0], mooring_date: mooring, departure_date: departure });
      for (const tugId of rnd.sample(ctx.tugs, rnd.int(1, 2))) await insert(db, 'log_book_tugs', { log_book_id: departureId, tug_id: tugId, status: 'Vessel Out', status_code: 'Departure' });
      await insert(db, 'log_book_pilots', { log_book_id: departureId, pilot_id: rnd.pick(ctx.pilots), status: 'Vessel Out', status_code: 'Departure' });
    }
    await db.query('UPDATE documents SET vessel_status = $2, port_at = $3, departured_at = $4 WHERE id = $1', [doc.id, departure ? 'PendingBerth' : 'Berth', mooring, departure]);
    await db.query('UPDATE document_berths SET etb = $2, etd = $3, jetty_id = $4 WHERE id = $1', [doc.docBerthIds[0], mooring, departure ?? addHours(mooring, 36), jettyId]);
  }

  for (const [i, govId] of ctx.governmentVessels.entries()) {
    const mooring = daysAgo(rnd.int(1, 60), rnd.int(6, 18));
    const departure = rnd.chance(0.6) ? addHours(mooring, rnd.int(4, 30)) : null;
    const berth = ctx.berths[i % ctx.berths.length]!;
    const id = await insert(db, 'log_books', {
      status: departure ? 'Departure' : 'Arrival', vessel_government_id: govId, vessel_kind: 'government', gross_tonnage: GOVERNMENT_VESSELS[i]!.displacement, depth: GOVERNMENT_VESSELS[i]!.draft, voyage: `GOV-${rnd.digits(3)}`,
      port_id_next: ctx.ports.THSAT, port_id_last: ctx.ports.THMAT, purpose_type: 'Other', file_id: ctx.files.government_logbook, agency_name: 'VTMS', created_at: mooring, updated_at: departure ?? mooring, created_by: 'user:vtms', updated_by: 'user:vtms',
    });
    await insert(db, 'log_book_details', { log_book_id: id, type_doc: departure ? 'Departure' : 'Arrival', berth_id: berth.id, jetty_id: rnd.pick(berth.jetties), purpose_id: ctx.purposes.find((p) => p.type === 'Other')!.id, cargo_type_id: rnd.pick(ctx.cargoTypes), locate_id: rnd.pick(ctx.locates), use_berth_id: rnd.pick(ctx.useBerths), mooring_date: mooring, departure_date: departure });
  }

  const anchorDocs = rnd.sample(ctx.documents.filter((d) => ['Approved', 'PendingConfirmation', 'PendingApproval'].includes(d.status)), 10);
  for (const doc of anchorDocs) {
    const vessel = ctx.vessels[doc.vesselIndex]!;
    const anchorDate = addHours(doc.etaFirst, -rnd.int(6, 48));
    const aweigh = rnd.chance(0.7) ? addHours(anchorDate, rnd.int(3, 40)) : null;
    await insert(db, 'anchors', {
      document_id: doc.id, document_berth_id: doc.docBerthIds[0], vessel_id: vessel.id, berth_id: doc.berthIds[0], gross_tonnage: vessel.grt, depth: vessel.draft, voyage: `V${rnd.digits(3)}N`,
      port_id_next: ctx.ports.THMAT, port_id_last: rnd.pick(Object.values(ctx.ports)), pilot_date: addHours(anchorDate, -1), anchor_date: anchorDate, aweigh_date: aweigh,
      latitude: `12.${rnd.int(60, 68)}${rnd.digits(3)}`, longitude: `101.${rnd.int(12, 19)}${rnd.digits(3)}`, remark: rnd.pick(['รอท่าว่าง', 'รอน้ำขึ้น', 'รอเจ้าหน้าที่นำร่อง', '']), status: aweigh ? 'Aweigh' : 'Anchor',
      created_at: anchorDate, updated_at: aweigh ?? anchorDate, created_by: 'user:vtms', updated_by: 'user:vtms',
    });
  }
}

const IMPORT_PLAN = [...Array<string>(3).fill('PendingSend'), ...Array<string>(3).fill('PendingEdit'), ...Array<string>(6).fill('Send'), ...Array<string>(4).fill('PendingCheck'), ...Array<string>(3).fill('RequestEdit'), ...Array<string>(5).fill('PendingApproval'), ...Array<string>(8).fill('Approved')];

async function seedVesselImports(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  const withLogs = ctx.logBooks.filter((l) => l.departure);
  for (const [i, status] of rnd.sample(IMPORT_PLAN, IMPORT_PLAN.length).entries()) {
    const linkable = ['PendingCheck', 'PendingApproval', 'Approved'].includes(status) && withLogs.length > 0;
    const log = linkable ? withLogs[i % withLogs.length]! : null;
    const vessel = log ? ctx.vessels.find((v) => v.id === log.vesselId)! : ctx.vessels[(i * 7) % ctx.vessels.length]!;
    const berth = log ? ctx.berths.find((b) => b.id === log.berthId)! : rnd.pick(ctx.berths);
    const mooring = log ? addHours(log.mooring, rnd.int(-1, 1)) : daysAgo(rnd.int(2, 120), rnd.int(6, 18));
    const unmooring = log?.departure ? addHours(log.departure, rnd.int(-1, 1)) : addHours(mooring, rnd.int(14, 60));
    const createdAt = addHours(unmooring, rnd.int(2, 48));
    const notes = status === 'PendingEdit' ? [{ date: createdAt.toISOString(), message: 'กรุณาแนบ Statement of Facts ให้ครบถ้วน', by: 'officer' }] : status === 'RequestEdit' ? [{ date: createdAt.toISOString(), message: 'ขอแก้ไขปริมาณสินค้า M/Ton', by: 'agency' }] : [];
    const grt = log ? vessel.grt : vessel.grt + rnd.pick([0, 0, 0, 12, -8]);
    const id = await insert(db, 'vessel_imports', {
      vessel_id: vessel.id, status, gross_tonnage: grt, gross_tonnage_approved: status === 'Approved' ? vessel.grt : status === 'PendingApproval' ? grt : null, mooring_date: mooring, unmooring_date: unmooring, berth_id: berth.id,
      jetty_id: log?.jettyId ?? rnd.pick(berth.jetties), note: notes[0]?.message ?? '', notes: JSON.stringify(notes), log_book_id: log?.id ?? null, document_id: log?.documentId ?? null,
      statement_file_id: ctx.files.statement, ship_file_id: ctx.files.ship_particulars, cargo_manifest_file_id: rnd.chance(0.7) ? ctx.files.cargo_manifest : null, surveyor_file_id: rnd.chance(0.5) ? ctx.files.surveyor : null,
      certificate_quantity_file_id: rnd.chance(0.4) ? ctx.files.certificate_quantity : null, berth_booking_request_file_id: ctx.files.berth_booking, other_file_id: rnd.chance(0.3) ? ctx.files.other : null,
      sent_at: status === 'PendingSend' ? null : createdAt, approved_at: status === 'Approved' ? addHours(createdAt, rnd.int(6, 72)) : null, created_at: createdAt, updated_at: createdAt,
      created_by: `user:${vessel.ownerId}`, created_by_id: vessel.ownerId, updated_by: `user:${vessel.ownerId}`,
    });
    const regular = rnd.pick(ctx.purposes.filter((p) => ['Loading', 'Discharge', 'DischargeLoading'].includes(p.type)));
    for (let p = 0; p < rnd.int(1, 3); p++) {
      const type = rnd.pick(ctx.productTypes);
      const product = rnd.pick(type.products);
      await insert(db, 'vessel_import_products', {
        vessel_import_id: id, purpose_type_id: regular.typeId, cargo_type_id: rnd.pick(ctx.cargoTypes), cargo_wharfage_id: rnd.pick(ctx.cargoWharfages), product_type_id: type.id, product_group_id: type.groupId, product_id: product.id,
        product_name: product.name, cargo_owner_id: rnd.pick(ctx.cargoOwners), cargo_owner_name: CARGO_OWNERS[rnd.int(0, CARGO_OWNERS.length - 1)], m_ton_qty: rnd.int(500, 25000), r_ton_qty: rnd.int(400, 20000), bl_product: `BL-${rnd.digits(6)}`, country_id: rnd.pick(COUNTRIES).id, passengers: 0, detail: '',
      });
    }
    if (rnd.chance(0.3)) await insert(db, 'vessel_import_products', { vessel_import_id: id, purpose_type_id: ctx.purposeTypes.SparePart, product_name: 'Engine spare parts', m_ton_qty: rnd.int(1, 20), r_ton_qty: 0, passengers: 0, detail: 'อะไหล่เครื่องยนต์หลัก' });
    if (rnd.chance(0.15)) await insert(db, 'vessel_import_products', { vessel_import_id: id, purpose_type_id: ctx.purposeTypes.Passenger, product_name: '', m_ton_qty: 0, r_ton_qty: 0, passengers: rnd.int(2, 40), detail: 'ลูกเรือเปลี่ยนกะ' });
    if (rnd.chance(0.2)) await insert(db, 'vessel_import_products', { vessel_import_id: id, purpose_type_id: ctx.purposeTypes.Other, product_name: 'Bunkering', m_ton_qty: rnd.int(100, 800), r_ton_qty: 0, passengers: 0, detail: 'รับน้ำมันเชื้อเพลิง' });
    await db.query('INSERT INTO vessel_import_files (vessel_import_id, file_id, name) VALUES ($1, $2, $3)', [id, ctx.files.other, 'timesheet.pdf']);
  }
}

async function seedPortDues(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  const thaiYear = NOW.getFullYear() + 543;
  const candidates = ctx.logBooks.filter((l) => l.departure);
  let counter = 0;
  for (const [i, log] of candidates.entries()) {
    if (i % 4 === 3) continue;
    const doc = ctx.documents.find((d) => d.id === log.documentId)!;
    const berth = ctx.berths.find((b) => b.id === log.berthId)!;
    const { rows: inv } = await db.query(
      `SELECT i.*, pm.name AS payment_method_name, pm.payment_period_day, pt.name AS payment_term_name, cu.code AS customer_code FROM document_invoices i
       LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id LEFT JOIN payment_terms pt ON pt.id = i.payment_term_id LEFT JOIN customers cu ON cu.id = i.customer_id WHERE i.document_id = $1`,
      [doc.id],
    );
    const invoice = inv[0] ?? {};
    const rate = berth.rate;
    const fee = money(log.grt * rate);
    const vatTotal = money(fee * 0.07);
    const total = money(fee + vatTotal);
    const period = Number(invoice.payment_period_day ?? 30);
    const createdAt = addHours(log.departure!, rnd.int(2, 30));
    const canceled = i % 7 === 6;
    const paid = !canceled && rnd.chance(0.6);
    await insert(db, 'port_dues', {
      document_id: doc.id, port_due_number: `INV-${thaiYear}-${String(++counter).padStart(5, '0')}`, doc_type: 'Invoice', status: canceled ? 'canceled' : 'created', gross_tonnage: log.grt, berth_id: berth.id, berth_at: log.mooring, departured_at: log.departure,
      invoice: JSON.stringify({
        customerId: invoice.customer_id ?? 0, customerCode: invoice.customer_code ?? '', customerReference: invoice.customer_code ?? '', name: invoice.name ?? '', taxId: invoice.tax_id ?? '', contactName: invoice.contact_name ?? '',
        paymentMethodId: invoice.payment_method_id ?? 0, paymentMethodName: invoice.payment_method_name ?? '', paymentTermId: invoice.payment_term_id ?? 0, paymentTermName: invoice.payment_term_name ?? '',
        countryId: THAILAND_COUNTRY_ID, countryName: 'ไทย', provinceId: invoice.province_id ?? 0, provinceName: 'ระยอง', districtId: invoice.district_id ?? 0, districtName: 'เมืองระยอง', subDistrictId: invoice.sub_district_id ?? 0, subDistrictName: 'มาบตาพุด',
        postCode: invoice.post_code ?? '', address: invoice.address ?? '', phoneNumber: invoice.phone_number ?? '', secondaryPhoneNumber: invoice.secondary_phone_number ?? '',
        rate, fee, vat: 7, vatTotal, total, paymentPeriod: period, dueDate: addDays(log.mooring, Math.max(period - 1, 0)).toISOString(),
      }),
      rate, fee, vat: 7, vat_total: vatTotal, total, payment_period: period, due_date: addDays(log.mooring, Math.max(period - 1, 0)), paid_date: paid ? addDays(createdAt, rnd.int(3, period)) : null,
      canceled_at: canceled ? addHours(createdAt, 30) : null, cancel_note: canceled ? 'ออกใบแจ้งหนี้ซ้ำ ยกเลิกและออกใหม่' : '', created_at: createdAt, created_by: 'user:stat',
    });
  }
}

async function seedContracts(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  for (const [i, berth] of ctx.berths.slice(0, 8).entries()) {
    const start = new Date(NOW.getFullYear() - 2 + (i % 3), 0, 1);
    const end = new Date(start.getFullYear() + 5, 11, 31);
    const initial = berth.rate;
    const increase = rnd.pick([3, 5, 7.5]);
    const cycle = rnd.pick([1, 2]);
    const contractId = await insert(db, 'contracts', {
      contract_no: `MTP-${start.getFullYear() + 543}-${String(i + 1).padStart(3, '0')}`, berth_id: berth.id, start_date: start, end_date: end, initial_rate: initial, annual_increase_rate: increase, rate_change_cycle: cycle,
      rate_change_start_year: String(start.getFullYear() + 543 + cycle), terminated_date: i === 7 ? new Date(NOW.getFullYear(), 5, 30) : null, created_by: 'user:stat', updated_by: 'user:stat',
    });
    let rate = initial;
    for (let y = 0; y < 6; y++) {
      const s = new Date(start.getFullYear() + y, 0, 1);
      const e = new Date(start.getFullYear() + y, 11, 31);
      if (y > 0 && y % cycle === 0) rate = money(rate * (1 + increase / 100));
      await insert(db, 'contract_rates', { contract_id: contractId, start_date: s, end_date: e, rate });
    }
    await db.query('INSERT INTO contract_files (contract_id, file_id) VALUES ($1, $2)', [contractId, ctx.files.contract]);
  }
}

async function seedSurveys(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  for (const [si, survey] of SURVEYS.entries()) {
    const publishDate = daysAgo(40 - si * 12);
    const surveyId = await insert(db, 'surveys', { name: survey.name, description: survey.description, publish_schedule: true, publish_date: publishDate, end_date: addDays(publishDate, 60), created_by: 'user:admin' });
    const questionIds: { id: number; type: string; options: number[]; min: number; max: number }[] = [];
    for (const [no, section] of survey.sections.entries()) {
      const sectionId = await insert(db, 'survey_sections', {
        survey_id: surveyId, type_section: section.typeSection, title: section.title ?? '', description: section.description ?? '', is_required: section.typeSection !== 'heading', no: no + 1,
        satisfaction_min: section.satisfactionMin ?? null, satisfaction_des_min: section.satisfactionDesMin ?? null, satisfaction_max: section.satisfactionMax ?? null, satisfaction_des_max: section.satisfactionDesMax ?? null,
      });
      for (const [qno, q] of (section.questions ?? []).entries()) {
        const typeQuestion = section.typeSection === 'evaluation' ? 'evaluation' : (q as { typeQuestion?: string }).typeQuestion ?? 'short_answer';
        const questionId = await insert(db, 'survey_questions', { section_id: sectionId, question: q.question, type_question: typeQuestion, no: qno + 1 });
        const options: number[] = [];
        for (const [ono, name] of ((q as { options?: string[] }).options ?? []).entries()) options.push(await insert(db, 'survey_options', { question_id: questionId, option_name: name, no: ono + 1 }));
        questionIds.push({ id: questionId, type: typeQuestion, options, min: section.satisfactionMin ?? 1, max: section.satisfactionMax ?? 5 });
      }
    }
    const recipients = rnd.sample(ctx.agencies, 6);
    for (const [ri, agency] of recipients.entries()) {
      const answered = ri < 4;
      const tokenId = await insert(db, 'survey_tokens', { survey_id: surveyId, email: agency.email, token: randomToken(24), sent_at: addDays(publishDate, 1), answered_at: answered ? addDays(publishDate, rnd.int(2, 20)) : null });
      if (!answered) continue;
      for (const q of questionIds) {
        await insert(db, 'survey_answers', {
          token_id: tokenId, survey_id: surveyId, question_id: q.id,
          ans_text: q.type === 'short_answer' ? agency.company : q.type === 'paragraph' ? rnd.pick(SURVEY_TEXT_ANSWERS) : null,
          ans_option_id: q.type === 'multiple_choice' ? rnd.pick(q.options) : null,
          ans_point: q.type === 'evaluation' ? rnd.int(Math.max(q.min, q.max - 2), q.max) : null,
        });
      }
    }
  }
}

async function seedAis(ctx: SeedContext): Promise<void> {
  const { db } = ctx;
  const ships = aisShips as Row[];
  const berthBoxes = (aisBerths as { berthbox: { name: string; p1: { lat: number; lon: number } }[] }).berthbox;
  const shipIds: { id: number; vesselId: number | null; mmsi: string; callSign: string; lat: string; lon: string }[] = [];
  for (const s of ships) {
    const vessel = ctx.vessels.find((v) => (v.imo && v.imo === String(s.IMO)) || v.name.toUpperCase() === String(s.Name).toUpperCase() || (v.mmsi && v.mmsi === String(s.MMSI)));
    const id = await insert(db, 'ais_ships', {
      mmsi: String(s.MMSI ?? ''), call_sign: String(s.CallSgn ?? ''), imo: String(s.IMO ?? ''), name: String(s.Name ?? ''), sog: String(s.SOG ?? '0'), heading: String(s.Heading ?? '0'), lat: String(s.Lat ?? ''), lon: String(s.Lon ?? ''),
      status: String(s.Status ?? '0'), destination: String(s.Destination ?? ''), eta: String(s.ETA ?? ''), vessel_type: String(s.VesselType ?? '0'), length: String(s.Length ?? ''), width: String(s.Width ?? ''), draught: String(s.Draught ?? ''),
      update_date: String(s.UpdateDate ?? ''), alias: String(s.Alias ?? ''), cog: String(s.COG ?? ''), vessel_id: vessel?.id ?? null,
    });
    shipIds.push({ id, vesselId: vessel?.id ?? null, mmsi: String(s.MMSI ?? ''), callSign: String(s.CallSgn ?? ''), lat: String(s.Lat ?? ''), lon: String(s.Lon ?? '') });
  }
  for (const [i, ship] of shipIds.entries()) {
    const s = ships[i]!;
    if (!ship.vesselId) {
      ship.vesselId = await insert(db, 'vessels', {
        name: String(s.Name ?? `MMSI ${ship.mmsi}`), owner: 'AIS feed', imo_number: String(s.IMO ?? ''), mmsi_number: ship.mmsi, official_number: '', call_sign: ship.callSign, load_weight: 0, gross_tonnage: 0, net_tonnage: 0,
        length_overall: Number(s.Length ?? 0) || 0, breadth_extreme: Number(s.Width ?? 0) || 0, depth: Number(s.Draught ?? 0) || 0, vessel_flag_id: null, vessel_type_id: null, created_by: 'ais', updated_by: 'ais',
      });
      await db.query('UPDATE ais_ships SET vessel_id = $2 WHERE id = $1', [ship.id, ship.vesselId]);
    }
    for (let k = 0; k < 2; k++) {
      const box = rnd.pick(berthBoxes);
      const at = daysAgo(rnd.int(0, 20), rnd.int(0, 23));
      await insert(db, 'ais_activities', { activity_date: at, vessel_id: ship.vesselId, ais_ship_id: ship.id, mmsi: ship.mmsi, location: rnd.chance(0.6) ? box.name : 'Anchorage A', latitude: k === 0 ? ship.lat : String(box.p1.lat), longitude: k === 0 ? ship.lon : String(box.p1.lon) });
    }
    if (i % 2 === 0) {
      const berth = ctx.berths[i % ctx.berths.length]!;
      const arrival = daysAgo(rnd.int(1, 45), rnd.int(0, 23));
      await insert(db, 'ais_logs', { vessel_id: ship.vesselId, ais_ship_id: ship.id, mmsi: ship.mmsi, call_sign: ship.callSign, berth_id: berth.id, arrival_date_time: arrival, departure_date_time: rnd.chance(0.7) ? addHours(arrival, rnd.int(8, 60)) : null, latitude: ship.lat, longitude: ship.lon });
    }
  }
}

async function main(): Promise<void> {
  const started = Date.now();
  const client = await pool.connect();
  const ctx: SeedContext = {
    db: client, roles: {}, provinces: {}, districts: {}, subDistricts: {}, vesselTypes: {}, flags: {}, ports: {}, berths: [], purposeTypes: {}, purposes: [], cargoTypes: [], cargoWharfages: [], productTypes: [], pilots: [], tugs: [],
    paymentMethods: [], paymentTerms: [], cargoOwners: [], customers: [], locates: [], useBerths: [], files: {}, officers: {}, agencies: [], vessels: [], governmentVessels: [], documents: [], logBooks: [],
  };
  try {
    await client.query('BEGIN');
    await client.query(TRUNCATE);
    await seedFiles(ctx);
    await seedMaster(ctx);
    await seedAccounts(ctx);
    await seedVessels(ctx);
    await seedDocuments(ctx);
    await seedLogBooks(ctx);
    await seedVesselImports(ctx);
    await seedPortDues(ctx);
    await seedContracts(ctx);
    await seedSurveys(ctx);
    await seedAis(ctx);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  const counts: Record<string, number> = {};
  for (const table of ['users', 'vessels', 'documents', 'log_books', 'anchors', 'vessel_imports', 'port_dues', 'contracts', 'surveys', 'ais_ships', 'files']) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    counts[table] = rows[0].n as number;
  }
  logger.info({ counts, seconds: Math.round((Date.now() - started) / 100) / 10 }, 'seed complete');
  logger.info(
    { admin: `${config.adminSeed.email} / ${config.adminSeed.password}`, demo: `${config.demo.email} / ${config.demo.password}`, officers: `reviewer|approver|mit|tct|spacial|stat|statapprove|vtms|officer@pmis.local / ${OFFICER_PASSWORD}`, agency: `agency@pmis.local (and 12 more) / ${AGENCY_PASSWORD}` },
    'seeded accounts',
  );
  await pool.end();
}

main().catch((err: unknown) => {
  logger.error({ err }, 'seed failed');
  process.exit(1);
});
