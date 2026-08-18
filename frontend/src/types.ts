export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  priority: number;
  due_date?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  priority?: number;
  due_date?: string | null;
  status?: TaskStatus;
}

export interface TaskStats {
  total: number;
  open: number;
  done: number;
  overdue: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
