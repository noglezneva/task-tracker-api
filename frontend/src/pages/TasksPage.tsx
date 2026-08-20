import { useCallback, useEffect, useState } from "react";
import {
  createTask,
  deleteTask,
  getTaskStats,
  listTasks,
  updateTask,
} from "../api/tasks";
import { useAuth } from "../auth/AuthContext";
import { TaskCard } from "../components/TaskCard";
import { TaskModal } from "../components/TaskModal";
import { ThemeToggle } from "../components/ThemeToggle";
import type {
  Task,
  TaskCreate,
  TaskStats,
  TaskStatus,
} from "../types";

const PAGE_SIZE = 8;

type Filter = TaskStatus | "all";

export function TasksPage() {
  const { signOut } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [modalTask, setModalTask] = useState<
    Task | null | undefined
  >(undefined);

  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const data = await listTasks({
        status: filter,
        search,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      setTasks(data);
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить задачи",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter, search, page]);

  const loadStats = useCallback(async () => {
    setStatsError(null);

    try {
      const data = await getTaskStats();
      setStats(data);
    } catch (err) {
      setStatsError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить статистику",
      );
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  function changeFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    setPage(0);
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  function clearSearch() {
    setSearch("");
    setPage(0);
  }

  async function refreshTasksAndStats() {
    await Promise.all([loadTasks(), loadStats()]);
  }

  async function handleSave(data: TaskCreate) {
    setIsSaving(true);

    try {
      if (modalTask) {
        await updateTask(modalTask.id, data);
      } else {
        await createTask(data);
      }

      setModalTask(undefined);

      await refreshTasksAndStats();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(task: Task) {
    setBusyId(task.id);
    setPageError(null);

    try {
      await updateTask(task.id, {
        status: task.status === "done" ? "open" : "done",
      });

      await refreshTasksAndStats();
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : "Не удалось обновить задачу",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task: Task) {
    const confirmed = window.confirm(
      `Удалить задачу «${task.title}»?`,
    );

    if (!confirmed) {
      return;
    }

    setBusyId(task.id);
    setPageError(null);

    try {
      await deleteTask(task.id);

      await loadStats();

      if (tasks.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        await loadTasks();
      }
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : "Не удалось удалить задачу",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">т</span>
          трекер задач
        </div>

        <div className="topbar__actions">
          <ThemeToggle />

          <button
            className="text-button"
            type="button"
            onClick={signOut}
          >
            Выйти
          </button>
        </div>
      </header>

      <section className="dashboard">
        <div className="dashboard__heading">
          <div>
            <p className="eyebrow">Твои задачи</p>

            <p className="dashboard__subtext">
              {stats
                ? `Открытых задач: ${stats.open}.`
                : "Загружаем статистику…"}
            </p>
          </div>

          <button
            className="button button--primary"
            type="button"
            onClick={() => setModalTask(null)}
          >
            <span aria-hidden="true">＋</span> Новая задача
          </button>
        </div>

        <div
          className="task-stats"
          aria-label="Статистика задач"
        >
          <article className="stat-card">
            <span className="stat-card__label">Всего</span>
            <strong>{stats?.total ?? "—"}</strong>
          </article>

          <article className="stat-card">
            <span className="stat-card__label">Открыто</span>
            <strong>{stats?.open ?? "—"}</strong>
          </article>

          <article className="stat-card">
            <span className="stat-card__label">Выполнено</span>
            <strong>{stats?.done ?? "—"}</strong>
          </article>

          <article className="stat-card stat-card--danger">
            <span className="stat-card__label">
              Просрочено
            </span>
            <strong>{stats?.overdue ?? "—"}</strong>
          </article>
        </div>

        {statsError && (
          <p className="stats-error">{statsError}</p>
        )}

        <div className="task-search">
          <span
            className="task-search__icon"
            aria-hidden="true"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>

          <input
            className="task-search__input"
            type="search"
            value={search}
            placeholder="Поиск задач..."
            aria-label="Поиск задач"
            onChange={(event) =>
              changeSearch(event.target.value)
            }
          />

          {search && (
            <button
              className="task-search__clear"
              type="button"
              aria-label="Очистить поиск"
              onClick={clearSearch}
            >
              ×
            </button>
          )}
        </div>

        <div className="toolbar">
          <div
            className="segmented"
            aria-label="Фильтр задач"
          >
            {(["all", "open", "done"] as Filter[]).map(
              (item) => (
                <button
                  className={
                    filter === item
                      ? "segmented__item segmented__item--active"
                      : "segmented__item"
                  }
                  type="button"
                  key={item}
                  onClick={() => changeFilter(item)}
                >
                  {item === "all"
                    ? "Все"
                    : item === "open"
                      ? "Открытые"
                      : "Выполненные"}
                </button>
              ),
            )}
          </div>

          <span className="page-label">
            Страница {page + 1}
          </span>
        </div>

        {pageError && (
          <div className="notice notice--error">
            <span>{pageError}</span>

            <button
              className="text-button"
              type="button"
              onClick={() => void loadTasks()}
            >
              Повторить
            </button>
          </div>
        )}

        {isLoading ? (
          <div
            className="task-list"
            aria-label="Загрузка задач"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                className="task-skeleton"
                key={index}
              />
            ))}
          </div>
        ) : tasks.length ? (
          <div className="task-list">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                busy={busyId === task.id}
                onToggle={(item) =>
                  void handleToggle(item)
                }
                onEdit={(item) => setModalTask(item)}
                onDelete={(item) =>
                  void handleDelete(item)
                }
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-state__mark">✓</span>

            <h2>
              {search.trim()
                ? "Ничего не найдено."
                : "Здесь пока ничего нет."}
            </h2>

            <p>
              {search.trim()
                ? `По запросу «${search.trim()}» задач нет.`
                : filter === "all"
                  ? "Создай первую небольшую задачу."
                  : filter === "open"
                    ? "На этой странице нет открытых задач."
                    : "На этой странице нет выполненных задач."}
            </p>

            {search.trim() ? (
              <button
                className="button button--ghost"
                type="button"
                onClick={clearSearch}
              >
                Сбросить поиск
              </button>
            ) : (
              <button
                className="button button--primary"
                type="button"
                onClick={() => setModalTask(null)}
              >
                Создать задачу
              </button>
            )}
          </div>
        )}

        <div className="pagination">
          <button
            className="button button--ghost"
            type="button"
            disabled={page === 0 || isLoading}
            onClick={() =>
              setPage((current) =>
                Math.max(0, current - 1),
              )
            }
          >
            ← Назад
          </button>

          <button
            className="button button--ghost"
            type="button"
            disabled={
              tasks.length < PAGE_SIZE || isLoading
            }
            onClick={() =>
              setPage((current) => current + 1)
            }
          >
            Далее →
          </button>
        </div>
      </section>

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          isSaving={isSaving}
          onClose={() => setModalTask(undefined)}
          onSubmit={handleSave}
        />
      )}
    </main>
  );
}
