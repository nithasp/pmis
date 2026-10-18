import { PERMISSION_CODES } from '../constants/permissions';
import { withTransaction } from '../database';
import { RoleRepository } from '../repositories/role.repository';
import { UserRepository } from '../repositories/user.repository';
import { Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { AppError, conflict, notFound } from '../utils/errors';
import { iso, str } from '../utils/rows';

const CACHE_TTL_MS = 30_000;

export function createRoleService(roles: RoleRepository, users: UserRepository) {
  const cache = new Map<number, { at: number; codes: Set<string> }>();

  const toListItem = (row: Row, countUser: number): Row => ({
    id: row.id,
    name: row.name,
    roleType: row.role_type,
    activated: row.activated,
    countUser,
    updatedAt: iso(row.updated_at),
    updatedName: str(row.updated_by),
    canDelete: !row.is_system,
    canEdit: true,
    canDeActivate: !row.is_system,
  });

  return {
    async list(query: ListQuery): Promise<PagedResult<Row>> {
      const [page, counts] = await Promise.all([roles.list(query), users.countByRole()]);
      return { ...page, data: page.data.map((r) => toListItem(r, counts.get(r.id as number) ?? 0)) };
    },

    async detail(id: number): Promise<Row> {
      const row = await roles.findById(id);
      if (!row) throw notFound('สิทธิ์ผู้ใช้งาน', 'role not found');
      const counts = await users.countByRole();
      return { ...toListItem(row, counts.get(id) ?? 0), permissions: row.permissions ?? [] };
    },

    async create(input: Row, by: string): Promise<Row> {
      const permissions = (input.permissions ?? []).filter((p: string) => (PERMISSION_CODES as readonly string[]).includes(p));
      const created = await roles.create({ name: input.name, role_type: input.roleType || 'Admin', activated: input.activated ?? true, permissions, by });
      return this.detail(created.id as number);
    },

    async update(id: number, input: Row, by: string): Promise<Row> {
      const permissions = Array.isArray(input.permissions)
        ? input.permissions.filter((p: string) => (PERMISSION_CODES as readonly string[]).includes(p))
        : null;
      const updated = await roles.update(id, { name: input.name, activated: input.activated, permissions, role_type: input.roleType || null, by });
      if (!updated) throw notFound('สิทธิ์ผู้ใช้งาน', 'role not found');
      cache.delete(id);
      return this.detail(id);
    },

    async setEnabled(id: number, enabled: boolean, by: string): Promise<Row> {
      const row = await roles.findById(id);
      if (!row) throw notFound('สิทธิ์ผู้ใช้งาน', 'role not found');
      if (row.is_system && !enabled) throw new AppError('ไม่สามารถปิดใช้งานสิทธิ์ของระบบได้', 400, 'bad_request', 'System roles cannot be deactivated');
      await roles.update(id, { activated: enabled, by });
      cache.delete(id);
      return this.detail(id);
    },

    async remove(id: number, newRoleId: number | null): Promise<void> {
      const row = await roles.findById(id);
      if (!row) throw notFound('สิทธิ์ผู้ใช้งาน', 'role not found');
      if (row.is_system) throw new AppError('ไม่สามารถลบสิทธิ์ของระบบได้', 400, 'bad_request', 'System roles cannot be deleted');
      const counts = await users.countByRole();
      if ((counts.get(id) ?? 0) > 0) {
        if (!newRoleId) throw conflict('สิทธิ์นี้ยังมีผู้ใช้งานอยู่ กรุณาเลือกสิทธิ์ใหม่ให้ผู้ใช้งานก่อน', 'role is still assigned to users');
        if (!(await roles.findById(newRoleId))) throw notFound('สิทธิ์ผู้ใช้งานใหม่', 'new role not found');
      }
      await withTransaction(async (tx) => {
        await users.reassignRole(id, newRoleId, tx);
        await roles.softDelete(id, tx);
      });
      cache.delete(id);
    },

    async permissionsOf(roleId: number | null): Promise<Set<string>> {
      if (!roleId) return new Set();
      const cached = cache.get(roleId);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.codes;
      const row = await roles.findById(roleId);
      const codes = new Set<string>(row && row.activated ? (row.permissions as string[]) : []);
      cache.set(roleId, { at: Date.now(), codes });
      return codes;
    },

    async options(): Promise<{ id: number; name: string; roleType: string }[]> {
      const all = await roles.all();
      return all
        .filter((r) => r.activated && r.role_type !== 'Agency')
        .map((r) => ({ id: r.id as number, name: str(r.name), roleType: str(r.role_type) }));
    },
  };
}

export type RoleService = ReturnType<typeof createRoleService>;
