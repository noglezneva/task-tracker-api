import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "./TasksPage.css";

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
import { UndoToast } from "../components/UndoToast";
import type {
  Task,
  TaskCreate,
  TaskStats,
  TaskStatus,
} from "../types";

const PAGE_SIZE = 8;
const DELETE_UNDO_MS = 5000;
const FILTER_FADE_MS = 180;

type Filter = TaskStatus | "all";

interface PendingDelete {
  task: Task;
  index: number;
  filter: Filter;
  search: string;
  page: number;
  wasOnlyTaskOnPage: boolean;
}

export function TasksPage() {
  const { signOut } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(
    null,
  );

  const [filter, setFilter] = useState<Filter>("all");

  /*
   * selectedFilter отвечает только за визуально
   * выбранную кнопку.
   *
   * filter — реальный фильтр, который отправляется API.
   */
  const [selectedFilter, setSelectedFilter] =
    useState<Filter>("all");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");
  const [page, setPage] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const [
    isFilterTransitioning,
    setIsFilterTransitioning,
  ] = useState(false);

  const [pageError, setPageError] = useState<
    string | null
  >(null);

  const [statsError, setStatsError] = useState<
    string | null
  >(null);

  const [modalTask, setModalTask] = useState<
    Task | null | undefined
  >(undefined);

  const [isSaving, setIsSaving] = useState(false);

  const [busyId, setBusyId] = useState<
    string | null
  >(null);

  const [pendingDelete, setPendingDelete] =
    useState<PendingDelete | null>(null);

  const deleteTimerRef = useRef<number | null>(null);

  const filterTransitionTimerRef = useRef<
    number | null
  >(null);

  /*
   * Следующую загрузку задач можно выполнить
   * без skeleton.
   */
  const skipNextLoadingRef = useRef(false);

  const pendingDeleteRef =
    useRef<PendingDelete | null>(null);

  /*
   * Задачи, которые уже скрыты на фронте,
   * но DELETE для которых ещё может выполняться.
   */
  const hiddenTaskIdsRef = useRef<Set<string>>(
    new Set(),
  );

  const currentViewRef = useRef({
    filter,
    search: debouncedSearch,
    page,
  });

  const loadTasksRef = useRef<
    ((showLoading?: boolean) => Promise<void>) | null
  >(null);

  useEffect(() => {
    currentViewRef.current = {
      filter,
      search: debouncedSearch,
      page,
    };
  }, [filter, debouncedSearch, page]);

  const loadTasks = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setIsLoading(true);
      }

      setPageError(null);

      try {
        const data = await listTasks({
          status: filter,
          search: debouncedSearch,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });

        /*
         * Не возвращаем на экран задачи,
         * которые пользователь только что удалил,
         * пока DELETE ещё не завершился.
         */
        const visibleTasks = data.filter(
          (task) =>
            !hiddenTaskIdsRef.current.has(task.id),
        );

        setTasks(visibleTasks);
      } catch (err) {
        setPageError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить задачи",
        );
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [filter, debouncedSearch, page],
  );

  useEffect(() => {
    loadTasksRef.current = loadTasks;
  }, [loadTasks]);

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

  /*
   * При обычной загрузке показываем skeleton.
   *
   * При переключении фильтра загружаем новые
   * данные незаметно, пока старый список скрыт.
   */
  useEffect(() => {
    const showLoading =
      !skipNextLoadingRef.current;

    skipNextLoadingRef.current = false;

    void loadTasks(showLoading).finally(() => {
      if (!showLoading) {
        window.requestAnimationFrame(() => {
          setIsFilterTransitioning(false);
        });
      }
    });
  }, [loadTasks]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  /*
   * Если пользователь покинул страницу,
   * уже выбранное удаление всё равно сохраняем.
   *
   * Также очищаем таймер анимации фильтра.
   */
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current !== null) {
        window.clearTimeout(
          deleteTimerRef.current,
        );
      }

      if (
        filterTransitionTimerRef.current !== null
      ) {
        window.clearTimeout(
          filterTransitionTimerRef.current,
        );
      }

      const pending = pendingDeleteRef.current;

      if (pending) {
        void deleteTask(pending.task.id);
      }
    };
  }, []);

  function changeFilter(nextFilter: Filter) {
    /*
     * Кликнули по уже визуально выбранной кнопке.
     */
    if (nextFilter === selectedFilter) {
      return;
    }

    /*
     * Если пользователь очень быстро переключает
     * вкладки — отменяем старый таймер.
     */
    if (
      filterTransitionTimerRef.current !== null
    ) {
      window.clearTimeout(
        filterTransitionTimerRef.current,
      );

      filterTransitionTimerRef.current = null;
    }

    /*
     * Активная кнопка меняется сразу.
     */
    setSelectedFilter(nextFilter);

    /*
     * Например:
     *
     * all → open → сразу снова all
     *
     * Реальный filter ещё не успел измениться,
     * поэтому просто отменяем переход.
     */
    if (nextFilter === filter) {
      setIsFilterTransitioning(false);

      return;
    }

    /*
     * Начинаем скрывать текущий список.
     */
    setIsFilterTransitioning(true);

    filterTransitionTimerRef.current =
      window.setTimeout(() => {
        /*
         * Следующий запрос выполняется
         * без skeleton.
         */
        skipNextLoadingRef.current = true;

        setFilter(nextFilter);
        setPage(0);

        filterTransitionTimerRef.current = null;
      }, FILTER_FADE_MS);
  }

  function changeSearch(value: string) {
    setSearch(value);
  }

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
    setPage(0);
  }

  function clearDeleteTimer() {
    if (deleteTimerRef.current !== null) {
      window.clearTimeout(deleteTimerRef.current);

      deleteTimerRef.current = null;
    }
  }

  function isSameView(pending: PendingDelete) {
    const currentView = currentViewRef.current;

    return (
      currentView.filter === pending.filter &&
      currentView.search === pending.search &&
      currentView.page === pending.page
    );
  }

  function restoreDeletedTask(
    pending: PendingDelete,
  ) {
    setTasks((currentTasks) => {
      const alreadyExists = currentTasks.some(
        (item) => item.id === pending.task.id,
      );

      if (alreadyExists) {
        return currentTasks;
      }

      const nextTasks = [...currentTasks];

      const insertIndex = Math.min(
        pending.index,
        nextTasks.length,
      );

      nextTasks.splice(
        insertIndex,
        0,
        pending.task,
      );

      return nextTasks;
    });
  }

  async function refreshTasksAndStats() {
    await Promise.all([
      loadTasks(),
      loadStats(),
    ]);
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
    const nextStatus =
      task.status === "done" ? "open" : "done";

    setBusyId(task.id);
    setPageError(null);

    /*
     * Optimistic update:
     * сначала меняем UI, потом отправляем API.
     */
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: nextStatus,
            }
          : item,
      ),
    );

    try {
      await updateTask(task.id, {
        status: nextStatus,
      });

      await loadStats();

      if (
        filter !== "all" &&
        nextStatus !== filter
      ) {
        window.setTimeout(() => {
          setTasks((currentTasks) =>
            currentTasks.filter(
              (item) => item.id !== task.id,
            ),
          );
        }, 550);
      }
    } catch (err) {
      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === task.id ? task : item,
        ),
      );

      setPageError(
        err instanceof Error
          ? err.message
          : "Не удалось обновить задачу",
      );
    } finally {
      setBusyId(null);
    }
  }

  /*
   * Настоящее удаление на сервере.
   *
   * Эта функция вызывается только тогда,
   * когда время на "Отменить" закончилось.
   */
  async function persistDelete(
    pending: PendingDelete,
  ) {
    try {
      await deleteTask(pending.task.id);

      hiddenTaskIdsRef.current.delete(
        pending.task.id,
      );

      await loadStats();

      /*
       * Если удалили последнюю задачу
       * не на первой странице —
       * переходим на предыдущую.
       */
      if (
        pending.wasOnlyTaskOnPage &&
        isSameView(pending) &&
        pending.page > 0
      ) {
        setPage((currentPage) =>
          currentPage === pending.page
            ? currentPage - 1
            : currentPage,
        );

        return;
      }

      /*
       * Тихо синхронизируем текущую страницу.
       * Skeleton не показываем.
       */
      await loadTasksRef.current?.(false);
    } catch (err) {
      /*
       * DELETE не удался —
       * задача на сервере всё ещё существует.
       */
      hiddenTaskIdsRef.current.delete(
        pending.task.id,
      );

      if (isSameView(pending)) {
        restoreDeletedTask(pending);
      } else {
        await loadTasksRef.current?.(false);
      }

      setPageError(
        err instanceof Error
          ? err.message
          : "Не удалось удалить задачу",
      );
    }
  }

  function handleDelete(task: Task) {
    setPageError(null);

    /*
     * Если предыдущий toast ещё открыт,
     * завершаем предыдущее удаление
     * и показываем новый toast.
     */
    const previousPending =
      pendingDeleteRef.current;

    if (previousPending) {
      clearDeleteTimer();

      pendingDeleteRef.current = null;

      setPendingDelete(null);

      void persistDelete(previousPending);
    }

    const taskIndex = tasks.findIndex(
      (item) => item.id === task.id,
    );

    const pending: PendingDelete = {
      task,
      index:
        taskIndex >= 0
          ? taskIndex
          : tasks.length,
      filter,
      search: debouncedSearch,
      page,
      wasOnlyTaskOnPage:
        tasks.length === 1 && page > 0,
    };

    /*
     * Скрываем карточку сразу.
     */
    hiddenTaskIdsRef.current.add(task.id);

    setTasks((currentTasks) =>
      currentTasks.filter(
        (item) => item.id !== task.id,
      ),
    );

    pendingDeleteRef.current = pending;

    setPendingDelete(pending);

    /*
     * Через 5 секунд отмена больше недоступна
     * и отправляется настоящий DELETE.
     */
    deleteTimerRef.current = window.setTimeout(
      () => {
        const currentPending =
          pendingDeleteRef.current;

        if (
          !currentPending ||
          currentPending.task.id !== task.id
        ) {
          return;
        }

        pendingDeleteRef.current = null;
        deleteTimerRef.current = null;

        setPendingDelete(null);

        void persistDelete(currentPending);
      },
      DELETE_UNDO_MS,
    );
  }

  function handleUndoDelete() {
    const pending = pendingDeleteRef.current;

    if (!pending) {
      return;
    }

    clearDeleteTimer();

    pendingDeleteRef.current = null;

    hiddenTaskIdsRef.current.delete(
      pending.task.id,
    );

    setPendingDelete(null);

    /*
     * Если пользователь всё ещё находится
     * на той же странице — возвращаем карточку
     * мгновенно на старое место.
     */
    if (isSameView(pending)) {
      restoreDeletedTask(pending);

      return;
    }

    /*
     * Если за эти 5 секунд поменялся
     * фильтр, поиск или страница —
     * тихо загружаем актуальный список.
     */
    void loadTasks(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            т
          </span>
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
            <p className="eyebrow">
              Твои задачи
            </p>

            <p className="dashboard__subtext">
              {stats
                ? `Открытых задач: ${stats.open}.`
                : "Загружаем статистику…"}
            </p>
          </div>

          <button
            className="button button--primary"
            type="button"
            onClick={() =>
              setModalTask(null)
            }
          >
            <span aria-hidden="true">
              ＋
            </span>{" "}
            Новая задача
          </button>
        </div>

        <div
          className="task-stats"
          aria-label="Статистика задач"
        >
          <article className="stat-card">
            <span className="stat-card__label">
              Всего
            </span>

            <strong>
              {stats?.total ?? "—"}
            </strong>
          </article>

          <article className="stat-card">
            <span className="stat-card__label">
              Открыто
            </span>

            <strong>
              {stats?.open ?? "—"}
            </strong>
          </article>

          <article className="stat-card">
            <span className="stat-card__label">
              Выполнено
            </span>

            <strong>
              {stats?.done ?? "—"}
            </strong>
          </article>

          <article className="stat-card stat-card--danger">
            <span className="stat-card__label">
              Просрочено
            </span>

            <strong>
              {stats?.overdue ?? "—"}
            </strong>
          </article>
        </div>

        {statsError && (
          <p className="stats-error">
            {statsError}
          </p>
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
              <circle
                cx="11"
                cy="11"
                r="8"
              />

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
              changeSearch(
                event.target.value,
              )
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
            {(
              [
                "all",
                "open",
                "done",
              ] as Filter[]
            ).map((item) => (
              <button
                className={
                  selectedFilter === item
                    ? "segmented__item segmented__item--active"
                    : "segmented__item"
                }
                type="button"
                key={item}
                onClick={() =>
                  changeFilter(item)
                }
              >
                {item === "all"
                  ? "Все"
                  : item === "open"
                    ? "Открытые"
                    : "Выполненные"}
              </button>
            ))}
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
              onClick={() =>
                void loadTasks()
              }
            >
              Повторить
            </button>
          </div>
        )}

        <div
          className={`task-results ${
            isFilterTransitioning
              ? "task-results--changing"
              : ""
          }`}
        >
          {isLoading ? (
            <div
              className="task-list"
              aria-label="Загрузка задач"
            >
              {Array.from({
                length: 4,
              }).map((_, index) => (
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
                  busy={
                    busyId === task.id
                  }
                  onToggle={(item) =>
                    void handleToggle(item)
                  }
                  onEdit={(item) =>
                    setModalTask(item)
                  }
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state__mark">
                ✓
              </span>

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
                  onClick={() =>
                    setModalTask(null)
                  }
                >
                  Создать задачу
                </button>
              )}
            </div>
          )}
        </div>

        <div className="pagination">
          <button
            className="button button--ghost"
            type="button"
            disabled={
              page === 0 ||
              isLoading ||
              isFilterTransitioning
            }
            onClick={() =>
              setPage((current) =>
                Math.max(
                  0,
                  current - 1,
                ),
              )
            }
          >
            ← Назад
          </button>

          <button
            className="button button--ghost"
            type="button"
            disabled={
              tasks.length < PAGE_SIZE ||
              isLoading ||
              isFilterTransitioning
            }
            onClick={() =>
              setPage(
                (current) =>
                  current + 1,
              )
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
          onClose={() =>
            setModalTask(undefined)
          }
          onSubmit={handleSave}
        />
      )}

      {pendingDelete && (
        <UndoToast
          key={pendingDelete.task.id}
          taskTitle={
            pendingDelete.task.title
          }
          onUndo={handleUndoDelete}
        />
      )}
    </main>
  );
}
