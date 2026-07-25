export type MessageRow = {
  id: string;
  senderId: string | null;
  senderName: string;
  senderRole: string;
  content: string;
  type: string;
  createdAt: string;
  href?: string | null;
  isRead: boolean;
};

export type ConversationSummary = {
  id: string;
  title: string;
  type: string;
  category: "notification" | "conversation";
  lastMessageAt: string | null;
  participants: string[];
  messages: MessageRow[];
  unreadCount: number;
};
