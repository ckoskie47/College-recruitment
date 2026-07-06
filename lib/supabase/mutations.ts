// Server-only typed mutation helpers.
//
// The hand-maintained types.ts placeholder causes @supabase/postgrest-js's
// insert() parameter to infer as `never` (deferred conditional type in
// PostgrestQueryBuilder). Once `supabase gen types typescript --linked` is run
// and types.ts is replaced with the generated file, this module can be
// deleted and call sites can use supabase.from().insert() directly.
//
// The `satisfies` check at each call site provides compile-time type safety.
// The `as never` cast is the narrowest escape from the broken inference.

import { createServiceClient } from './service'
import type { Database } from './types'

type Tables = Database['public']['Tables']

// Insert a single row via the service-role client (RLS must be verified by caller).
export async function dbInsert<T extends keyof Tables>(
  table: T,
  data: Tables[T]['Insert']
): Promise<{ error: { message: string } | null }> {
  const client = createServiceClient()
  // `data` is typed as Tables[T]['Insert'] by the generic constraint above.
  // The cast is required because postgrest-js's generic conditional type
  // for insert() infers `never` with placeholder type files.
  return client.from(table as never).insert(data as never)
}

// Delete rows matching a single equality filter via the service-role client.
export async function dbDelete(
  table: keyof Tables,
  column: string,
  value: string
): Promise<{ error: { message: string } | null }> {
  const client = createServiceClient()
  return client.from(table as never).delete().eq(column, value)
}
