import { createClient } from "@/lib/supabase/server";
export default async function SupabaseDebugPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  return (
    <pre style={{ padding: 24, whiteSpace: "pre-wrap" }}>
      {error
        ? `ERROR: ${error.message}`
        : `OK. session: ${JSON.stringify(data.session, null, 2)}`}
    </pre>
  );
}
