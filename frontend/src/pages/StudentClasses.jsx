import { useState, useEffect, useCallback } from "react";
import {
  getStudentClasses,
  joinClass,
  getStudentClassAssignments,
  submitAssignment,
  getMySubmission,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

export default function StudentClasses() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState(null);

  // Join Class Modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(null);

  // Selected Class & Assignments
  const [selectedClass, setSelectedClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Submit Work Modal
  const [submittingAssign, setSubmittingAssign] = useState(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStudentClasses();
      setClasses(res.classes || []);
    } catch (err) {
      setError(err.message || "Failed to load enrolled classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleOpenClass = async (cls) => {
    try {
      setSelectedClass(cls);
      setLoadingAssignments(true);
      const res = await getStudentClassAssignments(cls.id);
      setAssignments(res.assignments || []);
    } catch (err) {
      alert("Failed to load class coursework: " + err.message);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      setJoining(true);
      setJoinSuccess(null);
      const res = await joinClass(joinCode.trim());
      setJoinSuccess(res.message);
      setJoinCode("");
      await fetchClasses();
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinSuccess(null);
      }, 1500);
    } catch (err) {
      alert("Join failed: " + err.message);
    } finally {
      setJoining(false);
    }
  };

  const openSubmitModal = (assign) => {
    setSubmittingAssign(assign);
    if (assign.my_submission) {
      setSubmissionContent(assign.my_submission.content || "");
      setSubmissionNotes(assign.my_submission.submission_notes || "");
    } else {
      setSubmissionContent("");
      setSubmissionNotes("");
    }
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!submittingAssign || !submissionContent.trim()) return;
    try {
      setIsSubmitting(true);
      await submitAssignment(submittingAssign.id, {
        content: submissionContent.trim(),
        submission_notes: submissionNotes.trim(),
      });
      // Refresh assignments
      const res = await getStudentClassAssignments(selectedClass.id);
      setAssignments(res.assignments || []);
      setSubmittingAssign(null);
      await fetchClasses();
    } catch (err) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-8">
          <LoadingSpinner message="Loading your enrolled classes..." />
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Classroom Community
              </span>
              <span className="text-xs text-slate-400">Curriculum, Homework & Teacher Feedback</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Enrolled Classrooms</h1>
          </div>

          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-cyan-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Join Class with Code</span>
          </button>
        </div>

        {/* Selected Class View */}
        {selectedClass ? (
          <div className="my-6">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/20 border border-slate-800 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2"
                >
                  ← Back to All Classes
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {selectedClass.subject}
                  </span>
                  <span className="text-xs text-slate-400">
                    Instructor: <strong className="text-slate-200">{selectedClass.teacher_name}</strong>
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedClass.name}</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  {selectedClass.description || "Course syllabus, assignments, and instructor assessments."}
                </p>
              </div>

              <div className="text-right text-xs">
                <span className="text-slate-400">Join Code: </span>
                <span className="font-mono font-bold text-cyan-400">{selectedClass.join_code}</span>
              </div>
            </div>

            {/* Assignments List */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Coursework & Assignments</h3>

              {loadingAssignments ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner message="Loading coursework..." />
                </div>
              ) : assignments.length === 0 ? (
                <div className="p-12 text-center rounded-xl bg-slate-900/50 border border-slate-800">
                  <p className="text-sm text-slate-400">No assignments published for this class yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assign) => (
                    <div
                      key={assign.id}
                      className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
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
                              • Due: <strong className="text-cyan-400">{new Date(assign.due_date).toLocaleDateString()}</strong>
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-white">{assign.title}</h4>
                        {assign.description && (
                          <p className="text-xs text-slate-400 mt-1">{assign.description}</p>
                        )}

                        {/* Grading Feedback if graded */}
                        {assign.my_submission?.status === "graded" && (
                          <div className="mt-3 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs">
                            <div className="flex items-center justify-between font-bold text-emerald-400 mb-1">
                              <span>Instructor Grade: {assign.my_submission.score} / {assign.max_points}</span>
                              <span className="text-[10px] font-normal text-slate-400">
                                Evaluated: {new Date(assign.my_submission.graded_at).toLocaleDateString()}
                              </span>
                            </div>
                            {assign.my_submission.feedback && (
                              <p className="text-slate-300 italic">"{assign.my_submission.feedback}"</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                            assign.my_submission?.status === "graded"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : assign.my_submission?.status === "submitted"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {assign.my_submission?.status === "graded"
                            ? "Graded"
                            : assign.my_submission?.status === "submitted"
                            ? "Submitted"
                            : "Pending"}
                        </span>

                        <button
                          onClick={() => openSubmitModal(assign)}
                          className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition"
                        >
                          {assign.my_submission ? "View / Edit Submission" : "Submit Work"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Enrolled Classes Grid */
          <div className="my-6">
            {classes.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Not Enrolled in Any Classes</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  Ask your instructor for their 6-character class code to join your course workspace and access assignments.
                </p>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
                >
                  Join Class with Code
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
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {cls.subject}
                        </span>
                        <span className="text-xs text-slate-400">
                          Instructor: <strong className="text-slate-300">{cls.teacher_name}</strong>
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1.5">{cls.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                        {cls.description || "Course workspace and assignment modules."}
                      </p>

                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between text-xs mb-4">
                        <span className="text-slate-400">Assignments Completed:</span>
                        <span className="font-bold text-white">
                          {cls.completed_assignments || 0} / {cls.total_assignments || 0}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenClass(cls)}
                      className="w-full py-2 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold text-center transition"
                    >
                      View Classwork & Submit →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: JOIN CLASS */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Join Classroom</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {joinSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs">
                ✓ {joinSuccess}
              </div>
            )}

            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  6-Character Class Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength="10"
                  placeholder="e.g. AB12CD"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono tracking-widest uppercase text-white focus:outline-none focus:border-cyan-500 text-center"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold disabled:opacity-50"
                >
                  {joining ? "Verifying..." : "Join Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT ASSIGNMENT */}
      {submittingAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div>
                <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold">Assignment Submission</span>
                <h3 className="text-lg font-bold text-white">{submittingAssign.title}</h3>
              </div>
              <button onClick={() => setSubmittingAssign(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your Answer / Solution / Work *
                </label>
                <textarea
                  required
                  rows="6"
                  placeholder="Type or paste your completed assignment solution here..."
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Comments for Instructor (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Notes, references, or queries regarding this submission..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittingAssign(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Coursework"}
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
