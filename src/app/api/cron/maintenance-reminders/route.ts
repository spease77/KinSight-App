import { runMaintenanceReminderScan } from "@/lib/supabase/maintenance-reminders";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMaintenanceReminderScan();
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Maintenance reminder cron error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not run maintenance reminder scan.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
