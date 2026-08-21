import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import "./TaskModal.css";
import type { Task, TaskCreate } from "../types";

interface TaskModalProps {
  task?: Task | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: TaskCreate) => Promise<void>;
}

type Priority = 1 | 2 | 3;

const PRIORITIES: {
  value: Priority;
  label: string;
  tone: "high" | "medium" | "low";
}[] = [
  {
    value: 1,
    label: "Высокий",
    tone: "high",
  },
  {
    value: 2,
    label: "Средний",
    tone: "medium",
  },
  {
    value: 3,
    label: "Низкий",
    tone: "low",
  },
];

function normalizePriority(
  priority: number | undefined,
): Priority {
  if (
    priority === 1 ||
    priority === 2 ||
    priority === 3
  ) {
    return priority;
  }

  return 2;
}

export function TaskModal({
  task,
  isSaving,
  onClose,
  onSubmit,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [priority, setPriority] =
    useState<Priority>(2);

  const [dueDate, setDueDate] = useState("");

  const [error, setError] = useState<
    string | null
  >(null);

  useEffect(() => {
    setTitle(task?.title ?? "");

    setDescription(
      task?.description ?? "",
    );

    setPriority(
      normalizePriority(task?.priority),
    );

    setDueDate(task?.due_date ?? "");

    setError(null);
  }, [task]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError(
        "Укажи название задачи.",
      );

      return;
    }

    try {
      await onSubmit({
        title: cleanTitle,
        description:
          description.trim() || null,
        priority,
        due_date: dueDate || null,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось сохранить задачу",
      );
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal__heading">
          <div>
            <p className="eyebrow">
              {task
                ? "Редактирование задачи"
                : "Новая задача"}
            </p>

            <h2 id="task-modal-title">
              {task
                ? "Обнови нужные детали"
                : "Что нужно сделать?"}
            </h2>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <form
          className="task-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>Название</span>

            <input
              autoFocus
              value={title}
              maxLength={255}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              placeholder="Купить продукты"
            />
          </label>

          <label>
            <span>Описание</span>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              rows={4}
              placeholder="Добавь немного контекста…"
            />
          </label>

          <div className="form-grid">
            <fieldset className="priority-field">
              <legend>Приоритет</legend>

              <div className="priority-picker">
                {PRIORITIES.map(
                  ({
                    value,
                    label,
                    tone,
                  }) => (
                    <label
                      className={`priority-option priority-option--${tone}`}
                      key={value}
                    >
                      <input
                        className="priority-option__input"
                        type="radio"
                        name="priority"
                        value={value}
                        checked={
                          priority === value
                        }
                        disabled={isSaving}
                        onChange={() =>
                          setPriority(value)
                        }
                      />

                      <span className="priority-option__content">
                        <span
                          className="priority-option__dot"
                          aria-hidden="true"
                        />

                        {label}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </fieldset>

            <label>
              <span>Срок</span>

              <input
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>

          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          <div className="modal__actions">
            <button
              className="button button--ghost"
              type="button"
              onClick={onClose}
            >
              Отмена
            </button>

            <button
              className="button button--primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Сохраняем…"
                : task
                  ? "Сохранить изменения"
                  : "Создать задачу"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
