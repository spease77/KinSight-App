import { downloadRemoteAvatarImage } from "@/lib/supabase/contact-photos";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { url?: unknown };
    if (typeof body.url !== "string" || !body.url.trim()) {
      return Response.json({ error: "No image URL provided" }, { status: 400 });
    }

    const downloaded = await downloadRemoteAvatarImage(body.url.trim());
    if ("error" in downloaded) {
      return Response.json({ error: downloaded.error }, { status: 400 });
    }

    return new Response(new Uint8Array(downloaded.buffer), {
      status: 200,
      headers: {
        "Content-Type": downloaded.mimeType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Avatar from-url preview error:", err);
    return Response.json(
      { error: "Could not download that image." },
      { status: 500 }
    );
  }
}
