# Task Tracker Frontend

Клиентская часть приложения **Task Tracker**, разработанная на **React + TypeScript**.

Frontend работает с FastAPI REST API и позволяет пользователю регистрироваться, авторизовываться и управлять своими задачами.

## Возможности

- регистрация и вход с JWT;
- просмотр списка задач;
- создание, редактирование и удаление задач;
- изменение статуса задачи;
- фильтрация;
- пагинация;
- обработка загрузки и ошибок;
- адаптивный интерфейс.

## Стек

- React
- TypeScript
- Vite
- React Router
- REST API
- CSS

## Локальный запуск

Сначала запусти backend из корня проекта:

```bash
docker compose up --build
```

Затем запусти frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен по адресу:

```text
http://localhost:5173
```

Backend:

```text
http://127.0.0.1:8081
```

Swagger:

```text
http://127.0.0.1:8081/docs
```

## Взаимодействие с API

В режиме разработки запросы отправляются через Vite proxy:

```text
/api/tasks → http://127.0.0.1:8081/tasks
```

Поэтому для локальной разработки отдельная настройка CORS не требуется.

Для production адрес API можно указать через:

```env
VITE_API_URL=https://your-api.example.com
```

## Backend

Backend реализован на FastAPI, SQLAlchemy и PostgreSQL.

Подробное описание API и backend находится в корневом `README.md`.
