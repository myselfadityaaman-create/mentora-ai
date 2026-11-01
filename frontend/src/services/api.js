const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// --------------------------------------------------
// Helper: get stored auth token
// --------------------------------------------------
function getToken() {
  return localStorage.getItem("mentora_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(response) {
  const isAuthEndpoint = response.url && (response.url.endsWith("/login") || response.url.endsWith("/register"));

  if (response.status === 401 && !isAuthEndpoint) {
    // Token expired or invalid — clear auth
    localStorage.removeItem("mentora_token");
    localStorage.removeItem("mentora_user");
    // Only redirect if we're not already on login/register/home
    const path = window.location.pathname;
    if (!["/", "/login", "/register"].includes(path) && !path.startsWith("/auth")) {
      window.location.href = "/login?error=session_expired";
    }
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json();

  if (!response.ok) {
    const message = data.detail || data.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

// --------------------------------------------------
// Health checks
// --------------------------------------------------

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return handleResponse(response);
}

export async function checkDatabaseHealth() {
  const response = await fetch(`${API_BASE_URL}/db-health`);
  return handleResponse(response);
}

// --------------------------------------------------
// Authentication
// --------------------------------------------------

export async function registerUser(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(response);
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(response);

  // Store token and user info
  if (data.access_token) {
    localStorage.setItem("mentora_token", data.access_token);
    localStorage.setItem("mentora_user", JSON.stringify(data.user));
  }

  return data;
}

export function getGoogleLoginUrl() {
  return `${API_BASE_URL}/auth/google/login`;
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function updateProfile(updates) {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(updates),
  });
  return handleResponse(response);
}

export function logout() {
  localStorage.removeItem("mentora_token");
  localStorage.removeItem("mentora_user");
  window.location.href = "/login";
}

// --------------------------------------------------
// Conversations
// --------------------------------------------------

export async function createConversation(title, subject) {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title, subject }),
  });
  return handleResponse(response);
}

export async function listConversations() {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getConversation(conversationId) {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function deleteConversation(conversationId) {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Chat
// --------------------------------------------------

export async function sendMessage(message, conversationId, subject, language, documentId, inputMode = "text") {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      message,
      conversation_id: conversationId || null,
      subject: subject || null,
      language: language || "English",
      document_id: documentId || null,
      input_mode: inputMode,
    }),
  });
  return handleResponse(response);
}

export async function getVoiceLanguages() {
  const response = await fetch(`${API_BASE_URL}/tutor/voice/languages`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Quizzes
// --------------------------------------------------

export async function generateQuiz(subject, topic, language, numQuestions) {
  const response = await fetch(`${API_BASE_URL}/quizzes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      subject,
      topic,
      language: language || "English",
      num_questions: numQuestions || 5,
    }),
  });
  return handleResponse(response);
}

export async function submitQuiz(quizId, answers) {
  const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ quiz_id: quizId, answers }),
  });
  return handleResponse(response);
}

export async function listQuizzes() {
  const response = await fetch(`${API_BASE_URL}/quizzes`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getQuiz(quizId) {
  const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Adaptive Quizzes (Phase 4)
// --------------------------------------------------

export async function recommendAdaptiveDifficulty(subject, topic) {
  const url = new URL(`${API_BASE_URL}/quizzes/adaptive/recommend-difficulty`);
  if (subject) url.searchParams.append("subject", subject);
  if (topic) url.searchParams.append("topic", topic);

  const response = await fetch(url.toString(), {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function startAdaptiveQuiz(subject, topic, initialDifficulty = "intermediate", numQuestions = 5, language = "English") {
  const response = await fetch(`${API_BASE_URL}/quizzes/adaptive/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      subject,
      topic,
      initial_difficulty: initialDifficulty,
      num_questions: Number(numQuestions) || 5,
      language: language || "English",
    }),
  });
  return handleResponse(response);
}

export async function submitAdaptiveAnswer(quizId, selectedOption, timeTakenSeconds = 0) {
  const response = await fetch(`${API_BASE_URL}/quizzes/adaptive/${quizId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      selected_option: selectedOption,
      time_taken_seconds: Number(timeTakenSeconds) || 0,
    }),
  });
  return handleResponse(response);
}

export async function getAdaptiveQuiz(quizId) {
  const response = await fetch(`${API_BASE_URL}/quizzes/adaptive/${quizId}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Documents & Study Materials (RAG - Phase 2)
// --------------------------------------------------

export async function uploadDocument(file, title, subject, force = false) {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  if (subject) formData.append("subject", subject);
  if (force) formData.append("force", "true");

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    headers: authHeaders(), // browser sets multipart boundary automatically
    body: formData,
  });
  return handleResponse(response);
}

export async function getDocumentPreview(documentId) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/preview`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function listDocuments(subject) {
  const url = new URL(`${API_BASE_URL}/documents`);
  if (subject) url.searchParams.append("subject", subject);

  const response = await fetch(url.toString(), {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getDocument(documentId) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getDocumentChunks(documentId, page = 1, limit = 20) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/chunks?page=${page}&limit=${limit}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function deleteDocument(documentId) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function searchDocuments(query, documentId = null, topK = 4) {
  const response = await fetch(`${API_BASE_URL}/documents/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ query, document_id: documentId, top_k: topK }),
  });
  return handleResponse(response);
}

export async function getDocumentStudyGuide(documentId) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/study-guide`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function generateQuizFromDocument(documentId, numQuestions = 5, language = "English") {
  const response = await fetch(`${API_BASE_URL}/quizzes/generate-from-document`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      document_id: documentId,
      num_questions: numQuestions,
      language,
    }),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// AI Configuration Settings
// --------------------------------------------------

export async function getAIStatus() {
  const response = await fetch(`${API_BASE_URL}/settings/ai-status`);
  return handleResponse(response);
}

export async function saveAIKey(apiKey, model) {
  const response = await fetch(`${API_BASE_URL}/settings/ai-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ api_key: apiKey, model: model || "gemini-3.8-flash" }),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Learning Paths (Phase 2)
// --------------------------------------------------

export async function generateLearningPath(subject, knowledgeLevel, learningGoal, targetCompletionDate, dailyStudyTimeMinutes) {
  const response = await fetch(`${API_BASE_URL}/learning-paths/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      subject,
      knowledge_level: knowledgeLevel,
      learning_goal: learningGoal,
      target_completion_date: targetCompletionDate || null,
      daily_study_time_minutes: Number(dailyStudyTimeMinutes) || 45,
    }),
  });
  return handleResponse(response);
}

export async function listLearningPaths() {
  const response = await fetch(`${API_BASE_URL}/learning-paths`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getLearningPath(pathId) {
  const response = await fetch(`${API_BASE_URL}/learning-paths/${pathId}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function updateLessonStatus(pathId, lessonId, completed) {
  const response = await fetch(`${API_BASE_URL}/learning-paths/${pathId}/lessons/${lessonId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ completed }),
  });
  return handleResponse(response);
}

export async function getNextRecommendedTopic(pathId) {
  const response = await fetch(`${API_BASE_URL}/learning-paths/${pathId}/next-topic`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function adjustLearningPath(pathId, pace = "maintain", dailyStudyTimeMinutes = null, focusTopic = null) {
  const response = await fetch(`${API_BASE_URL}/learning-paths/${pathId}/adjust`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      pace,
      daily_study_time_minutes: dailyStudyTimeMinutes ? Number(dailyStudyTimeMinutes) : null,
      focus_topic: focusTopic || null,
    }),
  });
  return handleResponse(response);
}

export async function deleteLearningPath(pathId) {
  const response = await fetch(`${API_BASE_URL}/learning-paths/${pathId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Student Performance & Weakness Analysis (Phase 3)
// --------------------------------------------------

export async function getStudentPerformance() {
  const response = await fetch(`${API_BASE_URL}/analytics/performance`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function evaluateStudentPerformance() {
  const response = await fetch(`${API_BASE_URL}/analytics/performance/evaluate`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getTopicDiagnostic(topicName) {
  const response = await fetch(`${API_BASE_URL}/analytics/topics/${encodeURIComponent(topicName)}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getDashboardAnalytics() {
  const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Spaced Repetition & Flashcards (Phase 5)
// --------------------------------------------------

export async function listFlashcards(queue = "all", status = null, topic = null, subject = null, limit = 100, skip = 0) {
  const url = new URL(`${API_BASE_URL}/flashcards`);
  if (queue) url.searchParams.append("queue", queue);
  if (status) url.searchParams.append("status", status);
  if (topic) url.searchParams.append("topic", topic);
  if (subject) url.searchParams.append("subject", subject);
  if (limit) url.searchParams.append("limit", limit);
  if (skip) url.searchParams.append("skip", skip);

  const response = await fetch(url.toString(), {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getFlashcardStats() {
  const response = await fetch(`${API_BASE_URL}/flashcards/stats`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function createFlashcard(question, answer, topic, subject = "General", difficulty = "Intermediate", tags = []) {
  const response = await fetch(`${API_BASE_URL}/flashcards`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question, answer, topic, subject, difficulty, tags }),
  });
  return handleResponse(response);
}

export async function generateFlashcardsByTopic(subject, topic, count = 5, language = "English") {
  const response = await fetch(`${API_BASE_URL}/flashcards/generate/topic`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ subject, topic, count: Number(count) || 5, language }),
  });
  return handleResponse(response);
}

export async function generateFlashcardsFromDocument(documentId) {
  const response = await fetch(`${API_BASE_URL}/flashcards/generate/document/${documentId}`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function generateFlashcardsFromConversation(conversationId) {
  const response = await fetch(`${API_BASE_URL}/flashcards/generate/conversation/${conversationId}`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function generateFlashcardsFromLearningPath(pathId) {
  const response = await fetch(`${API_BASE_URL}/flashcards/generate/learning-path/${pathId}`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function reviewFlashcard(cardId, rating, timeTakenSeconds = 5) {
  const response = await fetch(`${API_BASE_URL}/flashcards/${cardId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ rating, time_taken_seconds: Number(timeTakenSeconds) || 5 }),
  });
  return handleResponse(response);
}

export async function updateFlashcard(cardId, updates) {
  const response = await fetch(`${API_BASE_URL}/flashcards/${cardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(updates),
  });
  return handleResponse(response);
}

export async function deleteFlashcard(cardId) {
  const response = await fetch(`${API_BASE_URL}/flashcards/${cardId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Progress
// --------------------------------------------------

export async function getProgress() {
  const response = await fetch(`${API_BASE_URL}/progress`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Teacher Portal APIs
// --------------------------------------------------

export async function getTeacherDashboard() {
  const response = await fetch(`${API_BASE_URL}/teacher/dashboard`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function createClass(classData) {
  const response = await fetch(`${API_BASE_URL}/teacher/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(classData),
  });
  return handleResponse(response);
}

export async function getTeacherClasses() {
  const response = await fetch(`${API_BASE_URL}/teacher/classes`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getClassDetails(classId) {
  const response = await fetch(`${API_BASE_URL}/teacher/classes/${classId}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function updateClass(classId, updates) {
  const response = await fetch(`${API_BASE_URL}/teacher/classes/${classId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(updates),
  });
  return handleResponse(response);
}

export async function deleteClass(classId) {
  const response = await fetch(`${API_BASE_URL}/teacher/classes/${classId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function addStudentToClass(classId, email) {
  const response = await fetch(`${API_BASE_URL}/teacher/classes/${classId}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email }),
  });
  return handleResponse(response);
}

export async function removeStudentFromClass(classId, studentId) {
  const response = await fetch(`${API_BASE_URL}/teacher/classes/${classId}/students/${studentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function createAssignment(classId, assignmentData) {
  const response = await fetch(`${API_BASE_URL}/teacher/classes/${classId}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(assignmentData),
  });
  return handleResponse(response);
}

export async function getClassAssignments(classId) {
  const response = await fetch(`${API_BASE_URL}/teacher/classes/${classId}/assignments`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getAssignmentDetails(assignmentId) {
  const response = await fetch(`${API_BASE_URL}/teacher/assignments/${assignmentId}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function deleteAssignment(assignmentId) {
  const response = await fetch(`${API_BASE_URL}/teacher/assignments/${assignmentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function gradeSubmission(submissionId, score, feedback, status = "graded") {
  const response = await fetch(`${API_BASE_URL}/teacher/submissions/${submissionId}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ score: Number(score), feedback, status }),
  });
  return handleResponse(response);
}

export async function getClassAnalytics(classId) {
  const response = await fetch(`${API_BASE_URL}/teacher/classes/${classId}/analytics`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Student Class Interaction APIs
// --------------------------------------------------

export async function joinClass(joinCode) {
  const response = await fetch(`${API_BASE_URL}/classes/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ join_code: joinCode }),
  });
  return handleResponse(response);
}

export async function getStudentClasses() {
  const response = await fetch(`${API_BASE_URL}/student/classes`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getStudentClassAssignments(classId) {
  const response = await fetch(`${API_BASE_URL}/student/classes/${classId}/assignments`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function submitAssignment(assignmentId, submissionData) {
  const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(submissionData),
  });
  return handleResponse(response);
}

export async function getMySubmission(assignmentId) {
  const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/my-submission`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Admin Portal APIs
// --------------------------------------------------

export async function getAdminDashboard() {
  const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getAdminUsers({ q = "", role = "all", page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  params.set("page", page);
  params.set("limit", limit);

  const response = await fetch(`${API_BASE_URL}/admin/users?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function updateAdminUserRole(userId, role) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  return handleResponse(response);
}

export async function deleteAdminUser(userId) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getAdminLogs({ level = "all", action = "", limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (level) params.set("level", level);
  if (action) params.set("action", action);
  params.set("limit", limit);

  const response = await fetch(`${API_BASE_URL}/admin/logs?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getAdminSystemHealth() {
  const response = await fetch(`${API_BASE_URL}/admin/system-health`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getAdminSettings() {
  const response = await fetch(`${API_BASE_URL}/admin/settings`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function updateAdminSettings(settings) {
  const response = await fetch(`${API_BASE_URL}/admin/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(settings),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Gamification & Rewards APIs
// --------------------------------------------------

export async function getGamificationSummary() {
  const response = await fetch(`${API_BASE_URL}/gamification/summary`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getGamificationLeaderboard() {
  const response = await fetch(`${API_BASE_URL}/gamification/leaderboard`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function triggerGamificationEvaluate() {
  const response = await fetch(`${API_BASE_URL}/gamification/evaluate`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// --------------------------------------------------
// Academic Reports & Certificates APIs
// --------------------------------------------------

export async function getReportSummary() {
  const response = await fetch(`${API_BASE_URL}/reports/summary`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function downloadStudentPerformancePdf() {
  const token = localStorage.getItem("mentora_token");
  const response = await fetch(`${API_BASE_URL}/reports/performance/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to download performance report");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mentora_academic_report_${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function getCertificateEligibility() {
  const response = await fetch(`${API_BASE_URL}/certificates/eligibility`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function downloadCertificatePdf(subject, learningPathId = null) {
  const token = localStorage.getItem("mentora_token");
  const params = new URLSearchParams({ subject });
  if (learningPathId) params.set("learning_path_id", learningPathId);

  const response = await fetch(`${API_BASE_URL}/certificates/pdf?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Certificate criteria not satisfied");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mentora_certificate_${subject.toLowerCase().replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default API_BASE_URL;
