import "./TaskCard.css";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  busy: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

type PriorityTone = "high" | "medium" | "low";

function formatDate(value: string | null): string {
  if (!value) return "Без срока";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function getDueDateLabel(
  dueDate: string | null,
  isDone: boolean,
): string {
  if (!dueDate) {
    return "Без срока";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(
    dayAfterTomorrow.getDate() + 2,
  );

  const due = new Date(`${dueDate}T00:00:00`);
  const formattedDate = formatDate(dueDate);

  if (!isDone && due < today) {
    return `Просрочено · ${formattedDate}`;
  }

  if (due.getTime() === today.getTime()) {
    return `Сегодня · ${formattedDate}`;
  }

  if (due.getTime() === tomorrow.getTime()) {
    return `Завтра · ${formattedDate}`;
  }

  if (
    due.getTime() === dayAfterTomorrow.getTime()
  ) {
    return `Послезавтра · ${formattedDate}`;
  }

  return formattedDate;
}

function isOverdue(
  dueDate: string | null,
  isDone: boolean,
): boolean {
  if (!dueDate || isDone) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);

  return due < today;
}

function getPriorityLabel(priority: number): string {
  if (priority === 1) {
    return "Высокий";
  }

  if (priority === 2) {
    return "Средний";
  }

  return "Низкий";
}

function getPriorityTone(
  priority: number,
): PriorityTone {
  if (priority === 1) {
    return "high";
  }

  if (priority === 2) {
    return "medium";
  }

  return "low";
}

export function TaskCard({
  task,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const isDone = task.status === "done";

  const overdue = isOverdue(
    task.due_date,
    isDone,
  );

  const priorityLabel = getPriorityLabel(
    task.priority,
  );

  const priorityTone = getPriorityTone(
    task.priority,
  );

  return (
    <article
      className={`task-card ${
        isDone ? "task-card--done" : ""
      }`}
    >
      <button
        className={`task-check ${
          isDone ? "task-check--done" : ""
        }`}
        type="button"
        aria-label={
          isDone
            ? "Вернуть задачу в открытые"
            : "Отметить задачу выполненной"
        }
        disabled={busy}
        onClick={() => onToggle(task)}
      >
        <span
          className="task-check__icon"
          aria-hidden="true"
        >
          ✓
        </span>
      </button>

      <div className="task-card__body">
        <div className="task-card__topline">
          <h3>{task.title}</h3>

          <span
            className={`priority-pill priority-pill--${priorityTone}`}
          >
            {priorityLabel}
          </span>
        </div>

        {task.description && (
          <p>{task.description}</p>
        )}

        <div
          className={`task-meta ${
            overdue
              ? "task-meta--overdue"
              : ""
          }`}
        >
          <span>
            {getDueDateLabel(
              task.due_date,
              isDone,
            )}
          </span>

          <span>•</span>

          <span>
            {isDone
              ? "Выполнена"
              : "Открыта"}
          </span>
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
