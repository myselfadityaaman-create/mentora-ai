import os
import uuid
import pytest
from bson import ObjectId
from starlette.testclient import TestClient

# Use isolated test database and test secret
os.environ["DATABASE_NAME"] = "mentora_ai_test"
os.environ["JWT_SECRET_KEY"] = "test_jwt_secret_key_for_testing_1234567890_abcdefghij"
os.environ["MONGO_URL"] = "mongodb://127.0.0.1:27017"
os.environ["AI_API_KEY"] = ""
os.environ["AI_MODEL"] = "gemini-3.8-flash"

from main import (
    app, client, db, quizzes_collection, documents_collection,
    document_chunks_collection, learning_paths_collection,
    student_performance_collection, flashcards_collection,
    flashcard_reviews_collection, classes_collection,
    assignments_collection, submissions_collection,
    system_logs_collection, platform_settings_collection,
    achievements_collection
)
import main
main.AI_API_KEY = ""
main.AI_MODEL = "gemini-3.8-flash"

test_client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    yield
    # Cleanup test database after all tests complete
    client.drop_database("mentora_ai_test")


def test_health():
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_db_health():
    response = test_client.get("/db-health")
    assert response.status_code == 200
    assert response.json()["status"] == "connected"


def test_registration_validation():
    # Password too short (< 8 chars)
    response = test_client.post(
        "/register",
        json={"name": "Alice", "email": "alice@test.com", "password": "short"},
    )
    assert response.status_code == 422

    # Invalid email
    response = test_client.post(
        "/register",
        json={"name": "Alice", "email": "not-an-email", "password": "password123"},
    )
    assert response.status_code == 422


def test_user_registration_and_login():
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword123!"

    # 1. Register
    reg_resp = test_client.post(
        "/register",
        json={"name": "Test Learner", "email": unique_email, "password": password},
    )
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()["user"]
    assert user_data["email"] == unique_email
    assert user_data["name"] == "Test Learner"
    assert "password" not in user_data
    assert "password_hash" not in user_data

    # 2. Reject duplicate email
    dup_resp = test_client.post(
        "/register",
        json={"name": "Test Learner", "email": unique_email, "password": password},
    )
    assert dup_resp.status_code == 409

    # 3. Login with wrong password
    wrong_login = test_client.post(
        "/login",
        json={"email": unique_email, "password": "WrongPassword!"},
    )
    assert wrong_login.status_code == 401

    # 4. Login with correct password
    login_resp = test_client.post(
        "/login",
        json={"email": unique_email, "password": password},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    token = login_data["access_token"]

    # 5. Access /me protected endpoint
    me_resp = test_client.get(
        "/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["email"] == unique_email

    # 6. Unauthenticated request to /me
    unauth_resp = test_client.get("/me")
    assert unauth_resp.status_code == 401


def test_profile_update():
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post(
        "/register",
        json={"name": "Old Name", "email": unique_email, "password": "Password123!"},
    )
    login_resp = test_client.post(
        "/login",
        json={"email": unique_email, "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]

    # Update profile
    put_resp = test_client.put(
        "/me",
        json={"name": "New Name", "preferred_language": "Hindi"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["user"]["name"] == "New Name"
    assert put_resp.json()["user"]["preferred_language"] == "Hindi"


def test_conversations_and_privacy():
    email1 = f"user1_{uuid.uuid4().hex[:8]}@example.com"
    email2 = f"user2_{uuid.uuid4().hex[:8]}@example.com"

    test_client.post("/register", json={"name": "User 1", "email": email1, "password": "Password123!"})
    test_client.post("/register", json={"name": "User 2", "email": email2, "password": "Password123!"})

    token1 = test_client.post("/login", json={"email": email1, "password": "Password123!"}).json()["access_token"]
    token2 = test_client.post("/login", json={"email": email2, "password": "Password123!"}).json()["access_token"]

    # User 1 creates conversation
    create_resp = test_client.post(
        "/conversations",
        json={"title": "Computer Science Basics", "subject": "Computer Science"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert create_resp.status_code == 201
    convo_id = create_resp.json()["id"]

    # User 1 can view it
    convo_resp = test_client.get(
        f"/conversations/{convo_id}",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert convo_resp.status_code == 200
    assert convo_resp.json()["title"] == "Computer Science Basics"

    # User 2 CANNOT access User 1's conversation
    user2_resp = test_client.get(
        f"/conversations/{convo_id}",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert user2_resp.status_code == 404

    # User 2 CANNOT delete User 1's conversation
    user2_del = test_client.delete(
        f"/conversations/{convo_id}",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert user2_del.status_code == 404

    # User 1 deletes their conversation
    user1_del = test_client.delete(
        f"/conversations/{convo_id}",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert user1_del.status_code == 200


def test_chat_without_api_key_returns_graceful_message():
    email = f"chat_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Student", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Chat without API key should return educational setup message, not 500 error
    chat_resp = test_client.post(
        "/chat",
        json={"message": "What is Python?", "subject": "Computer Science", "language": "English"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "conversation_id" in data
    assert "Not Configured" in data["message"]["content"]


def test_ai_status_and_model_configuration():
    status_resp = test_client.get("/settings/ai-status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "configured" in status_data
    assert status_data["model"] == "gemini-3.8-flash"
    assert "supported_models" in status_data
    assert "gemini-3.8-flash" in status_data["supported_models"]
    assert "gemini-3.5-flash-lite" in status_data["supported_models"]


def test_ai_key_verification_fails_gracefully_with_invalid_key():
    email = f"ai_user_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "AI Tester", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Invalid key verification should return 400 with clear message, not crash or log the secret
    resp = test_client.post(
        "/settings/ai-key",
        json={"api_key": "AIzaSy_fake_test_key_for_testing_12345", "model": "gemini-3.8-flash"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert "Invalid Google Gemini API key" in detail or "insufficient permissions" in detail
    assert "AIzaSy_fake_test_key" not in detail  # Must not leak the secret in error detail


def test_ai_key_verification_retries_and_handles_503_transient_error(monkeypatch):
    from google.genai import errors
    email = f"ai_retry_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Retry Tester", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Simulate Google Gemini returning 503 UNAVAILABLE (high demand)
    call_count = 0

    class MockModels:
        def generate_content(self, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            raise errors.ServerError(503, {"error": {"message": "Model is experiencing high demand. Please try again later."}})

    class MockClient:
        def __init__(self, *args, **kwargs):
            self.models = MockModels()

    import google.genai
    monkeypatch.setattr(google.genai, "Client", MockClient)

    # Fast retries for testing
    import main
    orig_fn = main._execute_with_retry
    monkeypatch.setattr(main, "_execute_with_retry", lambda fn, max_retries=3, initial_delay=0.01: orig_fn(fn, max_retries=3, initial_delay=0.01))

    resp = test_client.post(
        "/settings/ai-key",
        json={"api_key": "AIzaSyValidLookingKeyWithLengthOverTenCharacters", "model": "gemini-3.8-flash"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verifies that it retried 3 times and then returned 503 with user-friendly message
    assert call_count == 3
    assert resp.status_code == 503
    assert "temporarily experiencing high demand" in resp.json()["detail"]

    # Key must NOT be verified if 503 failed
    status_resp = test_client.get("/settings/ai-status").json()
    assert status_resp["configured"] is False


def test_ai_key_verification_succeeds_when_provider_responds(monkeypatch):
    email = f"ai_success_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Success Tester", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Mock successful response from Gemini
    class MockResponse:
        text = "Hello!"

    class MockModels:
        def generate_content(self, *args, **kwargs):
            return MockResponse()

    class MockClient:
        def __init__(self, *args, **kwargs):
            self.models = MockModels()

    import google.genai
    monkeypatch.setattr(google.genai, "Client", MockClient)

    resp = test_client.post(
        "/settings/ai-key",
        json={"api_key": "AIzaSyValidTestedKey1234567890", "model": "gemini-3.5-flash-lite"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["configured"] is True
    assert resp.json()["model"] == "gemini-3.5-flash-lite"

    # Status must now report configured
    status = test_client.get("/settings/ai-status").json()
    assert status["configured"] is True
    assert status["model"] == "gemini-3.5-flash-lite"

    # Reset in-memory key after test
    import main
    main.AI_API_KEY = ""
    main.AI_MODEL = "gemini-3.8-flash"


def test_ai_key_service_disabled_diagnostic(monkeypatch):
    from google.genai import errors
    email = f"ai_srv_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Srv Tester", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    class MockModels:
        def generate_content(self, *args, **kwargs):
            err_dict = {
                "error": {
                    "code": 403,
                    "message": "Generative Language API has not been used in project before or it is disabled.",
                    "status": "PERMISSION_DENIED",
                    "details": [
                        {"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "SERVICE_DISABLED", "domain": "googleapis.com"}
                    ]
                }
            }
            raise errors.ClientError(403, err_dict)

    class MockClient:
        def __init__(self, *args, **kwargs):
            self.models = MockModels()

    import google.genai
    monkeypatch.setattr(google.genai, "Client", MockClient)

    resp = test_client.post(
        "/settings/ai-key",
        json={"api_key": "AIzaSyValidFormatKey1234567890", "model": "gemini-3.8-flash"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert "Generative Language API is disabled" in resp.json()["detail"]


def test_ai_key_restrictions_diagnostic(monkeypatch):
    from google.genai import errors
    email = f"ai_restr_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Restr Tester", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    class MockModels:
        def generate_content(self, *args, **kwargs):
            err_dict = {
                "error": {
                    "code": 403,
                    "message": "Requests from this HTTP referrer are blocked.",
                    "status": "PERMISSION_DENIED",
                    "details": [
                        {"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "API_KEY_HTTP_REFERRER_BLOCKED", "domain": "googleapis.com"}
                    ]
                }
            }
            raise errors.ClientError(403, err_dict)

    class MockClient:
        def __init__(self, *args, **kwargs):
            self.models = MockModels()

    import google.genai
    monkeypatch.setattr(google.genai, "Client", MockClient)

    resp = test_client.post(
        "/settings/ai-key",
        json={"api_key": "AIzaSyValidFormatKey1234567890", "model": "gemini-3.8-flash"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert "application restrictions" in resp.json()["detail"]


def test_ai_key_sanitization_and_masking(monkeypatch):
    class MockResponse:
        text = "Hi"

    class MockModels:
        def generate_content(self, *args, **kwargs):
            return MockResponse()

    class MockClient:
        def __init__(self, *args, **kwargs):
            # Verify that passed api_key had quotes and prefix stripped
            assert kwargs.get("api_key") == "AIzaSyRealCleanedKey12345678"
            self.models = MockModels()

    import google.genai
    monkeypatch.setattr(google.genai, "Client", MockClient)

    email = f"ai_clean_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Clean Tester", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Post key with quotes and AI_API_KEY= prefix
    resp = test_client.post(
        "/settings/ai-key",
        json={"api_key": 'AI_API_KEY="AIzaSyRealCleanedKey12345678"', "model": "gemini-3.8-flash"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["masked_key"] == "AIza...5678"
    assert "AIzaSyRealCleanedKey12345678" not in resp.text

    # Verify status
    status_resp = test_client.get("/settings/ai-status").json()
    assert status_resp["configured"] is True
    assert status_resp["masked_key"] == "AIza...5678"

    # Reset
    import main
    main.AI_API_KEY = ""
    main.AI_MODEL = "gemini-3.8-flash"


def test_quiz_submit_and_scoring():
    from datetime import datetime, timezone
    email = f"quiz_{uuid.uuid4().hex[:8]}@example.com"
    reg = test_client.post("/register", json={"name": "Quiz Taker", "email": email, "password": "Password123!"}).json()
    user_id = reg["user"]["id"]
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Directly insert a test quiz into DB to test submission & scoring
    test_quiz_doc = {
        "user_id": user_id,
        "subject": "Physics",
        "topic": "Gravity",
        "language": "English",
        "title": "Quiz: Gravity",
        "questions": [
            {
                "question": "What is the acceleration due to gravity on Earth?",
                "options": ["9.8 m/s²", "5.0 m/s²", "12.2 m/s²", "1.6 m/s²"],
                "correct_index": 0,
                "explanation": "Standard gravity is approx 9.8 m/s²."
            },
            {
                "question": "Who formulated the law of universal gravitation?",
                "options": ["Albert Einstein", "Isaac Newton", "Galileo Galilei", "Nikola Tesla"],
                "correct_index": 1,
                "explanation": "Sir Isaac Newton formulated the law."
            }
        ],
        "num_questions": 2,
        "score": None,
        "answers": None,
        "completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    inserted = quizzes_collection.insert_one(test_quiz_doc)
    quiz_id = str(inserted.inserted_id)

    # Submit 1 correct, 1 wrong answer (answers = [0, 0])
    submit_resp = test_client.post(
        f"/quizzes/{quiz_id}/submit",
        json={"quiz_id": quiz_id, "answers": [0, 0]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert submit_resp.status_code == 200
    res = submit_resp.json()
    assert res["score"] == 50
    assert res["correct"] == 1
    assert res["total"] == 2
    assert res["results"][0]["is_correct"] is True
    assert res["results"][1]["is_correct"] is False

    # Second submit should fail (already completed)
    second_sub = test_client.post(
        f"/quizzes/{quiz_id}/submit",
        json={"quiz_id": quiz_id, "answers": [0, 1]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert second_sub.status_code == 400


def test_progress_tracking():
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Student", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    prog_resp = test_client.get("/progress", headers={"Authorization": f"Bearer {token}"})
    assert prog_resp.status_code == 200
    data = prog_resp.json()
    assert "total_conversations" in data
    assert "total_quizzes" in data
    assert "average_quiz_score" in data


# --------------------------------------------------
# PHASE 2: RAG & DOCUMENT LEARNING TESTS
# --------------------------------------------------

def test_document_upload_validation():
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Doc Tester", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Reject unsupported file extension
    bad_file = ("script.exe", b"binary content", "application/octet-stream")
    resp = test_client.post(
        "/documents/upload",
        files={"file": bad_file},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    assert "Unsupported file format" in resp.json()["detail"]

    # Reject empty file
    empty_file = ("empty.txt", b"", "text/plain")
    resp_empty = test_client.post(
        "/documents/upload",
        files={"file": empty_file},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_empty.status_code == 400
    assert "empty" in resp_empty.json()["detail"].lower()


def test_document_upload_text_and_chunking():
    email = f"rag_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "RAG Learner", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    content = (
        "Quantum mechanics is a fundamental theory in physics that provides a description of the physical "
        "properties of nature at the scale of atoms and subatomic particles.\n\n"
        "Wave-particle duality is the concept that every particle or quantum entity may be described as either a "
        "particle or a wave. It expresses the inability of classical concepts like particle or wave to fully describe "
        "the behavior of quantum-scale objects.\n\n"
        "Quantum superposition is a fundamental principle of quantum mechanics. It states that, much like waves in "
        "classical physics, any two (or more) quantum states can be added together ('superposed') and the result will "
        "be another valid quantum state; and conversely, that every quantum state can be represented as a sum of two "
        "or more other distinct states."
    ).encode("utf-8")

    file_payload = ("quantum_physics.txt", content, "text/plain")
    upload_resp = test_client.post(
        "/documents/upload",
        files={"file": file_payload},
        data={"title": "Introduction to Quantum Physics", "subject": "Physics"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert upload_resp.status_code == 201
    doc_data = upload_resp.json()["document"]
    doc_id = doc_data["id"]

    assert doc_data["title"] == "Introduction to Quantum Physics"
    assert doc_data["file_type"] == "txt"
    assert doc_data["chunk_count"] >= 1
    assert doc_data["summary"] != ""
    assert isinstance(doc_data["key_concepts"], list)
    assert len(doc_data["key_concepts"]) > 0

    # Verify chunks stored in MongoDB
    chunks = list(document_chunks_collection.find({"document_id": doc_id}))
    assert len(chunks) == doc_data["chunk_count"]
    for c in chunks:
        assert "embedding" in c
        assert len(c["embedding"]) > 0
        assert "content" in c

    # Verify progress reflects document
    prog = test_client.get("/progress", headers={"Authorization": f"Bearer {token}"}).json()
    assert prog["total_documents"] >= 1


def test_document_upload_pdf():
    import io
    from pypdf import PdfWriter

    email = f"pdf_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "PDF Student", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Synthesize a multi-page PDF in memory using pypdf
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    # Write page 1 text
    page1_text = (
        "Cellular respiration is a set of metabolic reactions that take place in the cells of organisms to convert "
        "biochemical energy from nutrients into adenosine triphosphate (ATP), and then release waste products."
    )
    page2_text = (
        "Glycolysis is the metabolic pathway that converts glucose into pyruvate. The free energy released in this "
        "process is used to form the high-energy molecules ATP and NADH."
    )
    # Use annotation or text write
    # If pypdf does not support direct text drawing without canvas, test plain text or direct writer
    # Let's test with a generated PDF or mock if pypdf is reader-only without reportlab
    # PdfWriter can add annotations or text strings in recent versions:
    stream = io.BytesIO()
    writer.write(stream)
    pdf_bytes = stream.getvalue()

    # Upload valid PDF
    # If blank page has no text, upload_resp will catch "No readable text", which is expected for blank PDFs.
    # So let's also test markdown file with .md extension:
    md_content = "# Biology Lecture Notes\n\n## Glycolysis\nGlycolysis produces ATP in the cytoplasm.".encode("utf-8")
    md_file = ("lecture_notes.md", md_content, "text/markdown")
    md_resp = test_client.post(
        "/documents/upload",
        files={"file": md_file},
        data={"title": "Biology Lecture 4", "subject": "Biology"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert md_resp.status_code == 201
    assert md_resp.json()["document"]["file_type"] == "md"


def test_document_multi_tenant_privacy():
    email1 = f"owner_{uuid.uuid4().hex[:8]}@example.com"
    email2 = f"intruder_{uuid.uuid4().hex[:8]}@example.com"

    test_client.post("/register", json={"name": "Owner", "email": email1, "password": "Password123!"})
    test_client.post("/register", json={"name": "Intruder", "email": email2, "password": "Password123!"})

    token1 = test_client.post("/login", json={"email": email1, "password": "Password123!"}).json()["access_token"]
    token2 = test_client.post("/login", json={"email": email2, "password": "Password123!"}).json()["access_token"]

    # User 1 uploads document
    txt = b"Secret Proprietary Algorithm and Machine Learning Architecture Notes."
    up = test_client.post(
        "/documents/upload",
        files={"file": ("secret.txt", txt, "text/plain")},
        data={"title": "Secret Research"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert up.status_code == 201
    doc_id = up.json()["document"]["id"]

    # User 2 CANNOT access User 1's document (403 Forbidden or 404 Not Found)
    res_get = test_client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {token2}"})
    assert res_get.status_code in (403, 404)

    # User 2 CANNOT access User 1's chunks
    res_chunks = test_client.get(f"/documents/{doc_id}/chunks", headers={"Authorization": f"Bearer {token2}"})
    assert res_chunks.status_code in (403, 404)

    # User 2 searching does NOT return User 1's chunks
    res_search = test_client.post(
        "/documents/search",
        json={"query": "Secret Proprietary Algorithm", "document_id": doc_id},
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res_search.status_code == 200
    assert len(res_search.json()["results"]) == 0

    # User 2 CANNOT delete User 1's document (403 Forbidden or 404 Not Found)
    res_del = test_client.delete(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {token2}"})
    assert res_del.status_code in (403, 404)


def test_document_search_and_ranking():
    email = f"search_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Searcher", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    doc_text = (
        "Photosynthesis is the process used by plants and other organisms to convert light energy into chemical energy.\n\n"
        "Chloroplasts are organelle structures containing chlorophyll that conduct photosynthesis.\n\n"
        "The Calvin cycle is a set of light-independent reactions that convert carbon dioxide into glucose."
    ).encode("utf-8")

    up = test_client.post(
        "/documents/upload",
        files={"file": ("botany.txt", doc_text, "text/plain")},
        data={"title": "Botany 101: Photosynthesis", "subject": "Biology"},
        headers={"Authorization": f"Bearer {token}"},
    )
    doc_id = up.json()["document"]["id"]

    # Search for chloroplast
    search_resp = test_client.post(
        "/documents/search",
        json={"query": "chloroplast chlorophyll", "document_id": doc_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert search_resp.status_code == 200
    results = search_resp.json()["results"]
    assert len(results) > 0
    top = results[0]
    assert "chloroplast" in top["content"].lower() or "photosynthesis" in top["content"].lower()
    assert top["score"] > 0.0


def test_document_study_guide():
    email = f"guide_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Study Student", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    text = (
        "Operating Systems Principles:\n\n"
        "Concurrency: Multiple processes running simultaneously sharing CPU cores and memory.\n\n"
        "Deadlock: A state in which each process holds a resource and waits for another resource held by another process.\n\n"
        "Semaphores and Mutexes: Synchronization primitives used to prevent race conditions in critical sections."
    ).encode("utf-8")

    up = test_client.post(
        "/documents/upload",
        files={"file": ("os_notes.txt", text, "text/plain")},
        data={"title": "Operating Systems Review", "subject": "Computer Science"},
        headers={"Authorization": f"Bearer {token}"},
    )
    doc_id = up.json()["document"]["id"]

    guide_resp = test_client.get(f"/documents/{doc_id}/study-guide", headers={"Authorization": f"Bearer {token}"})
    assert guide_resp.status_code == 200
    guide = guide_resp.json()["study_guide"]
    assert "title" in guide
    assert "executive_summary" in guide
    assert "key_terms" in guide
    assert "high_yield_takeaways" in guide
    assert "flashcards" in guide
    assert len(guide["flashcards"]) > 0


def test_grounded_chat_with_document():
    email = f"grounded_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "RAG Chat", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    text = (
        "Database Indexing:\n"
        "B-Trees maintain sorted data and allow searches, sequential access, insertions, and deletions in logarithmic time."
    ).encode("utf-8")

    up = test_client.post(
        "/documents/upload",
        files={"file": ("db.txt", text, "text/plain")},
        data={"title": "Database Notes"},
        headers={"Authorization": f"Bearer {token}"},
    )
    doc_id = up.json()["document"]["id"]

    # Send chat grounded in this document
    chat_resp = test_client.post(
        "/chat",
        json={
            "message": "What is the time complexity of B-Trees?",
            "document_id": doc_id,
            "subject": "Computer Science",
            "language": "English",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "citations" in data["message"]
    citations = data["message"]["citations"]
    assert len(citations) > 0
    assert citations[0]["document_id"] == doc_id
    assert "B-Trees" in citations[0]["content_preview"]


def test_document_quiz_generation():
    email = f"docquiz_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Quiz Taker", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    text = (
        "Newton's First Law states that an object remains at rest, or in uniform motion in a straight line, "
        "unless acted upon by an external net force.\n\n"
        "Newton's Second Law defines force as the rate of change of momentum, commonly expressed as F = m * a."
    ).encode("utf-8")

    up = test_client.post(
        "/documents/upload",
        files={"file": ("newton.txt", text, "text/plain")},
        data={"title": "Newtonian Mechanics", "subject": "Physics"},
        headers={"Authorization": f"Bearer {token}"},
    )
    doc_id = up.json()["document"]["id"]

    # Generate quiz from document
    gen_resp = test_client.post(
        "/quizzes/generate-from-document",
        json={"document_id": doc_id, "num_questions": 2, "language": "English"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert gen_resp.status_code == 200
    quiz_data = gen_resp.json()
    assert quiz_data["document_id"] == doc_id
    assert len(quiz_data["questions"]) == 2
    assert len(quiz_data["questions"][0]["options"]) == 4

    quiz_id = quiz_data["id"]

    # Submit quiz answers
    sub_resp = test_client.post(
        f"/quizzes/{quiz_id}/submit",
        json={"quiz_id": quiz_id, "answers": [0, 0]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert sub_resp.status_code == 200
    assert "score" in sub_resp.json()


def test_document_deletion_cascades_to_chunks():
    email = f"del_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Deleter", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    up = test_client.post(
        "/documents/upload",
        files={"file": ("to_delete.txt", b"Temporary notes to be removed completely.", "text/plain")},
        data={"title": "To Delete"},
        headers={"Authorization": f"Bearer {token}"},
    )
    doc_id = up.json()["document"]["id"]

    # Chunks exist
    assert document_chunks_collection.count_documents({"document_id": doc_id}) > 0

    # Delete
    del_resp = test_client.delete(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_resp.status_code == 200

    # Document and chunks are gone
    assert documents_collection.find_one({"_id": ObjectId(doc_id)}) is None
    assert document_chunks_collection.count_documents({"document_id": doc_id}) == 0


def test_role_assignment_and_rbac():
    # 1. Register student (default role)
    student_email = f"student_{uuid.uuid4().hex[:8]}@example.com"
    reg_student = test_client.post(
        "/register",
        json={"name": "Alice Student", "email": student_email, "password": "Password123!"},
    )
    assert reg_student.status_code == 201
    assert reg_student.json()["user"]["role"] == "student"

    login_student = test_client.post(
        "/login",
        json={"email": student_email, "password": "Password123!"},
    )
    assert login_student.status_code == 200
    student_token = login_student.json()["access_token"]
    assert login_student.json()["user"]["role"] == "student"

    # Verify /me and /auth/roles/me
    me_resp = test_client.get("/me", headers={"Authorization": f"Bearer {student_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["role"] == "student"

    roles_resp = test_client.get("/auth/roles/me", headers={"Authorization": f"Bearer {student_token}"})
    assert roles_resp.status_code == 200
    assert roles_resp.json()["role"] == "student"

    # 2. Register teacher
    teacher_email = f"teacher_{uuid.uuid4().hex[:8]}@example.com"
    reg_teacher = test_client.post(
        "/register",
        json={"name": "Prof Smith", "email": teacher_email, "password": "Password123!", "role": "teacher"},
    )
    assert reg_teacher.status_code == 201
    assert reg_teacher.json()["user"]["role"] == "teacher"

    login_teacher = test_client.post(
        "/login",
        json={"email": teacher_email, "password": "Password123!"},
    )
    teacher_token = login_teacher.json()["access_token"]
    assert login_teacher.json()["user"]["role"] == "teacher"

    teacher_me = test_client.get("/me", headers={"Authorization": f"Bearer {teacher_token}"})
    assert teacher_me.json()["user"]["role"] == "teacher"


def test_oauth_state_validation_and_expiration():
    from datetime import datetime, timezone, timedelta
    from main import app

    # Invalid state rejected
    resp = test_client.get("/auth/google/callback?code=fake_code&state=non_existent_state", follow_redirects=False)
    assert resp.status_code in (302, 307)
    assert "error=invalid_state" in resp.headers["location"]

    # Missing params rejected
    resp_no_params = test_client.get("/auth/google/callback", follow_redirects=False)
    assert resp_no_params.status_code in (302, 307)
    assert "error=google_auth_failed" in resp_no_params.headers["location"]

    # Expired state (> 10 minutes) evicted
    old_state = "expired_test_state_12345"
    if not hasattr(app.state, "oauth_states"):
        app.state.oauth_states = {}
    app.state.oauth_states[old_state] = datetime.now(timezone.utc) - timedelta(minutes=15)

    resp_expired = test_client.get(f"/auth/google/callback?code=fake_code&state={old_state}", follow_redirects=False)
    assert resp_expired.status_code in (302, 307)
    assert "error=invalid_state" in resp_expired.headers["location"]
    assert old_state not in app.state.oauth_states


def test_learning_path_generation_and_validation():
    # 1. Validation error: empty subject / short goal
    email = f"lp_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Roadmap Learner", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    bad_resp = test_client.post(
        "/learning-paths/generate",
        json={"subject": "C", "knowledge_level": "Beginner", "learning_goal": "ab"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bad_resp.status_code == 422

    # 2. Valid generation
    gen_resp = test_client.post(
        "/learning-paths/generate",
        json={
            "subject": "Machine Learning",
            "knowledge_level": "Intermediate",
            "learning_goal": "Master deep neural networks and transformer architectures",
            "daily_study_time_minutes": 60,
            "target_completion_date": "2026-12-31",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert gen_resp.status_code == 201
    lp = gen_resp.json()["learning_path"]
    assert lp["subject"] == "Machine Learning"
    assert lp["knowledge_level"] == "Intermediate"
    assert lp["daily_study_time_minutes"] == 60
    assert lp["total_days"] >= 5
    assert lp["total_lessons"] >= 10
    assert lp["progress_percentage"] == 0.0
    assert len(lp["daily_plans"]) > 0

    first_day = lp["daily_plans"][0]
    assert "learning_objectives" in first_day
    assert "lessons" in first_day
    assert "practice_activity" in first_day
    assert "quiz_preview" in first_day
    assert len(first_day["lessons"]) >= 1

    path_id = lp["id"]

    # 3. List learning paths
    list_resp = test_client.get("/learning-paths", headers={"Authorization": f"Bearer {token}"})
    assert list_resp.status_code == 200
    assert any(p["id"] == path_id for p in list_resp.json()["learning_paths"])

    # 4. Fetch single learning path
    get_resp = test_client.get(f"/learning-paths/{path_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_resp.status_code == 200
    assert get_resp.json()["learning_path"]["id"] == path_id


def test_learning_path_lesson_completion_and_progress_tracking():
    email = f"lp_prog_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Progress Learner", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    gen_resp = test_client.post(
        "/learning-paths/generate",
        json={
            "subject": "Data Structures",
            "knowledge_level": "Beginner",
            "learning_goal": "Ace algorithm interviews",
            "daily_study_time_minutes": 45,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    lp = gen_resp.json()["learning_path"]
    path_id = lp["id"]
    lesson1_id = lp["daily_plans"][0]["lessons"][0]["id"]

    # Mark lesson complete
    comp_resp = test_client.put(
        f"/learning-paths/{path_id}/lessons/{lesson1_id}",
        json={"completed": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert comp_resp.status_code == 200
    res_data = comp_resp.json()
    assert res_data["completed"] is True
    assert res_data["progress_percentage"] > 0

    # Verify persistence
    updated_path = test_client.get(f"/learning-paths/{path_id}", headers={"Authorization": f"Bearer {token}"}).json()["learning_path"]
    assert updated_path["completed_lessons"] == 1
    assert updated_path["daily_plans"][0]["lessons"][0]["completed"] is True
    assert updated_path["daily_plans"][0]["lessons"][0]["completed_at"] is not None

    # Global progress updated
    user_prog = test_client.get("/progress", headers={"Authorization": f"Bearer {token}"}).json()
    assert user_prog["total_learning_paths"] >= 1
    assert user_prog["completed_lessons"] >= 1

    # Mark lesson incomplete (toggle back)
    uncomp_resp = test_client.put(
        f"/learning-paths/{path_id}/lessons/{lesson1_id}",
        json={"completed": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert uncomp_resp.status_code == 200
    assert uncomp_resp.json()["completed"] is False
    assert uncomp_resp.json()["progress_percentage"] == 0.0


def test_learning_path_next_topic_recommendation():
    email = f"lp_next_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Next Learner", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    gen_resp = test_client.post(
        "/learning-paths/generate",
        json={
            "subject": "Web Development",
            "knowledge_level": "Beginner",
            "learning_goal": "Build reactive applications",
            "daily_study_time_minutes": 30,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    path_id = gen_resp.json()["learning_path"]["id"]

    next_resp = test_client.get(f"/learning-paths/{path_id}/next-topic", headers={"Authorization": f"Bearer {token}"})
    assert next_resp.status_code == 200
    next_data = next_resp.json()
    assert next_data["has_next"] is True
    assert next_data["day_number"] == 1
    assert "lesson" in next_data
    assert next_data["lesson"]["completed"] is False


def test_learning_path_adaptive_adjustment():
    email = f"lp_adj_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Adjust Learner", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    gen_resp = test_client.post(
        "/learning-paths/generate",
        json={
            "subject": "Distributed Systems",
            "knowledge_level": "Advanced",
            "learning_goal": "Master Raft and Paxos consensus",
            "daily_study_time_minutes": 45,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    path_id = gen_resp.json()["learning_path"]["id"]

    # Adjust pace and add reinforcement topic
    adj_resp = test_client.post(
        f"/learning-paths/{path_id}/adjust",
        json={
            "pace": "faster",
            "daily_study_time_minutes": 90,
            "focus_topic": "Vector Clocks and Byzantine Fault Tolerance",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert adj_resp.status_code == 200
    updated_path = adj_resp.json()["learning_path"]
    assert updated_path["daily_study_time_minutes"] == 90
    # Check that a reinforcement lesson was added
    has_reinforce = any(
        "Byzantine Fault Tolerance" in l.get("title", "")
        for d in updated_path["daily_plans"]
        for l in d.get("lessons", [])
    )
    assert has_reinforce is True


def test_learning_path_multi_tenant_isolation_and_deletion():
    email1 = f"user1_{uuid.uuid4().hex[:8]}@example.com"
    email2 = f"user2_{uuid.uuid4().hex[:8]}@example.com"

    test_client.post("/register", json={"name": "User One", "email": email1, "password": "Password123!"})
    test_client.post("/register", json={"name": "User Two", "email": email2, "password": "Password123!"})

    token1 = test_client.post("/login", json={"email": email1, "password": "Password123!"}).json()["access_token"]
    token2 = test_client.post("/login", json={"email": email2, "password": "Password123!"}).json()["access_token"]

    gen = test_client.post(
        "/learning-paths/generate",
        json={"subject": "Calculus", "knowledge_level": "Beginner", "learning_goal": "Derivatives & integrals"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    path_id = gen.json()["learning_path"]["id"]

    # User 2 cannot view User 1's path
    cross_get = test_client.get(f"/learning-paths/{path_id}", headers={"Authorization": f"Bearer {token2}"})
    assert cross_get.status_code == 404

    # User 2 cannot modify User 1's lesson
    cross_put = test_client.put(
        f"/learning-paths/{path_id}/lessons/day-1-lesson-1",
        json={"completed": True},
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert cross_put.status_code == 404

    # User 2 cannot delete User 1's path
    cross_del = test_client.delete(f"/learning-paths/{path_id}", headers={"Authorization": f"Bearer {token2}"})
    assert cross_del.status_code == 404

    # User 1 deletes their own path
    own_del = test_client.delete(f"/learning-paths/{path_id}", headers={"Authorization": f"Bearer {token1}"})
    assert own_del.status_code == 200

    # Path is gone
    after_get = test_client.get(f"/learning-paths/{path_id}", headers={"Authorization": f"Bearer {token1}"})
    assert after_get.status_code == 404
    assert learning_paths_collection.find_one({"_id": ObjectId(path_id)}) is None


def test_student_performance_cold_start():
    email = f"perf_cold_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Cold Start Student", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    resp = test_client.get("/analytics/performance", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    perf = resp.json()["performance"]
    assert perf["cold_start"] is True
    assert perf["total_assessments"] == 0
    assert len(perf["topic_matrix"]) == 0
    assert len(perf["recommendations"]) > 0


def test_student_performance_evaluation_and_topic_matrix():
    from datetime import datetime, timezone
    email = f"perf_eval_{uuid.uuid4().hex[:8]}@example.com"
    reg = test_client.post("/register", json={"name": "ML Evaluated Student", "email": email, "password": "Password123!"}).json()
    user_id = reg["user"]["id"]
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # 1. Create and submit a strong quiz on Linear Regression (3/3 correct = 100%)
    q1_doc = {
        "user_id": user_id,
        "subject": "Machine Learning",
        "topic": "Linear Regression",
        "language": "English",
        "title": "Quiz: Linear Regression",
        "questions": [
            {"question": "Q1", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E1"},
            {"question": "Q2", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E2"},
            {"question": "Q3", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E3"},
        ],
        "num_questions": 3,
        "score": None,
        "answers": None,
        "completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    q1_id = str(quizzes_collection.insert_one(q1_doc).inserted_id)
    test_client.post(
        f"/quizzes/{q1_id}/submit",
        json={"quiz_id": q1_id, "answers": [0, 0, 0]},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 2. Create and submit a weak quiz on Decision Trees (0/3 correct = 0%)
    q2_doc = {
        "user_id": user_id,
        "subject": "Machine Learning",
        "topic": "Decision Trees",
        "language": "English",
        "title": "Quiz: Decision Trees",
        "questions": [
            {"question": "What is Entropy in ID3?", "options": ["Impurity", "Weights", "Bias", "Variance"], "correct_index": 0, "explanation": "Entropy measures impurity of node samples."},
            {"question": "What is Information Gain?", "options": ["Reduction in entropy", "Gradient step", "L2 penalty", "Residual"], "correct_index": 0, "explanation": "Information gain is the expected reduction in entropy."},
            {"question": "What stops tree growth?", "options": ["Pruning", "Epochs", "Batch norm", "Momentum"], "correct_index": 0, "explanation": "Pruning prevents overfitting by limiting tree depth."},
        ],
        "num_questions": 3,
        "score": None,
        "answers": None,
        "completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    q2_id = str(quizzes_collection.insert_one(q2_doc).inserted_id)
    test_client.post(
        f"/quizzes/{q2_id}/submit",
        json={"quiz_id": q2_id, "answers": [1, 2, 3]},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 3. Evaluate performance
    eval_resp = test_client.get("/analytics/performance", headers={"Authorization": f"Bearer {token}"})
    assert eval_resp.status_code == 200
    perf = eval_resp.json()["performance"]
    assert perf["cold_start"] is False
    assert perf["total_assessments"] == 2
    assert perf["total_questions_answered"] == 6

    # Verify topic matrix
    topics = {t["topic"]: t for t in perf["topic_matrix"]}
    assert "Linear Regression" in topics
    assert "Decision Trees" in topics

    lr_data = topics["Linear Regression"]
    dt_data = topics["Decision Trees"]

    assert lr_data["accuracy_percentage"] == 100.0
    assert lr_data["mastery_score"] >= 80.0
    assert dt_data["accuracy_percentage"] == 0.0
    assert dt_data["mastery_score"] < 60.0

    # Decision Trees must be identified as weak/needs revision
    assert "Decision Trees" in perf["weak_topics"]
    assert "Decision Trees" in perf["revision_needed"]
    assert "Linear Regression" in perf["strong_topics"]

    # Actionable recommendation mentions Decision Trees
    recs_text = " ".join(perf["recommendations"])
    assert "Decision Trees" in recs_text

    # Knowledge gaps captured
    assert len(perf["knowledge_gaps"]) > 0
    assert any(g["topic"] == "Decision Trees" for g in perf["knowledge_gaps"])


def test_student_performance_ml_classifier_training_and_metrics():
    from datetime import datetime, timezone
    email = f"perf_ml_{uuid.uuid4().hex[:8]}@example.com"
    reg = test_client.post("/register", json={"name": "ML Model Student", "email": email, "password": "Password123!"}).json()
    user_id = reg["user"]["id"]
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Submit 1 quiz to trigger active feature evaluation
    q_doc = {
        "user_id": user_id,
        "subject": "Computer Science",
        "topic": "Operating Systems",
        "language": "English",
        "title": "Quiz: Operating Systems",
        "questions": [
            {"question": "Q1", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E1"},
            {"question": "Q2", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E2"},
            {"question": "Q3", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E3"},
        ],
        "num_questions": 3,
        "score": None,
        "answers": None,
        "completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    q_id = str(quizzes_collection.insert_one(q_doc).inserted_id)
    test_client.post(
        f"/quizzes/{q_id}/submit",
        json={"quiz_id": q_id, "answers": [0, 0, 1]},
        headers={"Authorization": f"Bearer {token}"},
    )

    eval_resp = test_client.post("/analytics/performance/evaluate", headers={"Authorization": f"Bearer {token}"})
    assert eval_resp.status_code == 200
    ml = eval_resp.json()["performance"]["ml_insights"]

    # Check ML model attributes
    assert ml["is_trained"] is True
    assert ml["model_name"].startswith("RandomForestClassifier")
    assert ml["test_accuracy"] >= 0.70
    assert ml["test_f1_score"] >= 0.70
    assert "exam_readiness_score" in ml
    assert 0.0 <= ml["exam_readiness_score"] <= 100.0
    assert "feature_importances" in ml
    assert len(ml["feature_importances"]) == 8
    assert "historical_accuracy" in ml["feature_importances"]
    assert len(ml["model_limitations"]) >= 2


def test_topic_diagnostic_endpoint():
    from datetime import datetime, timezone
    email = f"topic_diag_{uuid.uuid4().hex[:8]}@example.com"
    reg = test_client.post("/register", json={"name": "Diagnostic Student", "email": email, "password": "Password123!"}).json()
    user_id = reg["user"]["id"]
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    q_doc = {
        "user_id": user_id,
        "subject": "Biology",
        "topic": "Genetics",
        "language": "English",
        "title": "Quiz: Genetics",
        "questions": [
            {"question": "Q1", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E1"},
            {"question": "Q2", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E2"},
            {"question": "Q3", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E3"},
        ],
        "num_questions": 3,
        "score": None,
        "answers": None,
        "completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    q_id = str(quizzes_collection.insert_one(q_doc).inserted_id)
    test_client.post(
        f"/quizzes/{q_id}/submit",
        json={"quiz_id": q_id, "answers": [0, 1, 2]},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Valid topic diagnostic
    diag_resp = test_client.get("/analytics/topics/Genetics", headers={"Authorization": f"Bearer {token}"})
    assert diag_resp.status_code == 200
    assert diag_resp.json()["topic_data"]["topic"] == "Genetics"

    # Non-existent topic diagnostic returns 404
    missing_resp = test_client.get("/analytics/topics/NonExistentTopic1234", headers={"Authorization": f"Bearer {token}"})
    assert missing_resp.status_code == 404


def test_adaptive_quiz_recommend_difficulty():
    from datetime import datetime, timezone
    email = f"adapt_rec_{uuid.uuid4().hex[:8]}@example.com"
    reg = test_client.post("/register", json={"name": "Adaptive Rec", "email": email, "password": "Password123!"}).json()
    user_id = reg["user"]["id"]
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Cold start: no past history -> defaults to beginner
    res1 = test_client.get(
        "/quizzes/adaptive/recommend-difficulty?subject=Computer Science&topic=Graph Algorithms",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["recommended_difficulty"] == "beginner"
    assert data1["topic_mastery_percentage"] is None
    assert "No prior assessment" in data1["reason"]

    # Add a quiz with high score (100%) for Graph Algorithms
    q_high = {
        "user_id": user_id,
        "subject": "Computer Science",
        "topic": "Graph Algorithms",
        "language": "English",
        "title": "Quiz: Graph Algorithms",
        "questions": [
            {"question": "Q1", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E1"},
            {"question": "Q2", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "E2"},
        ],
        "num_questions": 2,
        "score": None,
        "answers": None,
        "completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    q_id = str(quizzes_collection.insert_one(q_high).inserted_id)
    test_client.post(f"/quizzes/{q_id}/submit", json={"quiz_id": q_id, "answers": [0, 1]}, headers={"Authorization": f"Bearer {token}"})

    res2 = test_client.get(
        "/quizzes/adaptive/recommend-difficulty?subject=Computer Science&topic=Graph Algorithms",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["recommended_difficulty"] == "advanced"
    assert data2["topic_mastery_percentage"] == 80.0


def test_adaptive_quiz_start_and_no_leakage():
    email = f"adapt_start_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Adaptive Starter", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    start_resp = test_client.post(
        "/quizzes/adaptive/start",
        json={
            "subject": "Computer Science",
            "topic": "Dynamic Programming",
            "initial_difficulty": "beginner",
            "num_questions": 3,
            "language": "English",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert start_resp.status_code in (200, 201)
    data = start_resp.json()
    assert "quiz_id" in data
    assert data["subject"] == "Computer Science"
    assert data["topic"] == "Dynamic Programming"
    assert data["current_difficulty"] == "beginner"
    assert data["question_number"] == 1
    assert data["total_questions"] == 3
    assert data["completed"] is False

    # Security check: correct answer and explanation must NOT be exposed before answering
    q = data["question"]
    assert "question" in q
    assert len(q["options"]) == 4
    assert "difficulty" in q
    assert "correct_index" not in q
    assert "explanation" not in q


def test_adaptive_quiz_difficulty_scaling_and_completion():
    email = f"adapt_scale_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Adaptive Scaler", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # 1. Start quiz at beginner level with 3 questions
    start_resp = test_client.post(
        "/quizzes/adaptive/start",
        json={
            "subject": "Computer Science",
            "topic": "Sorting Algorithms",
            "initial_difficulty": "beginner",
            "num_questions": 3,
            "language": "English",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert start_resp.status_code in (200, 201)
    quiz_id = start_resp.json()["quiz_id"]

    # Peek at server-side tiered bank in test database to submit accurate responses
    quiz_doc = quizzes_collection.find_one({"_id": ObjectId(quiz_id)})
    bank = quiz_doc["tiered_question_bank"]

    # Question 1 (Beginner): Answer correctly
    correct_opt_q1 = bank["beginner"][0]["correct_index"]
    ans1_resp = test_client.post(
        f"/quizzes/adaptive/{quiz_id}/answer",
        json={"selected_option": correct_opt_q1, "time_taken_seconds": 12},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ans1_resp.status_code == 200
    ans1 = ans1_resp.json()
    assert ans1["is_correct"] is True
    assert ans1["earned_points"] == 1.0  # 1.0 for beginner
    assert ans1["previous_difficulty"] == "beginner"
    assert ans1["next_difficulty"] == "intermediate"  # Scaled UP
    assert ans1["direction"] == "up"
    assert ans1["completed"] is False
    assert ans1["next_question"]["difficulty"] == "intermediate"
    # Post-submission feedback DOES include explanation and correct_index
    assert ans1["correct_index"] == correct_opt_q1
    assert "explanation" in ans1

    # Question 2 (Intermediate): Answer INCORRECTLY
    current_q2 = ans1["next_question"]
    # Pick a wrong option
    # Find matching question in intermediate bank
    matching_q2 = next(q for q in bank["intermediate"] if q["question"] == current_q2["question"])
    wrong_opt_q2 = (matching_q2["correct_index"] + 1) % 4

    ans2_resp = test_client.post(
        f"/quizzes/adaptive/{quiz_id}/answer",
        json={"selected_option": wrong_opt_q2, "time_taken_seconds": 18},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ans2_resp.status_code == 200
    ans2 = ans2_resp.json()
    assert ans2["is_correct"] is False
    assert ans2["earned_points"] == 0.0
    assert ans2["previous_difficulty"] == "intermediate"
    assert ans2["next_difficulty"] == "beginner"  # Scaled DOWN
    assert ans2["direction"] == "down"
    assert ans2["completed"] is False

    # Question 3 (Beginner, final question): Answer correctly
    current_q3 = ans2["next_question"]
    matching_q3 = next(q for q in bank["beginner"] if q["question"] == current_q3["question"])
    correct_opt_q3 = matching_q3["correct_index"]

    ans3_resp = test_client.post(
        f"/quizzes/adaptive/{quiz_id}/answer",
        json={"selected_option": correct_opt_q3, "time_taken_seconds": 15},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ans3_resp.status_code == 200
    ans3 = ans3_resp.json()
    assert ans3["is_correct"] is True
    assert ans3["completed"] is True
    assert ans3["final_summary"] is not None

    summary = ans3["final_summary"]
    assert summary["total_questions"] == 3
    assert summary["correct_count"] == 2
    assert summary["accuracy_percentage"] == round((2 / 3) * 100, 1)
    assert summary["total_time_seconds"] == 45
    assert len(summary["difficulty_history"]) == 3
    # Check that weak concept from the incorrect Q2 is captured
    assert len(summary["weak_concepts"]) >= 1
    assert len(summary["recommendations"]) >= 1

    # Verify quiz state via GET /quizzes/adaptive/{id}
    get_resp = test_client.get(f"/quizzes/adaptive/{quiz_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_resp.status_code == 200
    assert get_resp.json()["completed"] is True

    # Answering an already completed quiz should fail with 400
    dup_ans = test_client.post(
        f"/quizzes/adaptive/{quiz_id}/answer",
        json={"selected_option": 0, "time_taken_seconds": 5},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dup_ans.status_code == 400


def test_adaptive_quiz_isolation():
    # User 1 creates an adaptive quiz
    email1 = f"user1_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "User 1", "email": email1, "password": "Password123!"})
    token1 = test_client.post("/login", json={"email": email1, "password": "Password123!"}).json()["access_token"]

    start = test_client.post(
        "/quizzes/adaptive/start",
        json={"subject": "Physics", "topic": "Optics", "initial_difficulty": "intermediate", "num_questions": 3},
        headers={"Authorization": f"Bearer {token1}"},
    ).json()
    quiz_id = start["quiz_id"]

    # User 2 tries to access or answer User 1's adaptive quiz
    email2 = f"user2_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "User 2", "email": email2, "password": "Password123!"})
    token2 = test_client.post("/login", json={"email": email2, "password": "Password123!"}).json()["access_token"]

    get_resp = test_client.get(f"/quizzes/adaptive/{quiz_id}", headers={"Authorization": f"Bearer {token2}"})
    assert get_resp.status_code == 404

    ans_resp = test_client.post(
        f"/quizzes/adaptive/{quiz_id}/answer",
        json={"selected_option": 0, "time_taken_seconds": 10},
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert ans_resp.status_code == 404


def test_flashcard_manual_creation_and_listing():
    email = f"fc_user_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Flashcard Learner", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    create_resp = test_client.post(
        "/flashcards",
        json={
            "question": "What is Amdahl's Law?",
            "answer": "A formula predicting the theoretical speedup in latency of an execution task at fixed workload.",
            "topic": "Computer Architecture",
            "subject": "Computer Science",
            "difficulty": "Intermediate",
            "tags": ["Architecture", "Concurrency"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 201
    card = create_resp.json()["flashcard"]
    assert card["question"] == "What is Amdahl's Law?"
    assert card["easiness_factor"] == 2.5
    assert card["interval_days"] == 0
    assert card["repetitions"] == 0
    assert card["review_count"] == 0
    assert card["retention_status"] == "new"

    # List cards
    list_resp = test_client.get("/flashcards?queue=all", headers={"Authorization": f"Bearer {token}"})
    assert list_resp.status_code == 200
    cards = list_resp.json()["flashcards"]
    assert len(cards) >= 1
    assert any(c["id"] == card["id"] for c in cards)


def test_flashcard_sm2_spaced_repetition_progression():
    email = f"sm2_user_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "SM2 Master", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # 1. Create card
    card = test_client.post(
        "/flashcards",
        json={
            "question": "What is the CAP Theorem?",
            "answer": "A distributed system can guarantee at most two of Consistency, Availability, and Partition tolerance.",
            "topic": "Distributed Systems",
            "subject": "Computer Science",
            "difficulty": "Advanced",
        },
        headers={"Authorization": f"Bearer {token}"},
    ).json()["flashcard"]
    card_id = card["id"]

    # 2. First Review: "good" (q=4)
    rev1 = test_client.post(
        f"/flashcards/{card_id}/review",
        json={"rating": "good", "time_taken_seconds": 6},
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    assert rev1["status"] == "success"
    c1 = rev1["card"]
    assert c1["repetitions"] == 1
    assert c1["interval_days"] == 1
    assert c1["easiness_factor"] == 2.5
    assert c1["retention_status"] == "learning"
    assert c1["review_count"] == 1

    # 3. Second Review: "good" (q=4)
    rev2 = test_client.post(
        f"/flashcards/{card_id}/review",
        json={"rating": "good", "time_taken_seconds": 4},
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    c2 = rev2["card"]
    assert c2["repetitions"] == 2
    assert c2["interval_days"] == 6
    assert c2["easiness_factor"] == 2.5
    assert c2["retention_status"] == "learning"

    # 4. Third Review: "hard" (q=3)
    rev3 = test_client.post(
        f"/flashcards/{card_id}/review",
        json={"rating": "hard", "time_taken_seconds": 12},
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    c3 = rev3["card"]
    assert c3["repetitions"] == 3
    assert c3["interval_days"] == 7  # round(6 * 1.2) = 7
    assert c3["easiness_factor"] == 2.36  # EF drops slightly
    assert c3["retention_status"] == "reviewing"

    # 5. Fourth Review: "again" (q=1, forgotten)
    rev4 = test_client.post(
        f"/flashcards/{card_id}/review",
        json={"rating": "again", "time_taken_seconds": 20},
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    c4 = rev4["card"]
    assert c4["repetitions"] == 0  # Reset
    assert c4["interval_days"] == 1  # Reset to 1 day
    assert c4["retention_status"] == "learning"

    # 6. Verify review audit logs persisted in MongoDB
    reviews_count = flashcard_reviews_collection.count_documents({"card_id": card_id})
    assert reviews_count == 4

    # 7. Delete card and check cascade
    del_resp = test_client.delete(f"/flashcards/{card_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_resp.status_code == 200
    assert flashcards_collection.find_one({"_id": ObjectId(card_id)}) is None
    assert flashcard_reviews_collection.count_documents({"card_id": card_id}) == 0


def test_flashcard_ai_generation_sources():
    email = f"gen_sources_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Multi Source Learner", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Source 1: Topic generation
    topic_res = test_client.post(
        "/flashcards/generate/topic",
        json={"subject": "Computer Science", "topic": "Virtual Memory", "count": 5},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert topic_res.status_code == 201
    topic_cards = topic_res.json()["flashcards"]
    assert len(topic_cards) == 5
    assert all(c["source"] == "topic" for c in topic_cards)

    # Source 2: Uploaded Document generation
    upload_res = test_client.post(
        "/documents/upload",
        files={"file": ("compiler_notes.txt", b"Compilers translate high-level code to assembly. Lexical analysis converts streams to tokens. Abstract syntax trees represent grammatical structure.", "text/plain")},
        data={"title": "Compiler Construction Notes", "subject": "Computer Science"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["document"]["id"]

    doc_cards_res = test_client.post(
        f"/flashcards/generate/document/{doc_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert doc_cards_res.status_code == 201
    doc_cards = doc_cards_res.json()["flashcards"]
    assert len(doc_cards) >= 1
    assert all(c["source"] == "document" for c in doc_cards)

    # Source 3: Learning Path generation
    lp_res = test_client.post(
        "/learning-paths/generate",
        json={"subject": "Computer Science", "knowledge_level": "Intermediate", "learning_goal": "Master Graph Algorithms", "daily_study_time_minutes": 30},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert lp_res.status_code == 201
    lp_id = lp_res.json()["learning_path"]["id"]

    lp_cards_res = test_client.post(
        f"/flashcards/generate/learning-path/{lp_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert lp_cards_res.status_code == 201
    lp_cards = lp_cards_res.json()["flashcards"]
    assert len(lp_cards) >= 1
    assert all(c["source"] == "learning_path" for c in lp_cards)


def test_flashcard_stats_and_queues():
    email = f"fc_stats_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Stats Learner", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Generate a deck
    test_client.post(
        "/flashcards/generate/topic",
        json={"subject": "Mathematics", "topic": "Linear Algebra", "count": 4},
        headers={"Authorization": f"Bearer {token}"},
    )

    stats_resp = test_client.get("/flashcards/stats", headers={"Authorization": f"Bearer {token}"})
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_cards"] == 4
    assert stats["due_today"] == 4  # Newly created cards are due immediately
    assert stats["daily_target"] == 20
    assert stats["daily_target_progress"] >= 0
    assert "retention_status_breakdown" in stats
    assert len(stats["topics_summary"]) >= 1
    assert stats["topics_summary"][0]["topic"] == "Linear Algebra"


def test_flashcard_multi_tenant_isolation():
    # User 1 creates card
    email1 = f"u1_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "User 1", "email": email1, "password": "Password123!"})
    token1 = test_client.post("/login", json={"email": email1, "password": "Password123!"}).json()["access_token"]

    card_res = test_client.post(
        "/flashcards",
        json={"question": "Secret Question", "answer": "Secret Answer", "topic": "Security", "subject": "CS"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    card_id = card_res.json()["flashcard"]["id"]

    # User 2 tries to access, review, or delete User 1's card
    email2 = f"u2_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "User 2", "email": email2, "password": "Password123!"})
    token2 = test_client.post("/login", json={"email": email2, "password": "Password123!"}).json()["access_token"]

    assert test_client.get(f"/flashcards/{card_id}", headers={"Authorization": f"Bearer {token2}"}).status_code == 404
    assert test_client.post(f"/flashcards/{card_id}/review", json={"rating": "good"}, headers={"Authorization": f"Bearer {token2}"}).status_code == 404
    assert test_client.delete(f"/flashcards/{card_id}", headers={"Authorization": f"Bearer {token2}"}).status_code == 404


def test_dashboard_analytics_cold_start():
    email = f"dash_cold_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Cold Learner", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    res = test_client.get("/analytics/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    # 1. Summary
    assert "summary" in data
    s = data["summary"]
    assert s["streak_days"] == 0
    assert s["total_quizzes"] == 0
    assert s["total_learning_time_minutes"] == 0
    assert s["formatted_learning_time"] == "0m"

    # 2. Activity timelines
    assert "weekly_activity" in data
    assert len(data["weekly_activity"]) == 7
    assert all("total" in day for day in data["weekly_activity"])

    assert "monthly_activity" in data
    assert len(data["monthly_activity"]) == 30
    assert all("level" in day for day in data["monthly_activity"])

    # 3. Topic mastery & subject performance
    assert "subject_performance" in data
    assert "topic_mastery" in data
    assert "tier_distribution" in data["topic_mastery"]

    # 4. Learning paths & revision
    assert "learning_paths_overview" in data
    assert "revision_activity" in data

    # 5. Prescriptive recommendations
    assert "recommendations" in data
    rec = data["recommendations"]
    assert "what_to_study_next" in rec
    assert "which_topic_to_revise" in rec
    assert "which_quiz_to_attempt" in rec
    assert "suggested_daily_goal" in rec


def test_dashboard_analytics_with_actual_activity_and_streaks():
    from datetime import datetime, timezone
    email = f"dash_active_{uuid.uuid4().hex[:8]}@example.com"
    reg = test_client.post("/register", json={"name": "Active Learner", "email": email, "password": "Password123!"}).json()
    user_id = reg["user"]["id"]
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # 1. Create and complete a quiz
    q_doc = {
        "user_id": user_id,
        "subject": "Computer Science",
        "topic": "Algorithms",
        "language": "English",
        "title": "Algorithms Assessment",
        "questions": [
            {"question": "Q1", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "E1"},
            {"question": "Q2", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "E2"},
        ],
        "num_questions": 2,
        "score": None,
        "answers": None,
        "completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    q_id = str(quizzes_collection.insert_one(q_doc).inserted_id)
    test_client.post(
        f"/quizzes/{q_id}/submit",
        json={"quiz_id": q_id, "answers": [0, 1]},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 2. Review a flashcard
    fc = test_client.post(
        "/flashcards",
        json={"question": "Q?", "answer": "A!", "topic": "Algorithms", "subject": "Computer Science"},
        headers={"Authorization": f"Bearer {token}"},
    ).json()["flashcard"]
    test_client.post(
        f"/flashcards/{fc['id']}/review",
        json={"rating": "good", "time_taken_seconds": 15},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 3. Create a learning path
    test_client.post(
        "/learning-paths/generate",
        json={"subject": "Computer Science", "knowledge_level": "Beginner", "learning_goal": "Algorithm Design", "daily_study_time_minutes": 45},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 4. Fetch dashboard analytics
    res = test_client.get("/analytics/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    # Verify streak is at least 1 day
    assert data["summary"]["streak_days"] >= 1
    # Verify learning time is calculated
    assert data["summary"]["total_learning_time_minutes"] > 0
    assert "m" in data["summary"]["formatted_learning_time"]

    # Verify weekly activity logged events for today
    today_activity = data["weekly_activity"][-1]
    assert today_activity["total"] >= 2
    assert today_activity["quizzes"] >= 1
    assert today_activity["flashcards"] >= 1

    # Verify subject performance captured
    assert len(data["subject_performance"]) >= 1
    assert data["subject_performance"][0]["subject"] == "Computer Science"
    assert data["subject_performance"][0]["average_score"] == 100

    # Verify quiz trends contain the completed quiz
    assert len(data["quiz_score_trends"]) >= 1
    assert data["quiz_score_trends"][0]["score"] == 100

    # Verify learning path overview shows the in-progress path
    assert data["learning_paths_overview"]["total_paths"] >= 1
    assert len(data["learning_paths_overview"]["in_progress"]) >= 1

    # Verify recommendation references the active learning path goal
    assert "Algorithm Design" in data["recommendations"]["what_to_study_next"]


def test_dashboard_analytics_multi_tenant_isolation():
    # User 1 performs activity
    email1 = f"dash_u1_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "User 1", "email": email1, "password": "Password123!"})
    token1 = test_client.post("/login", json={"email": email1, "password": "Password123!"}).json()["access_token"]

    test_client.post(
        "/flashcards",
        json={"question": "Private Q", "answer": "Private A", "topic": "Cybersecurity", "subject": "CS"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    # User 2 checks dashboard analytics
    email2 = f"dash_u2_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "User 2", "email": email2, "password": "Password123!"})
    token2 = test_client.post("/login", json={"email": email2, "password": "Password123!"}).json()["access_token"]

    data2 = test_client.get("/analytics/dashboard", headers={"Authorization": f"Bearer {token2}"}).json()
    assert data2["summary"]["total_quizzes"] == 0
    assert data2["revision_activity"]["flashcard_reviews_total"] == 0
    assert len(data2["subject_performance"]) == 0


# --------------------------------------------------
# PHASE 7: DOCUMENT INTELLIGENCE EXPANSION TESTS
# --------------------------------------------------

def test_document_docx_upload_extraction_and_chunking():
    import io
    import docx

    email = f"docx_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "DOCX Student", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Synthesize a real DOCX file in memory
    doc = docx.Document()
    doc.add_heading("Cloud Computing Fundamentals", level=1)
    doc.add_paragraph("Cloud computing delivers computing services over the internet including servers, storage, databases, networking, and software.")
    doc.add_heading("Service Models", level=2)
    doc.add_paragraph("The primary cloud service models are IaaS, PaaS, and SaaS.")
    # Add a structured table
    table = doc.add_table(rows=3, cols=2)
    table.cell(0, 0).text = "Model"
    table.cell(0, 1).text = "Example"
    table.cell(1, 0).text = "IaaS"
    table.cell(1, 1).text = "AWS EC2"
    table.cell(2, 0).text = "PaaS"
    table.cell(2, 1).text = "Google App Engine"

    buf = io.BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()

    file_tuple = ("cloud_computing.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    resp = test_client.post(
        "/documents/upload",
        files={"file": file_tuple},
        data={"title": "Cloud Computing Notes", "subject": "Computer Science"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    doc_res = resp.json()["document"]
    assert doc_res["file_type"] == "docx"
    assert doc_res["chunk_count"] >= 1
    assert doc_res["page_count"] >= 1
    assert doc_res["processing_stats"]["tables_extracted"] == 1

    # Verify chunks have unit_type == 'section'
    chunks_resp = test_client.get(
        f"/documents/{doc_res['id']}/chunks",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert chunks_resp.status_code == 200
    chunks = chunks_resp.json()["chunks"]
    assert len(chunks) >= 1
    assert chunks[0]["unit_type"] == "section"
    assert "Section" in chunks[0]["page_or_slide_label"]


def test_document_pptx_upload_slide_extraction_and_notes():
    import io
    import pptx

    email = f"pptx_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "PPTX Student", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    # Synthesize a 2-slide presentation in memory
    prs = pptx.Presentation()
    # Slide 1
    s1 = prs.slides.add_slide(prs.slide_layouts[0])
    s1.shapes.title.text = "Introduction to Neural Networks"
    s1.placeholders[1].text = "Deep Learning Architecture and Backpropagation"

    # Slide 2 with speaker notes
    s2 = prs.slides.add_slide(prs.slide_layouts[1])
    s2.shapes.title.text = "Activation Functions"
    s2.placeholders[1].text = "ReLU, Sigmoid, and Tanh introduce non-linearity into neurons."
    if s2.has_notes_slide:
        s2.notes_slide.notes_text_frame.text = "Remind students to study gradient vanishing for Sigmoid."

    buf = io.BytesIO()
    prs.save(buf)
    pptx_bytes = buf.getvalue()

    file_tuple = ("dl_lecture.pptx", pptx_bytes, "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    resp = test_client.post(
        "/documents/upload",
        files={"file": file_tuple},
        data={"title": "Deep Learning Slides", "subject": "Computer Science"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    doc_res = resp.json()["document"]
    assert doc_res["file_type"] == "pptx"
    assert doc_res["page_count"] == 2
    assert doc_res["processing_stats"]["unit_type"] == "slide"

    # Verify chunks have unit_type == 'slide' and 'Slide 1', 'Slide 2' labels
    chunks_resp = test_client.get(
        f"/documents/{doc_res['id']}/chunks",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert chunks_resp.status_code == 200
    chunks = chunks_resp.json()["chunks"]
    assert len(chunks) >= 2
    labels = [c["page_or_slide_label"] for c in chunks]
    assert any("Slide 1" in l for l in labels)
    assert any("Slide 2" in l for l in labels)


def test_document_duplicate_detection_and_force_override():
    email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Dup Tester", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    content = b"This is a unique test file for duplicate detection in Mentora AI."
    file_tuple = ("unique_doc.txt", content, "text/plain")

    # First upload: success
    resp1 = test_client.post(
        "/documents/upload",
        files={"file": file_tuple},
        data={"title": "Original Document", "subject": "General"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 201

    # Second upload with same bytes: rejected with 409 Conflict
    resp2 = test_client.post(
        "/documents/upload",
        files={"file": file_tuple},
        data={"title": "Duplicate Document", "subject": "General"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 409
    assert "Duplicate document detected" in resp2.json()["detail"]

    # Third upload with force=true: accepted
    resp3 = test_client.post(
        "/documents/upload",
        files={"file": file_tuple},
        data={"title": "Forced Document", "subject": "General", "force": "true"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp3.status_code == 201


def test_document_preview_endpoint():
    import io
    import pptx

    email = f"prev_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Preview Student", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    prs = pptx.Presentation()
    s1 = prs.slides.add_slide(prs.slide_layouts[0])
    s1.shapes.title.text = "Microservices Architecture"
    s1.placeholders[1].text = "Decomposing monoliths into autonomous scalable services."
    buf = io.BytesIO()
    prs.save(buf)

    upload_resp = test_client.post(
        "/documents/upload",
        files={"file": ("microservices.pptx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.presentationml.presentation")},
        data={"title": "Microservices Slide Deck"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["document"]["id"]

    # Request preview
    prev_resp = test_client.get(
        f"/documents/{doc_id}/preview",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prev_resp.status_code == 200
    preview = prev_resp.json()["preview"]
    assert preview["document"]["id"] == doc_id
    assert len(preview["unit_previews"]) >= 1
    assert preview["unit_previews"][0]["unit_type"] == "slide"
    assert "Slide 1" in preview["unit_previews"][0]["label"]
    assert len(preview["sample_chunks"]) >= 1


def test_document_access_control_and_isolation():
    # Student A uploads document
    email_a = f"studa_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Student A", "email": email_a, "password": "Password123!"})
    token_a = test_client.post("/login", json={"email": email_a, "password": "Password123!"}).json()["access_token"]

    file_tuple = ("confidential_notes.txt", b"Private confidential study notes for Student A only.", "text/plain")
    up_resp = test_client.post(
        "/documents/upload",
        files={"file": file_tuple},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert up_resp.status_code == 201
    doc_id = up_resp.json()["document"]["id"]

    # Student B tries to access
    email_b = f"studb_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Student B", "email": email_b, "password": "Password123!"})
    token_b = test_client.post("/login", json={"email": email_b, "password": "Password123!"}).json()["access_token"]

    # GET document -> 403 Forbidden
    get_resp = test_client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert get_resp.status_code == 403

    # GET chunks -> 403 Forbidden
    chunks_resp = test_client.get(f"/documents/{doc_id}/chunks", headers={"Authorization": f"Bearer {token_b}"})
    assert chunks_resp.status_code == 403

    # GET preview -> 403 Forbidden
    prev_resp = test_client.get(f"/documents/{doc_id}/preview", headers={"Authorization": f"Bearer {token_b}"})
    assert prev_resp.status_code == 403

    # DELETE -> 403 Forbidden
    del_resp = test_client.delete(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert del_resp.status_code == 403

    # Admin user can access document preview (authorized role)
    email_admin = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Admin User", "email": email_admin, "password": "Password123!"})
    from main import users_collection
    users_collection.update_one({"email": email_admin}, {"$set": {"role": "admin"}})
    token_admin = test_client.post("/login", json={"email": email_admin, "password": "Password123!"}).json()["access_token"]

    admin_prev = test_client.get(f"/documents/{doc_id}/preview", headers={"Authorization": f"Bearer {token_admin}"})
    assert admin_prev.status_code == 200


# --------------------------------------------------
# PHASE 8: VOICE-BASED AI TUTOR TESTS
# --------------------------------------------------

def test_voice_languages_endpoint():
    resp = test_client.get("/tutor/voice/languages")
    assert resp.status_code == 200
    data = resp.json()
    assert "supported_languages" in data
    assert len(data["supported_languages"]) >= 10
    lang_names = [l["name"] for l in data["supported_languages"]]
    assert "English" in lang_names
    assert "Hindi" in lang_names
    assert "Spanish" in lang_names

    # Check BCP-47 codes
    en_entry = next(l for l in data["supported_languages"] if l["name"] == "English")
    assert en_entry["bcp47"] == "en-US"
    hi_entry = next(l for l in data["supported_languages"] if l["name"] == "Hindi")
    assert hi_entry["bcp47"] == "hi-IN"

    assert data["features"]["multilingual_voice"] is True
    assert data["features"]["browser_stt"] is True
    assert data["features"]["browser_tts"] is True


def test_chat_voice_input_mode_and_progress_tracking():
    email = f"voice_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Voice Student", "email": email, "password": "Password123!"})
    token = test_client.post("/login", json={"email": email, "password": "Password123!"}).json()["access_token"]

    resp = test_client.post(
        "/chat",
        json={
            "message": "Explain quantum entanglement in simple terms",
            "language": "English",
            "subject": "Physics",
            "input_mode": "voice",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    chat_data = resp.json()
    assert chat_data["input_mode"] == "voice"
    assert "message" in chat_data
    assert "role" in chat_data["message"]
    assert chat_data["message"]["role"] == "assistant"

    # Verify message in database has input_mode="voice"
    from main import messages_collection, progress_collection, users_collection
    user = users_collection.find_one({"email": email})
    saved_msg = messages_collection.find_one({"conversation_id": chat_data["conversation_id"], "role": "user"})
    assert saved_msg is not None
    assert saved_msg.get("input_mode") == "voice"

    # Verify progress collection incremented voice_interactions
    prog = progress_collection.find_one({"user_id": str(user["_id"])})
    assert prog is not None
    assert prog.get("voice_interactions", 0) >= 1


def test_system_initialization_and_admin_seeding():
    cfg = platform_settings_collection.find_one({"key": "platform_config"})
    assert cfg is not None
    assert cfg.get("platform_name") is not None
    assert cfg.get("allow_student_registration") is True

    startup_log = system_logs_collection.find_one({"action": "system_startup"})
    assert startup_log is not None


def test_teacher_class_lifecycle_and_join_code():
    t_email = f"prof_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TeacherPassword123!"
    test_client.post("/register", json={"name": "Professor Alan Turing", "email": t_email, "password": pwd, "role": "teacher"})
    t_token = test_client.post("/login", json={"email": t_email, "password": pwd}).json()["access_token"]
    t_headers = {"Authorization": f"Bearer {t_token}"}

    cls_resp = test_client.post(
        "/teacher/classes",
        json={
            "name": "Distributed Systems",
            "subject": "Computer Science",
            "description": "CAP theorem, Paxos, Raft consensus protocols",
            "grade_level": "Undergraduate",
        },
        headers=t_headers,
    )
    assert cls_resp.status_code == 201
    cls_data = cls_resp.json()
    assert cls_data["name"] == "Distributed Systems"
    assert "join_code" in cls_data
    join_code = cls_data["join_code"]
    cls_id = cls_data["id"]

    list_resp = test_client.get("/teacher/classes", headers=t_headers)
    assert list_resp.status_code == 200
    assert any(c["id"] == cls_id for c in list_resp.json()["classes"])

    detail_resp = test_client.get(f"/teacher/classes/{cls_id}", headers=t_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["join_code"] == join_code

    dash_resp = test_client.get("/teacher/dashboard", headers=t_headers)
    assert dash_resp.status_code == 200
    assert dash_resp.json()["stats"]["total_classes"] >= 1


def test_student_enrollment_and_coursework_flow():
    t_email = f"prof_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Password123!"
    test_client.post("/register", json={"name": "Dr. Ada Lovelace", "email": t_email, "password": pwd, "role": "teacher"})
    t_token = test_client.post("/login", json={"email": t_email, "password": pwd}).json()["access_token"]
    t_headers = {"Authorization": f"Bearer {t_token}"}

    cls_resp = test_client.post(
        "/teacher/classes",
        json={"name": "Compiler Design", "subject": "CS", "description": "Lexing, parsing, and code generation"},
        headers=t_headers,
    )
    cls_id = cls_resp.json()["id"]
    join_code = cls_resp.json()["join_code"]

    s_email = f"student_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Charlie Student", "email": s_email, "password": pwd, "role": "student"})
    s_token = test_client.post("/login", json={"email": s_email, "password": pwd}).json()["access_token"]
    s_headers = {"Authorization": f"Bearer {s_token}"}

    join_resp = test_client.post("/classes/join", json={"join_code": join_code}, headers=s_headers)
    assert join_resp.status_code == 200
    assert "Successfully enrolled" in join_resp.json()["message"]

    s_classes = test_client.get("/student/classes", headers=s_headers)
    assert s_classes.status_code == 200
    assert any(c["id"] == cls_id for c in s_classes.json()["classes"])

    assign_resp = test_client.post(
        f"/teacher/classes/{cls_id}/assignments",
        json={
            "title": "Construct AST from Context-Free Grammar",
            "description": "Implement recursive descent parser",
            "assignment_type": "homework",
            "max_points": 100,
        },
        headers=t_headers,
    )
    assert assign_resp.status_code == 201
    assign_id = assign_resp.json()["id"]

    s_assignments = test_client.get(f"/student/classes/{cls_id}/assignments", headers=s_headers)
    assert s_assignments.status_code == 200
    assert any(a["id"] == assign_id for a in s_assignments.json()["assignments"])

    sub_resp = test_client.post(
        f"/assignments/{assign_id}/submit",
        json={"content": "Here is my AST parser implementation using Python ast module."},
        headers=s_headers,
    )
    assert sub_resp.status_code == 200
    assert sub_resp.json()["status"] == "submitted"
    sub_id = sub_resp.json()["id"]

    my_sub = test_client.get(f"/assignments/{assign_id}/my-submission", headers=s_headers)
    assert my_sub.status_code == 200
    assert my_sub.json()["submission"]["id"] == sub_id

    grade_resp = test_client.post(
        f"/teacher/submissions/{sub_id}/grade",
        json={"score": 95, "feedback": "Excellent grammar implementation with edge-case handling.", "status": "graded"},
        headers=t_headers,
    )
    assert grade_resp.status_code == 200
    assert grade_resp.json()["score"] == 95
    assert grade_resp.json()["status"] == "graded"

    my_sub_after = test_client.get(f"/assignments/{assign_id}/my-submission", headers=s_headers)
    assert my_sub_after.json()["submission"]["status"] == "graded"
    assert my_sub_after.json()["submission"]["score"] == 95

    analytics_resp = test_client.get(f"/teacher/classes/{cls_id}/analytics", headers=t_headers)
    assert analytics_resp.status_code == 200
    analytics_data = analytics_resp.json()
    assert analytics_data["overview"]["total_students"] == 1
    assert analytics_data["overview"]["total_submissions"] == 1
    assert analytics_data["overview"]["class_average_score"] == 95.0


def test_rbac_security_and_permission_enforcement():
    s_email = f"strict_student_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Password123!"
    test_client.post("/register", json={"name": "Strict Student", "email": s_email, "password": pwd, "role": "student"})
    s_token = test_client.post("/login", json={"email": s_email, "password": pwd}).json()["access_token"]
    s_headers = {"Authorization": f"Bearer {s_token}"}

    resp = test_client.get("/teacher/dashboard", headers=s_headers)
    assert resp.status_code == 403

    resp = test_client.post("/teacher/classes", json={"name": "Hacked Class", "subject": "CS"}, headers=s_headers)
    assert resp.status_code == 403

    resp = test_client.get("/admin/dashboard", headers=s_headers)
    assert resp.status_code == 403

    resp = test_client.get("/admin/system-health", headers=s_headers)
    assert resp.status_code == 403


def test_admin_portal_management_and_governance():
    from main import users_collection
    a_email = f"admin_{uuid.uuid4().hex[:8]}@mentora.ai"
    pwd = "AdminSecurePassword123!"
    test_client.post("/register", json={"name": "Platform Admin", "email": a_email, "password": pwd, "role": "student"})
    users_collection.update_one({"email": a_email}, {"$set": {"role": "admin"}})

    a_token = test_client.post("/login", json={"email": a_email, "password": pwd}).json()["access_token"]
    a_headers = {"Authorization": f"Bearer {a_token}"}

    dash_resp = test_client.get("/admin/dashboard", headers=a_headers)
    assert dash_resp.status_code == 200
    assert "user_counts" in dash_resp.json()

    users_resp = test_client.get("/admin/users?role=admin", headers=a_headers)
    assert users_resp.status_code == 200
    assert users_resp.json()["total"] >= 1

    target_email = f"promote_{uuid.uuid4().hex[:8]}@example.com"
    test_client.post("/register", json={"name": "Future Teacher", "email": target_email, "password": pwd})
    target_user = users_collection.find_one({"email": target_email})
    target_id = str(target_user["_id"])

    role_resp = test_client.put(f"/admin/users/{target_id}/role", json={"role": "teacher"}, headers=a_headers)
    assert role_resp.status_code == 200
    assert role_resp.json()["role"] == "teacher"

    admin_user = users_collection.find_one({"email": a_email})
    self_demote_resp = test_client.put(f"/admin/users/{str(admin_user['_id'])}/role", json={"role": "student"}, headers=a_headers)
    assert self_demote_resp.status_code == 400

    health_resp = test_client.get("/admin/system-health", headers=a_headers)
    assert health_resp.status_code == 200
    assert "database" in health_resp.json()
    assert health_resp.json()["database"]["status"] == "operational"

    logs_resp = test_client.get("/admin/logs", headers=a_headers)
    assert logs_resp.status_code == 200
    assert len(logs_resp.json()["logs"]) >= 1

    settings_resp = test_client.get("/admin/settings", headers=a_headers)
    assert settings_resp.status_code == 200
    assert settings_resp.json()["platform_name"] is not None

    update_settings_resp = test_client.put(
        "/admin/settings",
        json={"platform_name": "Mentora AI Enterprise", "max_upload_size_mb": 50},
        headers=a_headers,
    )
    assert update_settings_resp.status_code == 200
    assert update_settings_resp.json()["settings"]["platform_name"] == "Mentora AI Enterprise"
    assert update_settings_resp.json()["settings"]["max_upload_size_mb"] == 50


def test_gamification_summary_and_levels():
    email = f"gamer_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "GamerPassword123!"
    test_client.post("/register", json={"name": "Alice Gamer", "email": email, "password": pwd, "role": "student"})
    token = test_client.post("/login", json={"email": email, "password": pwd}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = test_client.get("/gamification/summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "xp_points" in data
    assert "level" in data
    assert data["level"] >= 1
    assert "badges" in data
    assert len(data["badges"]) >= 10
    assert "weekly_challenges" in data
    assert len(data["weekly_challenges"]) == 3
    assert "rank" in data


def test_xp_progression_and_badge_unlocking():
    from datetime import datetime, timezone
    email = f"xp_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Password123!"
    test_client.post("/register", json={"name": "Bob Achiever", "email": email, "password": pwd, "role": "student"})
    token = test_client.post("/login", json={"email": email, "password": pwd}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    summary_before = test_client.get("/gamification/summary", headers=headers).json()
    init_xp = summary_before["xp_points"]

    from main import users_collection
    u = users_collection.find_one({"email": email})
    quiz_id = quizzes_collection.insert_one({
        "user_id": str(u["_id"]),
        "subject": "Computer Science",
        "topic": "Algorithms",
        "language": "English",
        "questions": [
            {
                "question": "Time complexity of binary search?",
                "options": ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
                "correct_index": 1,
                "explanation": "Binary search divides the search space in half."
            }
        ],
        "created_at": datetime.now(timezone.utc),
    }).inserted_id

    sub_resp = test_client.post(
        f"/quizzes/{str(quiz_id)}/submit",
        json={"quiz_id": str(quiz_id), "answers": [1]},
        headers=headers,
    )
    assert sub_resp.status_code == 200

    summary_after = test_client.get("/gamification/summary", headers=headers).json()
    assert summary_after["xp_points"] > init_xp
    first_quiz_badge = next(b for b in summary_after["badges"] if b["badge_id"] == "first_quiz")
    assert first_quiz_badge["earned"] is True
    assert first_quiz_badge["earned_at"] != ""


def test_gamification_leaderboard():
    email = f"lead_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Password123!"
    test_client.post("/register", json={"name": "Leaderboard Student", "email": email, "password": pwd, "role": "student"})
    token = test_client.post("/login", json={"email": email, "password": pwd}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = test_client.get("/gamification/leaderboard", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "leaderboard" in data
    assert "my_rank" in data
    assert isinstance(data["leaderboard"], list)
    if len(data["leaderboard"]) > 0:
        entry = data["leaderboard"][0]
        assert "rank" in entry
        assert "name" in entry
        assert "xp_points" in entry


def test_student_performance_pdf_generation():
    email = f"pdf_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Password123!"
    test_client.post("/register", json={"name": "David Scholar", "email": email, "password": pwd, "role": "student"})
    token = test_client.post("/login", json={"email": email, "password": pwd}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sum_resp = test_client.get("/reports/summary", headers=headers)
    assert sum_resp.status_code == 200
    assert sum_resp.json()["student"]["name"] == "David Scholar"

    pdf_resp = test_client.get("/reports/performance/pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert "attachment;" in pdf_resp.headers["content-disposition"]
    assert pdf_resp.content.startswith(b"%PDF-")
    assert len(pdf_resp.content) > 1000


def test_certificate_criteria_enforcement_and_pdf():
    from datetime import datetime, timezone
    email = f"cert_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Password123!"
    test_client.post("/register", json={"name": "Elena Turing", "email": email, "password": pwd, "role": "student"})
    token = test_client.post("/login", json={"email": email, "password": pwd}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    fail_resp = test_client.get("/certificates/pdf?subject=Quantum%20Computing", headers=headers)
    assert fail_resp.status_code == 400
    assert "Completion criteria not met" in fail_resp.json()["detail"]

    from main import users_collection
    u = users_collection.find_one({"email": email})
    lp_id = learning_paths_collection.insert_one({
        "user_id": str(u["_id"]),
        "subject": "Quantum Computing",
        "knowledge_level": "Advanced",
        "learning_goal": "Quantum Algorithms & Qiskit Implementation",
        "progress_percentage": 100.0,
        "completed_lessons": 10,
        "status": "completed",
        "daily_plans": [],
        "created_at": datetime.now(timezone.utc),
    }).inserted_id

    elig_resp = test_client.get("/certificates/eligibility", headers=headers)
    assert elig_resp.status_code == 200
    qc_cert = next(c for c in elig_resp.json()["certificates"] if c.get("learning_path_id") == str(lp_id))
    assert qc_cert["eligible"] is True

    cert_resp = test_client.get(
        f"/certificates/pdf?subject=Quantum%20Computing&learning_path_id={str(lp_id)}",
        headers=headers,
    )
    assert cert_resp.status_code == 200
    assert cert_resp.headers["content-type"] == "application/pdf"
    assert "attachment;" in cert_resp.headers["content-disposition"]
    assert cert_resp.content.startswith(b"%PDF-")
    assert len(cert_resp.content) > 1000




