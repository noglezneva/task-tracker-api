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
