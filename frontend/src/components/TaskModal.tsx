import { useEffect, useState, type FormEvent } from "react";
import type { Task, TaskCreate } from "../types";

interface TaskModalProps {
  task?: Task | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: TaskCreate) => Promise<void>;
}

export function TaskModal({ task, isSaving, onClose, onSubmit }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setPriority(task?.priority ?? 1);
    setDueDate(task?.due_date ?? "");
    setError(null);
  }, [task]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Укажи название задачи.");
      return;
    }

    try {
      await onSubmit({
        title: cleanTitle,
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить задачу");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__heading">
          <div>
            <p className="eyebrow">{task ? "Редактирование задачи" : "Новая задача"}</p>
            <h2 id="task-modal-title">{task ? "Обнови нужные детали" : "Что нужно сделать?"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            <span>Название</span>
            <input
              autoFocus
              value={title}
              maxLength={255}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Обновить портфолио"
            />
          </label>

          <label>
            <span>Описание</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Добавь немного контекста…"
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Приоритет</span>
              <input
                type="number"
                min={1}
                value={priority}
                onChange={(event) => setPriority(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>

            <label>
              <span>Срок</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal__actions">
            <button className="button button--ghost" type="button" onClick={onClose}>
              Отмена
            </button>
            <button className="button button--primary" type="submit" disabled={isSaving}>
              {isSaving ? "Сохраняем…" : task ? "Сохранить изменения" : "Создать задачу"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
