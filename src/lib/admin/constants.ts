// Deliberately has ZERO imports — this file must be safe to import from a
// Client Component (page-size-select.tsx does). Keeping it separate from
// user-queries.ts is what prevents that: user-queries.ts pulls in
// requireAdmin() -> the server-only Supabase client chain (next/headers,
// createAdminClient), which must never end up in a browser bundle. A
// shared constant that both the client control and the server query need
// has to live somewhere with no server-only dependency at all.
export const ADMIN_USERS_PAGE_SIZES = [20, 50, 100] as const;
export type AdminUsersPageSize = (typeof ADMIN_USERS_PAGE_SIZES)[number];
