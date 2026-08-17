from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient


def _get_auth_header(client: TestClient, email: str) -> dict[str, str]:
    resp = client.post(
        "/auth/register", json={"email": email, "password": "strongpassword"}
    )
    assert resp.status_code in (200, 201)
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_tasks(client: TestClient) -> None:
    headers = _get_auth_header(client, "tasks@example.com")

    # Create task
    resp = client.post(
        "/tasks",
        json={"title": "Test Task", "description": "desc", "priority": 2},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    created = resp.json()

    # List tasks
    resp = client.get("/tasks", headers=headers)
    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert any(t["id"] == created["id"] for t in items)


def test_cannot_access_another_users_task(client: TestClient) -> None:
    headers_user1 = _get_auth_header(client, "user1@example.com")
    headers_user2 = _get_auth_header(client, "user2@example.com")

    # User1 creates task
    resp = client.post("/tasks", json={"title": "Private Task"}, headers=headers_user1)
    assert resp.status_code == 201
    task_id = resp.json()["id"]

    # User2 tries to fetch it
    resp = client.get(f"/tasks/{task_id}", headers=headers_user2)
    assert resp.status_code == 404


def test_cannot_create_task_with_empty_title(client: TestClient) -> None:
    headers = _get_auth_header(client, "validation@example.com")

    resp = client.post(
        "/tasks",
        json={"title": ""},
        headers=headers,
    )

    assert resp.status_code == 422


def test_cannot_update_task_with_empty_title(client: TestClient) -> None:
    headers = _get_auth_header(client, "update-validation@example.com")

    create_resp = client.post(
        "/tasks",
        json={"title": "Original title"},
        headers=headers,
    )
    assert create_resp.status_code == 201

    task_id = create_resp.json()["id"]

    update_resp = client.patch(
        f"/tasks/{task_id}",
        json={"title": ""},
        headers=headers,
    )

    assert update_resp.status_code == 422


def test_search_tasks_by_title(client: TestClient) -> None:
    headers = _get_auth_header(client, "search@example.com")

    client.post(
        "/tasks",
        json={"title": "Learn FastAPI"},
        headers=headers,
    )
    client.post(
        "/tasks",
        json={"title": "Learn Django"},
        headers=headers,
    )

    resp = client.get(
        "/tasks?search=fastapi",
        headers=headers,
    )

    assert resp.status_code == 200

    tasks = resp.json()

    assert len(tasks) == 1
    assert tasks[0]["title"] == "Learn FastAPI"


def test_sort_tasks_by_priority(client: TestClient) -> None:
    headers = _get_auth_header(client, "sorting@example.com")

    client.post(
        "/tasks",
        json={"title": "Low priority", "priority": 1},
        headers=headers,
    )
    client.post(
        "/tasks",
        json={"title": "High priority", "priority": 3},
        headers=headers,
    )
    client.post(
        "/tasks",
        json={"title": "Medium priority", "priority": 2},
        headers=headers,
    )

    resp = client.get(
        "/tasks?sort_by=priority&order=desc",
        headers=headers,
    )

    assert resp.status_code == 200

    tasks = resp.json()

    assert [task["priority"] for task in tasks] == [3, 2, 1]


def test_rejects_invalid_sort_field(client: TestClient) -> None:
    headers = _get_auth_header(client, "invalid-sorting@example.com")

    resp = client.get(
        "/tasks?sort_by=unknown",
        headers=headers,
    )

    assert resp.status_code == 422


def test_filter_tasks_by_priority(client: TestClient) -> None:
    headers = _get_auth_header(client, "priority-filter@example.com")

    client.post(
        "/tasks",
        json={"title": "Low priority", "priority": 1},
        headers=headers,
    )
    client.post(
        "/tasks",
        json={"title": "Medium priority", "priority": 2},
        headers=headers,
    )
    client.post(
        "/tasks",
        json={"title": "High priority", "priority": 3},
        headers=headers,
    )

    resp = client.get(
        "/tasks?priority=2",
        headers=headers,
    )

    assert resp.status_code == 200

    tasks = resp.json()

    assert len(tasks) == 1
    assert tasks[0]["title"] == "Medium priority"
    assert tasks[0]["priority"] == 2


@pytest.mark.parametrize("priority", [0, 4])
def test_rejects_invalid_priority_filter(
    client: TestClient,
    priority: int,
) -> None:
    headers = _get_auth_header(
        client,
        f"invalid-priority-{priority}@example.com",
    )

    resp = client.get(
        f"/tasks?priority={priority}",
        headers=headers,
    )

    assert resp.status_code == 422


def test_cannot_create_task_with_invalid_priority(client: TestClient) -> None:
    headers = _get_auth_header(client, "invalid-create-priority@example.com")

    resp = client.post(
        "/tasks",
        json={"title": "Invalid priority", "priority": 4},
        headers=headers,
    )

    assert resp.status_code == 422


def test_cannot_update_task_with_invalid_priority(client: TestClient) -> None:
    headers = _get_auth_header(client, "invalid-update-priority@example.com")

    create_resp = client.post(
        "/tasks",
        json={"title": "Test task", "priority": 1},
        headers=headers,
    )
    assert create_resp.status_code == 201

    task_id = create_resp.json()["id"]

    update_resp = client.patch(
        f"/tasks/{task_id}",
        json={"priority": 4},
        headers=headers,
    )

    assert update_resp.status_code == 422


def test_task_stats_empty(client: TestClient) -> None:
    headers = _get_auth_header(client, "empty-stats@example.com")

    resp = client.get("/tasks/stats", headers=headers)

    assert resp.status_code == 200
    assert resp.json() == {
        "total": 0,
        "open": 0,
        "done": 0,
        "overdue": 0,
    }


def test_task_stats(client: TestClient) -> None:
    headers = _get_auth_header(client, "stats@example.com")
    other_headers = _get_auth_header(client, "stats-other@example.com")

    today = datetime.now(timezone.utc).date()
    overdue_date = (today - timedelta(days=1)).isoformat()
    future_date = (today + timedelta(days=1)).isoformat()

    overdue_resp = client.post(
        "/tasks",
        json={"title": "Overdue task", "due_date": overdue_date},
        headers=headers,
    )
    assert overdue_resp.status_code == 201

    future_resp = client.post(
        "/tasks",
        json={"title": "Future task", "due_date": future_date},
        headers=headers,
    )
    assert future_resp.status_code == 201

    done_resp = client.post(
        "/tasks",
        json={"title": "Done task", "due_date": overdue_date},
        headers=headers,
    )
    assert done_resp.status_code == 201

    update_resp = client.patch(
        f"/tasks/{done_resp.json()['id']}",
        json={"status": "done"},
        headers=headers,
    )
    assert update_resp.status_code == 200

    other_resp = client.post(
        "/tasks",
        json={"title": "Another user's task", "due_date": overdue_date},
        headers=other_headers,
    )
    assert other_resp.status_code == 201

    resp = client.get("/tasks/stats", headers=headers)

    assert resp.status_code == 200
    assert resp.json() == {
        "total": 3,
        "open": 2,
        "done": 1,
        "overdue": 1,
    }
