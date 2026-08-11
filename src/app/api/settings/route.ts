import { z } from "zod";
import {
  fetchUserSettings,
  updateUserSettings,
} from "@/lib/supabase/user-settings";

const patchSchema = z.object({
  globalNotificationsEnabled: z.boolean().optional(),
});

export async function GET() {
  const { settings, error } = await fetchUserSettings();

  if (error) {
    return Response.json({ error }, { status: 500 });
  }

  return Response.json(
    { settings },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid settings payload." }, { status: 400 });
    }

    const { settings, error } = await updateUserSettings(parsed.data);

    if (error || !settings) {
      return Response.json(
        { error: error ?? "Could not save settings." },
        { status: 500 }
      );
    }

    return Response.json({ settings });
  } catch (err) {
    console.error("Settings PATCH error:", err);
    return Response.json({ error: "Could not save settings." }, { status: 500 });
  }
}
