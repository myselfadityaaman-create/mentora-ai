import { useState, useEffect, useCallback } from "react";
import {
  getReportSummary,
  downloadStudentPerformancePdf,
  getCertificateEligibility,
  downloadCertificatePdf,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ReportsCertificates() {
  const [loading, setLoading] = useState(true);
  const [reportSummary, setReportSummary] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingCertId, setDownloadingCertId] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, certRes] = await Promise.all([
        getReportSummary(),
        getCertificateEligibility(),
      ]);
      setReportSummary(sumRes);
      setCertificates(certRes.certificates || []);
    } catch (err) {
      setError(err.message || "Failed to load credentials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      await downloadStudentPerformancePdf();
    } catch (err) {
      alert("Failed to download academic report: " + err.message);
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleDownloadCert = async (cert) => {
    try {
      setDownloadingCertId(cert.title);
      await downloadCertificatePdf(cert.subject, cert.learning_path_id);
    } catch (err) {
      alert("Certificate issuance failed: " + err.message);
    } finally {
      setDownloadingCertId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-8">
          <LoadingSpinner message="Loading academic credentials and verification telemetry..." />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Official Credentials
              </span>
              <span className="text-xs text-slate-400">PDF Reports & Verifiable Certificates of Mastery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Reports & Certificates</h1>
          </div>
        </div>

        {/* SECTION 1: COMPREHENSIVE PERFORMANCE REPORT */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Student Academic Performance Report</h2>
              <p className="text-xs text-slate-400">
                Download an official comprehensive PDF summary of all quizzes, learning paths, retention rates, and AI recommendations.
              </p>
            </div>
          </div>

          {reportSummary && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-2xl border border-blue-500/30">
                    📊
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {reportSummary.student.name} — Academic Diagnostic Summary
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {reportSummary.student.email} • Level {reportSummary.level} ({reportSummary.xp_points} XP)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Quizzes Taken</div>
                    <div className="text-lg font-bold text-white">
                      {reportSummary.stats.total_quizzes || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Average Quiz Score</div>
                    <div className="text-lg font-bold text-purple-400">
                      {reportSummary.stats.average_quiz_score || 0}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Total Study Time</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {reportSummary.stats.formatted_learning_time || "0m"}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Active Streak</div>
                    <div className="text-lg font-bold text-rose-400">
                      🔥 {reportSummary.stats.streak_days || 0} Days
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:border-l lg:border-slate-800 lg:pl-6 flex flex-col justify-center">
                <button
                  onClick={handleDownloadReport}
                  disabled={downloadingReport}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{downloadingReport ? "Generating Vector PDF..." : "Download Academic Report (PDF)"}</span>
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Generated via ReportLab • Verified Server Telemetry
                </p>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: VERIFIABLE COMPLETION CERTIFICATES */}
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">Mastery & Completion Certificates</h2>
              <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Criteria-Gated
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Certificates require genuine completion benchmarks: 100% completion of an active learning roadmap, or at least 3 completed assessments in a subject with a cumulative average of 75% or higher.
            </p>
          </div>

          {certificates.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
              <p className="text-sm text-slate-400">
                No active subjects or learning paths found. Complete quizzes or launch a Learning Path to track certificate progress.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {certificates.map((cert, idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl border transition flex flex-col justify-between ${
                    cert.eligible
                      ? "bg-slate-900/90 border-amber-500/50 shadow-xl shadow-amber-500/5"
                      : "bg-slate-900/50 border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {cert.type === "learning_path" ? "Curriculum Completion" : "Diagnostic Mastery"}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                          cert.eligible
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {cert.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1.5">{cert.title}</h3>
                    <p className="text-xs text-slate-400 mb-3">{cert.criteria_summary}</p>

                    {/* Progress details */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs mb-4">
                      {cert.type === "learning_path" ? (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Roadmap Progress:</span>
                          <span className="font-bold text-amber-400">
                            {cert.completion_percentage}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Assessments / Cumulative Avg:</span>
                          <span className="font-bold text-purple-400">
                            {cert.quizzes_taken} Quizzes • {cert.average_score}% Avg
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    {cert.eligible ? (
                      <button
                        onClick={() => handleDownloadCert(cert)}
                        disabled={downloadingCertId === cert.title}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {downloadingCertId === cert.title
                            ? "Generating Certificate..."
                            : "Claim & Download Certificate (PDF)"}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full py-2 px-3 rounded-lg bg-slate-800/50 text-slate-500 text-xs text-center font-medium">
                        🔒 Complete requirements above to unlock certificate
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legal Accreditation Disclaimer Alert */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-bold text-slate-300">Accreditation & Validation Disclaimer:</div>
            <p className="text-[11px] leading-relaxed">
              All credentials and completion certificates issued by Mentora AI are internal platform mastery recognitions based strictly on server-side evaluation of quizzes, adaptive assessments, and curriculum milestones. Mentora AI does not claim external university accreditation, state licensing, or degree equivalence.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
