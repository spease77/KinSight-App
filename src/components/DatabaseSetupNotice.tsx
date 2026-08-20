import { SUPABASE_SQL_EDITOR_URL } from "@/lib/supabase/sql-editor-url";

interface DatabaseSetupNoticeProps {
  error: string;
}

export function DatabaseSetupNotice({ error }: DatabaseSetupNoticeProps) {

  const needsTable =

    error.includes("Could not find the table") ||

    error.includes("contacts");



  if (!needsTable) {

    return (

      <p className="ui-alert-warning px-4 py-3 text-xs" role="alert">

        Database note: {error}

      </p>

    );

  }



  return (

    <div className="ui-alert-warning px-4 py-4 text-xs">

      <p className="font-medium">

        Your contacts table still needs to be created in Supabase.

      </p>

      <ol className="mt-2 list-decimal space-y-1 pl-4">

        <li>

          Open{" "}

          <a

            href={SUPABASE_SQL_EDITOR_URL}

            target="_blank"

            rel="noopener noreferrer"

            className="font-medium underline"

          >

            Supabase SQL Editor

          </a>

        </li>

        <li>

          Paste the SQL from{" "}

          <code className="font-medium">

            supabase/migrations/002_fix_rls_policies.sql

          </code>

        </li>

        <li>Click Run</li>

        <li>Refresh this page</li>

      </ol>

    </div>

  );

}

