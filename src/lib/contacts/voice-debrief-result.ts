export type VoiceDebriefFollowUp = {
  title: string;
  due_at: string | null;
};

export type VoiceDebriefCaptureResult = {
  personal_notes: string[];
  follow_up_tasks: VoiceDebriefFollowUp[];
  mentioned_contacts: string[];
  ai_summary?: string;
  action_items?: Array<{ text: string }>;
};
