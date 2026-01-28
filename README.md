# Task Tracker API

Простой REST API для трекинга задач, созданный на **FastAPI**, **SQLAlchemy 2.0**, **Alembic** и **PostgreSQL**.  
Аутентификация использует JWT (через `python-jose`), а хеширование паролей — через `passlib[bcrypt]`.

## Возможности

- **Аутентификация**
  - **POST `/auth/register`** — регистрация нового пользователя, возвращает токен доступа (JWT)
  - **POST `/auth/login`** — вход по email/паролю, возвращает токен доступа (JWT)
- **Задачи** (нужен JWT)
  - **POST `/tasks`** — создать задачу для текущего пользователя
  - **GET `/tasks?status=open|done&limit=20&offset=0`** — список задач для текущего пользователя
  - **GET `/tasks/{id}`** — получить одну задачу (только владелец)
  - **PATCH `/tasks/{id}`** — частичное обновление
  - **DELETE `/tasks/{id}`** — удалить задачу

## Технологический стек

- FastAPI
- SQLAlchemy 2.0
- Alembic
- PostgreSQL
- Pydantic v2
- python-jose (JWT)
- passlib[bcrypt]
- pytest + httpx
