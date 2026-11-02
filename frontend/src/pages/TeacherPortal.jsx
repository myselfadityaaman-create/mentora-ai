import { useState, useEffect, useCallback } from "react";
import {
  getTeacherDashboard,
  getTeacherClasses,
  createClass,
  getClassDetails,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
  createAssignment,
  getAssignmentDetails,
  deleteAssignment,
  gradeSubmission,
  getClassAnalytics,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

export default function TeacherPortal() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [classes, setClasses] = useState([]);
  const [activeTab, setActiveTab] = useState("classes"); // "classes" | "grading" | "class_detail"

  // Active Selected Class State
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassData, setSelectedClassData] = useState(null);
  const [classSubTab, setClassSubTab] = useState("assignments"); // "assignments" | "roster" | "analytics"
  const [classAnalytics, setClassAnalytics] = useState(null);

  // Modals & Forms
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassForm, setNewClassForm] = useState({
    name: "",
    subject: "",
    description: "",
    grade_level: "Undergraduate",
  });
  const [creatingClass, setCreatingClass] = useState(false);

  const [showCreateAssignModal, setShowCreateAssignModal] = useState(false);
  const [newAssignForm, setNewAssignForm] = useState({
    title: "",
    description: "",
    assignment_type: "homework",
    due_date: "",
    max_points: 100,
  });
  const [creatingAssign, setCreatingAssign] = useState(false);

  // Add Student
  const [addStudentEmail, setAddStudentEmail] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  // Grading Modal / Drawer
  const [activeAssignmentForGrading, setActiveAssignmentForGrading] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState(85);
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, classesRes] = await Promise.all([
        getTeacherDashboard(),
        getTeacherClasses(),
      ]);
      setStats(dashRes.stats);
      setClasses(classesRes.classes || []);
    } catch (err) {
      setError(err.message || "Failed to load instructor portal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const loadClassDetail = async (clsId) => {
    try {
      setLoadingDetail(true);
      setSelectedClassId(clsId);
      setActiveTab("class_detail");
      const [detailRes, analyticsRes] = await Promise.all([
        getClassDetails(clsId),
        getClassAnalytics(clsId).catch(() => null),
      ]);
      setSelectedClassData(detailRes);
      setClassAnalytics(analyticsRes);
    } catch (err) {
      alert("Error loading class: " + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassForm.name.trim() || !newClassForm.subject.trim()) return;
    try {
      setCreatingClass(true);
      await createClass(newClassForm);
      setShowCreateClassModal(false);
      setNewClassForm({
        name: "",
        subject: "",
        description: "",
        grade_level: "Undergraduate",
      });
      await fetchOverview();
    } catch (err) {
      alert("Failed to create class: " + err.message);
    } finally {
      setCreatingClass(false);
    }
  };

  const handleDeleteClass = async (clsId, clsName) => {
    if (!window.confirm(`Are you sure you want to delete "${clsName}" and all associated assignments?`)) return;
    try {
      await deleteClass(clsId);
      if (selectedClassId === clsId) {
        setSelectedClassId(null);
        setSelectedClassData(null);
        setActiveTab("classes");
      }
      await fetchOverview();
    } catch (err) {
      alert("Failed to delete class: " + err.message);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!addStudentEmail.trim() || !selectedClassId) return;
    try {
      setAddingStudent(true);
      await addStudentToClass(selectedClassId, addStudentEmail.trim());
      setAddStudentEmail("");
      // Refresh class details
      const updated = await getClassDetails(selectedClassId);
      setSelectedClassData(updated);
      await fetchOverview();
    } catch (err) {
      alert("Enrollment failed: " + err.message);
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm("Remove this student from class?")) return;
    try {
      await removeStudentFromClass(selectedClassId, studentId);
      const updated = await getClassDetails(selectedClassId);
      setSelectedClassData(updated);
      await fetchOverview();
    } catch (err) {
      alert("Failed to remove student: " + err.message);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignForm.title.trim() || !selectedClassId) return;
    try {
      setCreatingAssign(true);
      await createAssignment(selectedClassId, newAssignForm);
      setShowCreateAssignModal(false);
      setNewAssignForm({
        title: "",
        description: "",
        assignment_type: "homework",
        due_date: "",
        max_points: 100,
      });
      const updated = await getClassDetails(selectedClassId);
      setSelectedClassData(updated);
      await fetchOverview();
    } catch (err) {
      alert("Failed to create assignment: " + err.message);
    } finally {
      setCreatingAssign(false);
    }
  };

  const handleDeleteAssignment = async (assignId) => {
    if (!window.confirm("Delete this assignment and all its submissions?")) return;
    try {
      await deleteAssignment(assignId);
      const updated = await getClassDetails(selectedClassId);
      setSelectedClassData(updated);
      if (activeAssignmentForGrading?.id === assignId) {
        setActiveAssignmentForGrading(null);
      }
      await fetchOverview();
    } catch (err) {
      alert("Failed to delete assignment: " + err.message);
    }
  };

  const openGradingForAssignment = async (assign) => {
    try {
      const details = await getAssignmentDetails(assign.id);
      setActiveAssignmentForGrading(details);
      setSubmissionsList(details.submissions || []);
    } catch (err) {
      alert("Failed to load submissions: " + err.message);
    }
  };

  const openGradeModal = (submission) => {
    setGradingSubmission(submission);
    setGradeScore(submission.score !== null && submission.score !== undefined ? submission.score : 85);
    setGradeFeedback(submission.feedback || "");
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    try {
      setSavingGrade(true);
      await gradeSubmission(gradingSubmission.id, gradeScore, gradeFeedback, "graded");
      // Update local submissions list
      setSubmissionsList((prev) =>
        prev.map((s) =>
          s.id === gradingSubmission.id
            ? { ...s, score: Number(gradeScore), feedback: gradeFeedback, status: "graded" }
            : s
        )
      );
      setGradingSubmission(null);
      await fetchOverview();
    } catch (err) {
      alert("Grading error: " + err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-8">
          <LoadingSpinner message="Loading Teacher Portal..." />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Teacher Portal
              </span>
              <span className="text-xs text-slate-400">Classroom Management & Diagnostic Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Faculty Command Center</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateClassModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-amber-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Class</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="my-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Global Statistics Banner */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 my-6">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">My Classes</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.total_classes}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Total Students</div>
              <div className="text-2xl font-bold text-blue-400 mt-1">{stats.total_students}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Assignments</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.total_assignments}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Pending Review</div>
              <div className={`text-2xl font-bold mt-1 ${stats.pending_submissions > 0 ? "text-amber-400" : "text-slate-300"}`}>
                {stats.pending_submissions}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Average Grade</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {stats.average_grade ? `${stats.average_grade}%` : "—"}
              </div>
            </div>
          </div>
        )}

        {/* Primary Tabs */}
        <div className="flex border-b border-slate-800 mb-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab("classes")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "classes"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Classes</span>
            <span className="text-xs rounded-full px-2 py-0.5 bg-slate-800 text-slate-300 font-normal">
              {classes.length}
            </span>
          </button>

          {selectedClassData && (
            <button
              onClick={() => setActiveTab("class_detail")}
              className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
                activeTab === "class_detail"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{selectedClassData.name}</span>
              <span className="text-xs rounded px-1.5 py-0.5 bg-amber-500/20 text-amber-400 font-mono">
                {selectedClassData.join_code}
              </span>
            </button>
          )}
        </div>

        {/* TAB 1: ALL CLASSES */}
        {activeTab === "classes" && (
          <div>
            {classes.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No Active Classes Yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  Create your first class to begin publishing assignments, enrolling students, and reviewing AI-powered performance diagnostics.
                </p>
                <button
                  onClick={() => setShowCreateClassModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm"
                >
                  Create Your First Class
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {cls.subject}
                        </span>
                        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded text-xs">
                          <span className="text-slate-400">Code:</span>
                          <span className="font-mono font-bold text-amber-400">{cls.join_code}</span>
                          <button
                            onClick={() => copyToClipboard(cls.join_code)}
                            title="Copy Join Code"
                            className="text-slate-400 hover:text-white ml-0.5"
                          >
                            {copiedCode === cls.join_code ? (
                              <span className="text-emerald-400 text-[10px]">✓</span>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1.5">{cls.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                        {cls.description || "No description provided."}
                      </p>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs mb-4">
                        <div>
                          <span className="text-slate-500">Students: </span>
                          <span className="font-bold text-white">{cls.student_count || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Assignments: </span>
                          <span className="font-bold text-white">{cls.assignment_count || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => loadClassDetail(cls.id)}
                        className="flex-1 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold text-center transition"
                      >
                        Open Workspace
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        title="Delete Class"
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SELECTED CLASS WORKSPACE */}
        {activeTab === "class_detail" && selectedClassData && (
          <div>
            {/* Class Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setActiveTab("classes")}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mr-2"
                  >
                    ← All Classes
                  </button>
                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {selectedClassData.subject}
                  </span>
                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedClassData.grade_level}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedClassData.name}</h2>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  {selectedClassData.description || "Classroom instruction and continuous assessment module."}
                </p>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400">Class Join Code:</span>
                  <span className="text-base font-mono font-bold text-amber-400 tracking-wider">
                    {selectedClassData.join_code}
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedClassData.join_code)}
                    className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    {copiedCode === selectedClassData.join_code ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-tabs inside Class */}
            <div className="flex border-b border-slate-800 mb-6 space-x-6 text-sm">
              <button
                onClick={() => setClassSubTab("assignments")}
                className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
                  classSubTab === "assignments"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Assignments</span>
                <span className="text-xs rounded-full px-2 py-0.5 bg-slate-800 text-slate-300">
                  {selectedClassData.assignments?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setClassSubTab("roster")}
                className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
                  classSubTab === "roster"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Student Roster</span>
                <span className="text-xs rounded-full px-2 py-0.5 bg-slate-800 text-slate-300">
                  {selectedClassData.students?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setClassSubTab("analytics")}
                className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
                  classSubTab === "analytics"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Class Diagnostics & Mastery</span>
                <span className="text-xs rounded px-1.5 py-0.5 bg-purple-500/20 text-purple-400 font-bold">
                  AI/ML
                </span>
              </button>
            </div>

            {/* SUB-TAB A: ASSIGNMENTS */}
            {classSubTab === "assignments" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Coursework & Assessments</h3>
                  <button
                    onClick={() => setShowCreateAssignModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    + Add Assignment
                  </button>
                </div>

                {(!selectedClassData.assignments || selectedClassData.assignments.length === 0) ? (
                  <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-sm text-slate-400 mb-3">No assignments created yet for this class.</p>
                    <button
                      onClick={() => setShowCreateAssignModal(true)}
                      className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold"
                    >
                      Create First Assignment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedClassData.assignments.map((assign) => (
                      <div
                        key={assign.id}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {assign.assignment_type}
                            </span>
                            <span className="text-xs text-slate-400">
                              Max Points: <strong className="text-white">{assign.max_points}</strong>
                            </span>
                            {assign.due_date && (
                              <span className="text-xs text-slate-400">
                                • Due: <strong className="text-amber-400">{new Date(assign.due_date).toLocaleDateString()}</strong>
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-white">{assign.title}</h4>
                          {assign.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{assign.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right text-xs">
                            <div className="text-slate-300 font-semibold">
                              {assign.submission_count || 0} Submissions
                            </div>
                            <div className="text-slate-500">
                              {assign.graded_count || 0} Graded
                            </div>
                          </div>

                          <button
                            onClick={() => openGradingForAssignment(assign)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs transition"
                          >
                            Review & Grade
                          </button>

                          <button
                            onClick={() => handleDeleteAssignment(assign.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition"
                            title="Delete Assignment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submissions Section for Selected Assignment */}
                {activeAssignmentForGrading && (
                  <div className="mt-8 p-6 rounded-2xl bg-slate-900 border border-slate-700">
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-bold text-amber-400">Grading Console</span>
                        <h4 className="text-lg font-bold text-white">{activeAssignmentForGrading.title}</h4>
                      </div>
                      <button
                        onClick={() => setActiveAssignmentForGrading(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        ✕ Close Console
                      </button>
                    </div>

                    {submissionsList.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">
                        No submissions received yet from enrolled students.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                            <tr>
                              <th className="p-3">Student</th>
                              <th className="p-3">Submitted At</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Score</th>
                              <th className="p-3">Feedback</th>
                              <th className="p-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-200">
                            {submissionsList.map((sub) => (
                              <tr key={sub.id} className="hover:bg-slate-800/40">
                                <td className="p-3">
                                  <div className="font-semibold text-white">{sub.student_name}</div>
                                  <div className="text-[11px] text-slate-400">{sub.student_email}</div>
                                </td>
                                <td className="p-3 text-slate-400">
                                  {new Date(sub.submitted_at).toLocaleString()}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      sub.status === "graded"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-amber-500/20 text-amber-400"
                                    }`}
                                  >
                                    {sub.status}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-white">
                                  {sub.score !== null && sub.score !== undefined ? `${sub.score} / ${activeAssignmentForGrading.max_points}` : "—"}
                                </td>
                                <td className="p-3 max-w-xs truncate text-slate-400">
                                  {sub.feedback || "—"}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => openGradeModal(sub)}
                                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs"
                                  >
                                    {sub.status === "graded" ? "Edit Grade" : "Grade"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB B: STUDENT ROSTER */}
            {classSubTab === "roster" && (
              <div>
                {/* Enrollment Bar */}
                <form
                  onSubmit={handleAddStudent}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 flex flex-col sm:flex-row items-center gap-3"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Enroll Student by Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={addStudentEmail}
                      onChange={(e) => setAddStudentEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingStudent}
                    className="w-full sm:w-auto mt-auto px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition disabled:opacity-50"
                  >
                    {addingStudent ? "Enrolling..." : "+ Enroll Student"}
                  </button>
                </form>

                {(!selectedClassData.students || selectedClassData.students.length === 0) ? (
                  <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-sm text-slate-400 mb-2">No students enrolled yet.</p>
                    <p className="text-xs text-slate-500">
                      Students can join using code <strong className="text-amber-400 font-mono">{selectedClassData.join_code}</strong> or you can invite them above.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Email Address</th>
                          <th className="p-3">Language</th>
                          <th className="p-3">Role</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {selectedClassData.students.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-semibold text-white">{st.name}</td>
                            <td className="p-3 text-slate-400">{st.email}</td>
                            <td className="p-3">{st.preferred_language || "English"}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300">
                                {st.role || "student"}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleRemoveStudent(st.id)}
                                className="text-xs text-slate-500 hover:text-red-400 transition"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB C: CLASS DIAGNOSTICS & ANALYTICS */}
            {classSubTab === "analytics" && classAnalytics && (
              <div className="space-y-6">
                {/* Analytics Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Enrolled Students</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {classAnalytics.overview.total_students}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Class Average Score</div>
                    <div className="text-2xl font-bold text-purple-400 mt-1">
                      {classAnalytics.overview.class_average_score}%
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Completion Rate</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                      {classAnalytics.overview.completion_rate_percentage}%
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">At-Risk Students</div>
                    <div className={`text-2xl font-bold mt-1 ${classAnalytics.overview.at_risk_students_count > 0 ? "text-rose-400" : "text-slate-300"}`}>
                      {classAnalytics.overview.at_risk_students_count}
                    </div>
                  </div>
                </div>

                {/* Weak & Strong Topics Across Class */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Class Weak Topics */}
                  <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <h4 className="text-sm font-bold text-rose-300 uppercase tracking-wider">
                        Class Knowledge Gaps (Accuracy &lt; 60%)
                      </h4>
                    </div>
                    {classAnalytics.weak_topics.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No critical knowledge gaps detected across enrolled students.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {classAnalytics.weak_topics.map((wt, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg bg-slate-950/60 border border-rose-800/30 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-white">{wt.topic}</span>
                            <span className="font-bold text-rose-400">
                              {wt.average_accuracy}% accuracy
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Class Strong Topics */}
                  <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">
                        Class Mastery Strengths (Accuracy &gt;= 80%)
                      </h4>
                    </div>
                    {classAnalytics.strong_topics.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Assessments are currently in progress to establish strong mastery baselines.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {classAnalytics.strong_topics.map((st, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg bg-slate-950/60 border border-emerald-800/30 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-white">{st.topic}</span>
                            <span className="font-bold text-emerald-400">
                              {st.average_accuracy}% accuracy
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Individual Student Roster Diagnostics */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
                    Student Performance Matrix
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Student</th>
                          <th className="p-3">Submissions Completed</th>
                          <th className="p-3">Completion Rate</th>
                          <th className="p-3">Average Grade</th>
                          <th className="p-3">Mastery Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {classAnalytics.roster.map((r) => (
                          <tr key={r.student_id} className="hover:bg-slate-800/40">
                            <td className="p-3">
                              <div className="font-semibold text-white">{r.name}</div>
                              <div className="text-[11px] text-slate-400">{r.email}</div>
                            </td>
                            <td className="p-3 font-semibold text-white">
                              {r.assignments_submitted} / {r.total_assignments}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-blue-500 h-full rounded-full"
                                    style={{ width: `${r.completion_percentage}%` }}
                                  />
                                </div>
                                <span className="text-[11px]">{r.completion_percentage}%</span>
                              </div>
                            </td>
                            <td className="p-3 font-bold text-white">
                              {r.average_score !== null ? `${r.average_score}%` : "—"}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  r.tier === "Mastery"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : r.tier === "Proficient"
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                    : r.tier === "Needs Support"
                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {r.tier}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: CREATE CLASS */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Create New Classroom</h3>
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Machine Learning (CS401)"
                  value={newClassForm.name}
                  onChange={(e) => setNewClassForm({ ...newClassForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject / Domain *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={newClassForm.subject}
                  onChange={(e) => setNewClassForm({ ...newClassForm, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Grade / Academic Level
                </label>
                <select
                  value={newClassForm.grade_level}
                  onChange={(e) => setNewClassForm({ ...newClassForm, grade_level: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="High School">High School</option>
                  <option value="Undergraduate">Undergraduate (MCA/B.Tech)</option>
                  <option value="Postgraduate">Postgraduate (M.Tech/Ph.D.)</option>
                  <option value="Professional">Professional Certification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Brief class description or syllabus overview..."
                  value={newClassForm.description}
                  onChange={(e) => setNewClassForm({ ...newClassForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingClass}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold disabled:opacity-50"
                >
                  {creatingClass ? "Generating Class..." : "Create Classroom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ASSIGNMENT */}
      {showCreateAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Create Class Assignment</h3>
              <button
                onClick={() => setShowCreateAssignModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Decision Tree Classifier"
                  value={newAssignForm.title}
                  onChange={(e) => setNewAssignForm({ ...newAssignForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={newAssignForm.assignment_type}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, assignment_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="homework">Homework</option>
                    <option value="quiz">Adaptive Quiz</option>
                    <option value="reading">Reading & Summary</option>
                    <option value="project">Course Project</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newAssignForm.max_points}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, max_points: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newAssignForm.due_date}
                  onChange={(e) => setNewAssignForm({ ...newAssignForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instructions & Requirements
                </label>
                <textarea
                  rows="3"
                  placeholder="Specific requirements, rubrics, or instructions..."
                  value={newAssignForm.description}
                  onChange={(e) => setNewAssignForm({ ...newAssignForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAssignModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAssign}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold disabled:opacity-50"
                >
                  {creatingAssign ? "Publishing..." : "Publish Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMISSION GRADING DRAWER */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">Grading Evaluation</span>
                <h3 className="text-lg font-bold text-white">{gradingSubmission.student_name}</h3>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 max-h-48 overflow-y-auto">
                <div className="text-xs text-slate-400 font-semibold mb-1">Student Work:</div>
                <div className="text-xs text-slate-200 whitespace-pre-wrap">
                  {gradingSubmission.content || gradingSubmission.submission_notes || "No submission text provided."}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Grade / Score (0 to {activeAssignmentForGrading?.max_points || 100})
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max={activeAssignmentForGrading?.max_points || 1000}
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Constructive Instructor Feedback
                </label>
                <textarea
                  rows="3"
                  placeholder="Provide personalized strengths, areas to review, and specific pointers..."
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold disabled:opacity-50"
                >
                  {savingGrade ? "Saving Grade..." : "Save & Finalize Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
