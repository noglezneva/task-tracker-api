import "./UndoToast.css";

interface UndoToastProps {
  taskTitle: string;
  onUndo: () => void;
}

export function UndoToast({
  taskTitle,
  onUndo,
}: UndoToastProps) {
  return (
    <div
      className="undo-toast"
      role="status"
      aria-live="polite"
    >
      <div className="undo-toast__content">
        <strong>Задача удалена</strong>

        <span className="undo-toast__title">
          {taskTitle}
        </span>
      </div>

      <button
        className="undo-toast__button"
        type="button"
        onClick={onUndo}
      >
        Отменить
      </button>

      <span
        className="undo-toast__progress"
        aria-hidden="true"
      />
    </div>
  );
}