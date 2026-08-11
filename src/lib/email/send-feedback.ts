const FEEDBACK_TO = process.env.FEEDBACK_TO_EMAIL ?? "scottpease77@gmail.com";
const FEEDBACK_FROM =
  process.env.FEEDBACK_FROM_EMAIL ?? "KinSight <onboarding@resend.dev>";

interface SendFeedbackEmailInput {
  userName: string;
  message: string;
}

export async function sendFeedbackEmail({
  userName,
  message,
}: SendFeedbackEmailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Email is not configured. Add RESEND_API_KEY to .env.local (get one at resend.com).",
    };
  }

  const subject = `${userName.trim()} - KinSight User Feedback`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FEEDBACK_FROM,
      to: [FEEDBACK_TO],
      subject,
      text: message.trim(),
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string }
      | null;
    const detail = body?.message ?? `Resend returned ${res.status}`;
    console.error("sendFeedbackEmail error:", detail);
    return { ok: false, error: detail };
  }

  return { ok: true };
}
