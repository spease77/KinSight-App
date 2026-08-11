"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { Header } from "@/components/Header";

const USER_NAME_KEY = "kinsight-user-name";
const SUBMITTED_RESET_MS = 3000;

type SubmitState = "idle" | "sending" | "submitted";

export function FeedbackPage() {
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(USER_NAME_KEY);
    if (saved) setUserName(saved);
  }, []);

  useEffect(() => {
    if (submitState !== "submitted") return;

    const timer = window.setTimeout(() => {
      setSubmitState("idle");
      setMessage("");
    }, SUBMITTED_RESET_MS);

    return () => window.clearTimeout(timer);
  }, [submitState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = userName.trim();
    const text = message.trim();
    if (!name || !text || submitState !== "idle") return;

    setSubmitState("sending");
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: name, message: text }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not send feedback.");
        setSubmitState("idle");
        return;
      }

      localStorage.setItem(USER_NAME_KEY, name);
      setMessage("");
      setSubmitState("submitted");
    } catch {
      setError("Could not send feedback. Check your connection and try again.");
      setSubmitState("idle");
    }
  };

  const isSubmitted = submitState === "submitted";
  const isSending = submitState === "sending";

  return (
    <>
      <Header title="Feedback" />
      <main className="flex flex-col gap-6 px-5 pb-6 pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="ui-label">Your name</span>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Who is this from?"
              autoComplete="name"
              disabled={isSending || isSubmitted}
              className="app-field-input app-field-input--neutral text-sm disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ui-label">Feedback</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's working, what's not, or what you'd like KinSight to do next."
              rows={6}
              disabled={isSending || isSubmitted}
              className="app-field-input app-field-input--neutral resize-none text-sm disabled:opacity-60"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-400/50 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-center pt-1">
            <button
              type="submit"
              disabled={isSending || isSubmitted}
              className={`
                inline-flex items-center gap-2 px-6 py-2.5 text-sm
                active:scale-[0.98] disabled:cursor-default disabled:opacity-100
                ${isSubmitted ? "ui-btn-green" : "ui-btn-primary"}
              `}
            >
              {isSubmitted ? (
                <Check className="h-4 w-4" strokeWidth={2} />
              ) : isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Send className="h-4 w-4" strokeWidth={2} />
              )}
              {isSubmitted ? "Submitted" : isSending ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
