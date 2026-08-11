import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  busy: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function formatDate(value: string | null): string {
  if (!value) return "Без срока";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function isOverdue(dueDate: string | null, isDone: boolean): boolean {
  if (!dueDate || isDone) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);

  return due < today;
}

export function TaskCard({ task, busy, onToggle, onEdit, onDelete }: TaskCardProps) {
  const isDone = task.status === "done";
  const overdue = isOverdue(task.due_date, isDone);

  return (
    <article className={`task-card ${isDone ? "task-card--done" : ""}`}>
      <button
        className={`task-check ${isDone ? "task-check--done" : ""}`}
        type="button"
        aria-label={isDone ? "Вернуть задачу в открытые" : "Отметить задачу выполненной"}
        disabled={busy}
        onClick={() => onToggle(task)}
      >
        {isDone ? "✓" : ""}
      </button>

      <div className="task-card__body">
        <div className="task-card__topline">
          <h3>{task.title}</h3>
          <span className="priority-pill">Приоритет {task.priority}</span>
        </div>

        {task.description && <p>{task.description}</p>}

        <div className={`task-meta ${overdue ? "task-meta--overdue" : ""}`}>
          <span>
            {overdue
              ? `Просрочено · ${formatDate(task.due_date)}`
              : formatDate(task.due_date)}
          </span>
          <span>•</span>
          <span>{isDone ? "Выполнена" : "Открыта"}</span>
        </div>
      </div>

      <div className="task-actions">
        <button
          className="text-button"
          type="button"
          onClick={() => onEdit(task)}
          disabled={busy}
        >
          Изменить
        </button>

        <button
          className="text-button text-button--danger"
          type="button"
          onClick={() => onDelete(task)}
          disabled={busy}
        >
          Удалить
        </button>
      </div>
    </article>
  );
}
