/** KinSight Supabase project — SQL Editor (new query). */
export const SUPABASE_SQL_EDITOR_URL =
  "https://supabase.com/dashboard/project/owmtlvpmqupantyjglwy/sql/new";

export const CONTACTS_DELETE_POLICY_SQL = `-- Allow contact deletion (matches read/insert/update policies)
drop policy if exists "Allow public delete access" on public.contacts;
drop policy if exists "Enable delete for all" on public.contacts;

create policy "Enable delete for all"
  on public.contacts for delete
  to anon, authenticated, service_role
  using (true);`;

export function isContactsDeletePolicyError(error: string | null | undefined): boolean {
  return Boolean(
    error?.includes("018_contacts_delete_policy") ||
      error?.includes("Contact could not be deleted")
  );
}
