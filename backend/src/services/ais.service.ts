import pool from '../database';
import { Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { pagedResult } from '../utils/paging';
import { idOrNull, iso, str } from '../utils/rows';
import { SqlBuilder } from '../utils/sql';
import { toVessel } from './vessel.service';

const VESSEL_JOIN = ' LEFT JOIN vessels v ON v.id = x.vessel_id LEFT JOIN vessel_flags f ON f.id = v.vessel_flag_id LEFT JOIN vessel_types t ON t.id = v.vessel_type_id';
const VESSEL_COLUMNS = 'v.*, f.name AS vessel_flag_name, f.path AS vessel_flag_path, t.name AS vessel_type_name';

// The AIS feed keeps the field names of the upstream provider (MMSI, Lat, Lon, COG...), which is what the map expects
const shipRow = (s: Row): Row => ({
  MMSI: str(s.mmsi),
  CallSgn: str(s.call_sign),
  IMO: str(s.imo),
  Name: str(s.name),
  SOG: str(s.sog, '0'),
  Heading: str(s.heading, '0'),
  Lat: str(s.lat),
  Lon: str(s.lon),
  Status: str(s.status, '0'),
  Destination: str(s.destination),
  ETA: str(s.eta),
  VesselType: str(s.vessel_type, '0'),
  Length: str(s.length),
  Width: str(s.width),
  Draught: str(s.draught),
  UpdateDate: str(s.update_date),
  Alias: str(s.alias),
  COG: str(s.cog),
  vesselId: s.vessel_id ?? null,
});

const vesselOf = (r: Row): Row | null =>
  r.vessel_id
    ? toVessel({ ...r, id: r.vessel_id, name: r.vessel_name_master ?? r.name, created_by: r.vessel_created_by, updated_by: r.vessel_updated_by })
    : null;

export function createAisService() {
  return {
    async activity(query: ListQuery): Promise<PagedResult<Row>> {
      const b = new SqlBuilder();
      b.like(['v.name', 'v.imo_number', 'v.official_number', 'x.mmsi', 'x.location'], query.search);
      const where = b.whereClause();
      const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM ais_activities x${VESSEL_JOIN}${where}`, b.params);
      const sort: Record<string, string> = { activityDate: 'x.activity_date', vesselName: 'v.name', shipDetails: 'v.name', mmsi: 'x.mmsi', location: 'x.location', latitude: 'x.latitude', latLong: 'x.latitude', id: 'x.id' };
      const { rows } = await pool.query(
        `SELECT x.*, ${VESSEL_COLUMNS}, x.id AS id, v.name AS vessel_name_master, v.created_by AS vessel_created_by, v.updated_by AS vessel_updated_by, x.vessel_id
         FROM ais_activities x${VESSEL_JOIN}${where}${b.orderBy(query.order, sort, 'x.activity_date DESC')}${b.limit(query)}`,
        b.params,
      );
      return pagedResult(
        rows.map((r) => ({ id: r.id, activityDate: iso(r.activity_date), vessel: vesselOf(r) ?? emptyVessel(r), mmsi: str(r.mmsi), location: str(r.location), latitude: str(r.latitude), longitude: str(r.longitude) })),
        Number(countRows[0]?.count ?? 0),
        query,
      );
    },

    async map(): Promise<Row[]> {
      const { rows } = await pool.query('SELECT * FROM ais_ships ORDER BY name');
      return rows.map(shipRow);
    },

    async logs(filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const b = new SqlBuilder();
      b.eq('x.berth_id', idOrNull(filter.berthId));
      b.between('x.arrival_date_time', filter.arrivalBeginDate, filter.arrivalEndDate);
      b.like(['v.name', 'v.imo_number', 'v.official_number', 'x.mmsi', 'x.call_sign'], query.search);
      const where = b.whereClause();
      const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM ais_logs x${VESSEL_JOIN}${where}`, b.params);
      const sort: Record<string, string> = { arrivalDateTime: 'x.arrival_date_time', departureDateTime: 'x.departure_date_time', shipDetails: 'v.name', vesselName: 'v.name', mmsi: 'x.mmsi', callSign: 'x.call_sign', position: 'x.latitude', id: 'x.id' };
      const { rows } = await pool.query(
        `SELECT x.*, ${VESSEL_COLUMNS}, x.id AS id, v.name AS vessel_name_master, v.created_by AS vessel_created_by, v.updated_by AS vessel_updated_by, x.vessel_id,
                bb.name_alt AS berth_name
         FROM ais_logs x${VESSEL_JOIN} LEFT JOIN berths bb ON bb.id = x.berth_id${where}${b.orderBy(query.order, sort, 'x.arrival_date_time DESC')}${b.limit(query)}`,
        b.params,
      );
      return pagedResult(
        rows.map((r) => ({
          id: r.id,
          arrivalDateTime: iso(r.arrival_date_time),
          departureDateTime: iso(r.departure_date_time),
          vessel: vesselOf(r) ?? emptyVessel(r),
          vesselName: str(r.vessel_name_master),
          imoNumber: str(r.imo_number),
          officialNumber: str(r.official_number),
          mmsi: str(r.mmsi),
          callSign: str(r.call_sign),
          berthId: r.berth_id ?? 0,
          berthName: str(r.berth_name),
          latitude: str(r.latitude),
          longitude: str(r.longitude),
        })),
        Number(countRows[0]?.count ?? 0),
        query,
      );
    },
  };
}

const emptyVessel = (r: Row): Row => ({
  ...toVessel({}),
  id: 0,
  name: str(r.ship_name),
  mmsiNumber: str(r.mmsi),
  callSign: str(r.call_sign),
});

export type AisService = ReturnType<typeof createAisService>;
