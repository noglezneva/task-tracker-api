import type {
  Task,
  TaskCreate,
  TaskStats,
  TaskStatus,
  TaskUpdate,
} from "../types";
import { apiRequest } from "./client";

interface ListTaskOptions {
  status: TaskStatus | "all";
  limit: number;
  offset: number;
}

export function listTasks({
  status,
  limit,
  offset,
}: ListTaskOptions): Promise<Task[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (status !== "all") {
    params.set("status", status);
  }

  return apiRequest<Task[]>(`/tasks?${params.toString()}`);
}

export function getTaskStats(): Promise<TaskStats> {
  return apiRequest<TaskStats>("/tasks/stats");
}

export function createTask(data: TaskCreate): Promise<Task> {
  return apiRequest<Task>("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateTask(
  taskId: string,
  data: TaskUpdate,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteTask(taskId: string): Promise<void> {
  return apiRequest<void>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}
