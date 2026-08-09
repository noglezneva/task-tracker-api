from fastapi.testclient import TestClient


def test_register_and_login_returns_token(client: TestClient) -> None:
    # Register
    resp = client.post(
        "/auth/register",
        json={"email": "user@example.com", "password": "strongpassword"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert "access_token" in data

    # Login
    resp = client.post(
        "/auth/login",
        data={"username": "user@example.com", "password": "strongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
