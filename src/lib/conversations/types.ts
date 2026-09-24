import type { UIMessage } from "ai";

export type KinSightConversation = {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
};

export type ConversationSummary = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
};
