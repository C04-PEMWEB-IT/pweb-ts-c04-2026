type Role = "admin" | "moderator" | "user";
type Priority = "normal" | "lansia" | "disabilitas" | "vip";
type TicketStatus = "waiting" | "called" | "done" | "skipped";

interface AuthSession {
  token: string;
  role: Role;
  firstName: string;
  username: string;
}

interface QueueType {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

interface Ticket {
  id: string;
  typeId: string;
  code: string;
  number: number;
  label: string;
  priority: Priority;
  status: TicketStatus;
  seq: number;
  createdAt: number;
  calledAt?: number;
  closedAt?: number;
  skips: number;
  source: "kiosk" | "admin";
}

interface CallEvent {
  label: string;
  typeName: string;
  at: number;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
