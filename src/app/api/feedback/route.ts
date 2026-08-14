import { z } from "zod";
import { sendFeedbackEmail } from "@/lib/email/send-feedback";
import {
  getAuthenticatedUser,
  getFeedbackSenderIdentity,
} from "@/lib/supabase/auth-server";

const feedbackSchema = z.object({
  message: z.string().trim().min(1, "Feedback message is required").max(5000),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid feedback";
      return Response.json({ error: message }, { status: 400 });
    }

    const user = await getAuthenticatedUser(req);
    const sender = getFeedbackSenderIdentity(user);

    const result = await sendFeedbackEmail({
      userName: sender.name,
      userEmail: sender.email,
      message: parsed.data.message,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Feedback route error:", err);
    return Response.json(
      { error: "Could not send feedback. Please try again." },
      { status: 500 }
    );
  }
}
