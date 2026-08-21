import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import "./DatePicker.css";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

interface PopoverPosition {
  top: number;
  left: number;
  ready: boolean;
}

const WEEK_DAYS = [
  "Пн",
  "Вт",
  "Ср",
  "Чт",
  "Пт",
  "Сб",
  "Вс",
];

const POPOVER_GAP = 8;
const VIEWPORT_MARGIN = 12;

const dateFormatter = new Intl.DateTimeFormat(
  "ru-RU",
  {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
);

const monthFormatter = new Intl.DateTimeFormat(
  "ru-RU",
  {
    month: "long",
    year: "numeric",
  },
);

function parseDateValue(
  value: string,
): Date | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    year,
    month - 1,
    day,
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDateValue(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  );
}

function isSameDay(
  first: Date,
  second: Date,
): boolean {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function capitalize(value: string): string {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function getCalendarDays(
  month: Date,
): Date[] {
  const year = month.getFullYear();

  const monthIndex =
    month.getMonth();

  const firstDay = new Date(
    year,
    monthIndex,
    1,
  );

  /*
   * В JavaScript:
   * 0 = воскресенье
   * 1 = понедельник
   *
   * Нам нужен календарь,
   * который начинается с понедельника.
   */
  const mondayOffset =
    (firstDay.getDay() + 6) % 7;

  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        year,
        monthIndex,
        1 - mondayOffset + index,
      ),
  );
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  onOpenChange,
}: DatePickerProps) {
  const selectedDate =
    parseDateValue(value);

  const [isOpen, setIsOpen] =
    useState(false);

  const [visibleMonth, setVisibleMonth] =
    useState(() =>
      startOfMonth(
        selectedDate ?? new Date(),
      ),
    );

  const [
    popoverPosition,
    setPopoverPosition,
  ] = useState<PopoverPosition>({
    top: 0,
    left: 0,
    ready: false,
  });

  const rootRef =
    useRef<HTMLDivElement | null>(null);

  const triggerRef =
    useRef<HTMLButtonElement | null>(null);

  const popoverRef =
    useRef<HTMLDivElement | null>(null);

  const calendarDays = useMemo(
    () =>
      getCalendarDays(
        visibleMonth,
      ),
    [visibleMonth],
  );

  const today = new Date();

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  /*
   * Вычисляем положение календаря
   * относительно кнопки.
   *
   * Так как календарь находится
   * в document.body, overflow модалки
   * на него больше не влияет.
   */
  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePosition() {
      const trigger =
        triggerRef.current;

      const popover =
        popoverRef.current;

      if (!trigger || !popover) {
        return;
      }

      const triggerRect =
        trigger.getBoundingClientRect();

      const popoverRect =
        popover.getBoundingClientRect();

      /*
       * По умолчанию выравниваем
       * календарь по правому краю поля.
       */
      let left =
        triggerRect.right -
        popoverRect.width;

      /*
       * Не позволяем ему выйти
       * за левый край экрана.
       */
      left = Math.max(
        VIEWPORT_MARGIN,
        left,
      );

      /*
       * Не позволяем выйти
       * за правый край.
       */
      left = Math.min(
        left,
        window.innerWidth -
          popoverRect.width -
          VIEWPORT_MARGIN,
      );

      /*
       * Сначала пытаемся открыть вниз.
       */
      let top =
        triggerRect.bottom +
        POPOVER_GAP;

      const fitsBelow =
        top + popoverRect.height <=
        window.innerHeight -
          VIEWPORT_MARGIN;

      const topAbove =
        triggerRect.top -
        POPOVER_GAP -
        popoverRect.height;

      const fitsAbove =
        topAbove >=
        VIEWPORT_MARGIN;

      /*
       * Если снизу места мало,
       * но сверху хватает —
       * открываем календарь вверх.
       */
      if (!fitsBelow && fitsAbove) {
        top = topAbove;
      } else {
        /*
         * В крайнем случае просто
         * удерживаем его внутри viewport.
         */
        top = Math.min(
          top,
          window.innerHeight -
            popoverRect.height -
            VIEWPORT_MARGIN,
        );

        top = Math.max(
          VIEWPORT_MARGIN,
          top,
        );
      }

      setPopoverPosition({
        top,
        left,
        ready: true,
      });
    }

    updatePosition();

    window.addEventListener(
      "resize",
      updatePosition,
    );

    /*
     * true нужен, чтобы ловить
     * прокрутку не только window,
     * но и модалки.
     */
    window.addEventListener(
      "scroll",
      updatePosition,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition,
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true,
      );
    };
  }, [isOpen]);

  /*
   * Закрываем календарь
   * при клике снаружи.
   *
   * Проверяем отдельно trigger
   * и portal, потому что popover
   * физически находится в body.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const clickedTrigger =
        rootRef.current?.contains(
          target,
        );

      const clickedPopover =
        popoverRef.current?.contains(
          target,
        );

      if (
        !clickedTrigger &&
        !clickedPopover
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener(
      "pointerdown",
      handlePointerDown,
      true,
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );
    };
  }, [isOpen]);

  /*
   * Escape закрывает календарь.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        event.preventDefault();

        setIsOpen(false);
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
  }, [isOpen]);

  /*
   * Если форма перешла
   * в состояние сохранения —
   * закрываем календарь.
   */
  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  function openCalendar() {
    setVisibleMonth(
      startOfMonth(
        selectedDate ?? new Date(),
      ),
    );

    /*
     * Пока координаты не пересчитаны,
     * portal скрыт.
     */
    setPopoverPosition((current) => ({
      ...current,
      ready: false,
    }));

    setIsOpen(true);
  }

  function toggleCalendar() {
    if (disabled) {
      return;
    }

    if (isOpen) {
      setIsOpen(false);

      return;
    }

    openCalendar();
  }

  function changeMonth(offset: number) {
    setVisibleMonth(
      (currentMonth) =>
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() +
            offset,
          1,
        ),
    );
  }

  function selectDate(date: Date) {
    onChange(
      toDateValue(date),
    );

    setVisibleMonth(
      startOfMonth(date),
    );

    setIsOpen(false);
  }

  function selectToday() {
    const currentToday =
      new Date();

    onChange(
      toDateValue(
        currentToday,
      ),
    );

    setVisibleMonth(
      startOfMonth(
        currentToday,
      ),
    );

    setIsOpen(false);
  }

  function clearDate() {
    onChange("");

    setVisibleMonth(
      startOfMonth(
        new Date(),
      ),
    );

    setIsOpen(false);
  }

  const monthTitle = capitalize(
    monthFormatter
      .format(visibleMonth)
      .replace(" г.", ""),
  );

  const triggerLabel =
    selectedDate
      ? dateFormatter.format(
          selectedDate,
        )
      : "Выбрать дату";

  const calendar = isOpen
    ? createPortal(
        <div
          ref={popoverRef}
          className={`date-picker__popover ${
            popoverPosition.ready
              ? "date-picker__popover--ready"
              : ""
          }`}
          style={{
            top: popoverPosition.top,
            left: popoverPosition.left,
          }}
          role="dialog"
          aria-label="Выбор даты"
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >
          <div className="date-picker__header">
            <button
              className="date-picker__nav"
              type="button"
              aria-label="Предыдущий месяц"
              onClick={() =>
                changeMonth(-1)
              }
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <strong className="date-picker__month">
              {monthTitle}
            </strong>

            <button
              className="date-picker__nav"
              type="button"
              aria-label="Следующий месяц"
              onClick={() =>
                changeMonth(1)
              }
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div
            className="date-picker__weekdays"
            aria-hidden="true"
          >
            {WEEK_DAYS.map(
              (day) => (
                <span key={day}>
                  {day}
                </span>
              ),
            )}
          </div>

          <div className="date-picker__days">
            {calendarDays.map(
              (date) => {
                const dateValue =
                  toDateValue(
                    date,
                  );

                const isCurrentMonth =
                  date.getMonth() ===
                    visibleMonth.getMonth() &&
                  date.getFullYear() ===
                    visibleMonth.getFullYear();

                const isSelected =
                  selectedDate
                    ? isSameDay(
                        date,
                        selectedDate,
                      )
                    : false;

                const isToday =
                  isSameDay(
                    date,
                    today,
                  );

                const classes = [
                  "date-picker__day",

                  !isCurrentMonth
                    ? "date-picker__day--outside"
                    : "",

                  isToday
                    ? "date-picker__day--today"
                    : "",

                  isSelected
                    ? "date-picker__day--selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    className={
                      classes
                    }
                    type="button"
                    key={dateValue}
                    aria-label={dateFormatter.format(
                      date,
                    )}
                    aria-current={
                      isToday
                        ? "date"
                        : undefined
                    }
                    aria-pressed={
                      isSelected
                    }
                    onClick={() =>
                      selectDate(
                        date,
                      )
                    }
                  >
                    {date.getDate()}
                  </button>
                );
              },
            )}
          </div>

          <div className="date-picker__footer">
            <button
              className="date-picker__footer-button"
              type="button"
              disabled={!value}
              onClick={
                clearDate
              }
            >
              Очистить
            </button>

            <button
              className="date-picker__footer-button date-picker__footer-button--today"
              type="button"
              onClick={
                selectToday
              }
            >
              Сегодня
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div
        className="date-picker"
        ref={rootRef}
      >
        <button
          ref={triggerRef}
          className={`date-picker__trigger ${
            isOpen
              ? "date-picker__trigger--open"
              : ""
          }`}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={toggleCalendar}
        >
          <span
            className="date-picker__calendar-icon"
            aria-hidden="true"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="16"
                rx="2"
              />

              <path d="M16 3v4" />
              <path d="M8 3v4" />
              <path d="M3 10h18" />
            </svg>
          </span>

          <span
            className={
              selectedDate
                ? "date-picker__value"
                : "date-picker__placeholder"
            }
          >
            {triggerLabel}
          </span>

          <span
            className={`date-picker__chevron ${
              isOpen
                ? "date-picker__chevron--open"
                : ""
            }`}
            aria-hidden="true"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      {calendar}
    </>
  );
}