import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  searchDocuments,
  getDocumentStudyGuide,
  getDocumentPreview,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

const SUBJECTS = [
  "All",
  "General",
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Economics",
];

function Documents() {
  const navigate = useNavigate();

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("All");

  // Upload form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [customTitle, setCustomTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("General");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isDuplicateError, setIsDuplicateError] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState("");

  // Study Guide Modal state
  const [activeGuideDoc, setActiveGuideDoc] = useState(null);
  const [studyGuide, setStudyGuide] = useState(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideTab, setGuideTab] = useState("summary"); // "summary" | "terms" | "takeaways" | "flashcards"
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Document Preview Modal state (Phase 7)
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTab, setPreviewTab] = useState("outline"); // "outline" | "chunks"

  // Delete modal state
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load documents
  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      setError(err.message || "Failed to load study materials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // File selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    setUploadError("");
    setUploadSuccess("");
    setIsDuplicateError(false);
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "txt", "md", "docx", "pptx"].includes(ext)) {
      setUploadError("Only .pdf, .docx, .pptx, .txt, and .md files are supported.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("File exceeds the 25MB size limit.");
      return;
    }
    setSelectedFile(file);
    if (!customTitle) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setCustomTitle(nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Upload handler with duplicate detection override
  const handleUpload = async (e, force = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please choose a study file to upload.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    setIsDuplicateError(false);

    try {
      const res = await uploadDocument(selectedFile, customTitle, uploadSubject, force);
      const stats = res.document?.processing_stats || {};
      const unitLabel =
        res.document.file_type === "pptx"
          ? `${res.document.page_count || 1} slide(s)`
          : res.document.file_type === "docx"
          ? `${res.document.page_count || 1} section(s)`
          : `${res.document.page_count || 1} page(s)`;
      const ocrNotice = stats.ocr_applied ? " · 🔍 OCR Extracted" : "";
      setUploadSuccess(`"${res.document.title}" ingested successfully (${unitLabel}, ${res.document.chunk_count} chunks indexed)${ocrNotice}!`);
      setSelectedFile(null);
      setCustomTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocs();
    } catch (err) {
      const msg = err.message || "Failed to upload and index document.";
      setUploadError(msg);
      if (msg.toLowerCase().includes("duplicate")) {
        setIsDuplicateError(true);
      }
    } finally {
      setUploading(false);
    }
  };

  // Preview Modal Handler (Phase 7)
  const handleOpenPreview = async (doc) => {
    setPreviewDoc(doc);
    setPreviewData(null);
    setPreviewLoading(true);
    setPreviewTab("outline");
    try {
      const res = await getDocumentPreview(doc.id);
      setPreviewData(res.preview);
    } catch (err) {
      alert("Failed to load document preview: " + err.message);
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Semantic search handler
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError("");
    try {
      const res = await searchDocuments(searchQuery.trim(), null, 5);
      setSearchResults(res.results || []);
    } catch (err) {
      setSearchError(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  // Open study guide
  const handleOpenStudyGuide = async (doc) => {
    setActiveGuideDoc(doc);
    setStudyGuide(null);
    setGuideLoading(true);
    setGuideTab("summary");
    setCurrentCardIdx(0);
    setIsCardFlipped(false);

    try {
      const res = await getDocumentStudyGuide(doc.id);
      setStudyGuide(res.study_guide);
    } catch (err) {
      alert("Failed to load study guide: " + err.message);
      setActiveGuideDoc(null);
    } finally {
      setGuideLoading(false);
    }
  };

  // Delete handler
  const confirmDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await deleteDocument(docToDelete.id);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      alert("Failed to delete document: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredDocs =
    selectedSubject === "All"
      ? documents
      : documents.filter((d) => (d.subject || "General").toLowerCase() === selectedSubject.toLowerCase());

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8 flex-1 w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                Phase 7 · Document Intelligence &amp; RAG
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Study Materials &amp; Notes
            </h1>
            <p className="mt-1 text-slate-400">
              Upload textbook chapters, slide presentations (PPTX), Word documents (DOCX), or scanned PDFs with OCR to chat, review slide-by-slide outlines, and generate practice quizzes.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              to="/tutor"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              💬 Open AI Tutor
            </Link>
            <Link
              to="/quiz"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              📝 Take a Quiz
            </Link>
          </div>
        </div>

        {/* Ingestion & Upload Panel */}
        <div className="mb-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span>📤</span> Upload Study Material
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Supports PDF (with OCR), Word (.docx), PowerPoint (.pptx), Markdown (.md), and TXT files up to 25MB.
          </p>

          <form onSubmit={handleUpload}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                isDragOver
                  ? "border-blue-500 bg-blue-500/10"
                  : selectedFile
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-700 hover:border-slate-500 bg-slate-950/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.docx,.pptx"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div>
                  <span className="text-4xl">📄</span>
                  <p className="mt-2 font-semibold text-white">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatFileSize(selectedFile.size)} · Click or drop another file to replace
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-4xl text-slate-500">📥</span>
                  <p className="mt-2 font-semibold text-slate-300">
                    Click to browse or drag and drop your study document
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PDF (with OCR), DOCX, PPTX, TXT, or MD (Max 25MB)
                  </p>
                </div>
              )}
            </div>

            {/* Title & Subject Inputs */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Chapter 4: Photosynthesis & Cell Energy"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Subject Category
                </label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {SUBJECTS.filter((s) => s !== "All").map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {uploadError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{uploadError}</span>
                </div>
                {isDuplicateError && (
                  <button
                    type="button"
                    onClick={() => handleUpload(null, true)}
                    disabled={uploading}
                    className="rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap shadow transition"
                  >
                    Force Re-Upload
                  </button>
                )}
              </div>
            )}

            {uploadSuccess && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                ✓ {uploadSuccess}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Processing &amp; Vector Indexing...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Process &amp; Index Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Semantic Search across Library */}
        <div className="mb-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span>🔍</span> Semantic Search in Study Library
              </h3>
              <p className="text-xs text-slate-400">
                Ask a question or search for concepts across all your uploaded documents.
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. How does photosynthesis create glucose?"
                className="w-full md:w-80 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search"}
              </button>
              {searchResults && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {searchError && (
            <p className="text-xs text-red-400 mt-2">{searchError}</p>
          )}

          {searchResults && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs font-semibold text-slate-400 mb-3">
                Top {searchResults.length} Relevant Excerpts Found:
              </p>
              {searchResults.length === 0 ? (
                <p className="text-sm text-slate-500">No matching excerpts found for this query.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {searchResults.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-blue-400">
                          {r.document_title} · {r.page_or_slide_label || `Page ${r.page_number}`}
                        </span>
                        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 font-mono">
                          Match: {Math.round(r.score * 100)}%
                        </span>
                      </div>
                      <p className="text-slate-300 line-clamp-3 italic">
                        "{r.content}"
                      </p>
                      <div className="mt-3 flex justify-end">
                        <Link
                          to={`/tutor?doc=${r.document_id}`}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          Ask AI about this →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document Library Section */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Your Library ({documents.length})
            </h2>
          </div>

          {/* Subject Pills */}
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  selectedSubject === subj
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <LoadingSpinner size="lg" text="Loading study materials..." />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
            <span className="text-5xl">📚</span>
            <h3 className="mt-3 text-lg font-bold text-white">No study materials found</h3>
            <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
              {selectedSubject === "All"
                ? "You haven't uploaded any study materials yet. Upload a PDF or class notes above to get started!"
                : `No study materials found under "${selectedSubject}". Try selecting "All" or upload one now.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                          doc.file_type === "pdf"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : doc.file_type === "docx"
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : doc.file_type === "pptx"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : doc.file_type === "md"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {doc.file_type}
                      </span>

                      <span className="rounded bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[11px] text-slate-300">
                        {doc.file_type === "pptx"
                          ? `${doc.page_count || 1} slides`
                          : doc.file_type === "docx"
                          ? `${doc.page_count || 1} sections`
                          : `${doc.page_count || 1} pages`}
                      </span>

                      {doc.processing_stats?.ocr_applied && (
                        <span className="rounded bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                          🔍 OCR
                        </span>
                      )}

                      {doc.processing_stats?.tables_extracted > 0 && (
                        <span className="rounded bg-teal-500/20 border border-teal-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300">
                          📊 {doc.processing_stats.tables_extracted} Tables
                        </span>
                      )}
                    </div>

                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                      {doc.subject || "General"}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base line-clamp-1" title={doc.title}>
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1">
                    {doc.filename} · {formatFileSize(doc.file_size)} · {doc.chunk_count} chunks
                  </p>

                  {/* Summary preview */}
                  <div className="mt-3 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300 line-clamp-3">
                    {doc.summary || "Summary generation in progress..."}
                  </div>

                  {/* Concept Tags */}
                  {doc.key_concepts && doc.key_concepts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {doc.key_concepts.slice(0, 4).map((concept, ci) => (
                        <span
                          key={ci}
                          className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300"
                        >
                          #{concept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/tutor?doc=${doc.id}`)}
                    className="flex-1 rounded-xl bg-blue-600/90 hover:bg-blue-600 py-2 text-xs font-semibold text-white transition text-center"
                    title="Ask AI questions grounded in this document"
                  >
                    💬 Chat
                  </button>

                  <button
                    onClick={() => handleOpenPreview(doc)}
                    className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
                    title="Preview document outline and chunks"
                  >
                    👁️ Preview
                  </button>

                  <button
                    onClick={() => handleOpenStudyGuide(doc)}
                    className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
                    title="View study guide and flashcards"
                  >
                    📖 Guide
                  </button>

                  <button
                    onClick={() => navigate(`/quiz?doc=${doc.id}`)}
                    className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
                    title="Generate a quiz on this document"
                  >
                    📝 Quiz
                  </button>

                  <button
                    onClick={() => setDocToDelete(doc)}
                    className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-red-500/20 hover:text-red-400 px-2.5 py-2 text-xs text-slate-500 transition"
                    title="Delete document"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Study Guide & Flashcards Modal */}
      {activeGuideDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Interactive Study Guide
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {activeGuideDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveGuideDoc(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Guide Tabs */}
            <div className="flex border-b border-slate-800 mt-4 gap-4 text-sm">
              <button
                onClick={() => setGuideTab("summary")}
                className={`pb-3 font-semibold transition ${
                  guideTab === "summary"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Executive Summary
              </button>
              <button
                onClick={() => setGuideTab("terms")}
                className={`pb-3 font-semibold transition ${
                  guideTab === "terms"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Key Terms &amp; Definitions
              </button>
              <button
                onClick={() => setGuideTab("takeaways")}
                className={`pb-3 font-semibold transition ${
                  guideTab === "takeaways"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                High-Yield Takeaways
              </button>
              <button
                onClick={() => setGuideTab("flashcards")}
                className={`pb-3 font-semibold transition ${
                  guideTab === "flashcards"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Interactive Flashcards ({studyGuide?.flashcards?.length || 0})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 pr-2">
              {guideLoading ? (
                <div className="py-16 text-center">
                  <LoadingSpinner size="lg" text="Synthesizing study guide & flashcards..." />
                </div>
              ) : !studyGuide ? (
                <p className="text-slate-400 text-center py-10">Study guide unavailable.</p>
              ) : (
                <>
                  {guideTab === "summary" && (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-slate-950/60 p-5 border border-slate-800/80">
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">
                          Document Overview
                        </h4>
                        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                          {studyGuide.executive_summary}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400 font-semibold">Have questions about this overview?</p>
                          <p className="text-xs text-slate-500">Ask the tutor directly grounded in these study notes.</p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveGuideDoc(null);
                            navigate(`/tutor?doc=${activeGuideDoc.id}`);
                          }}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                          Chat with Tutor
                        </button>
                      </div>
                    </div>
                  )}

                  {guideTab === "terms" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {studyGuide.key_terms?.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <span className="font-bold text-blue-400 text-sm block mb-1">
                            {item.term}
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {item.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {guideTab === "takeaways" && (
                    <ul className="space-y-3">
                      {studyGuide.high_yield_takeaways?.map((takeaway, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200"
                        >
                          <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {guideTab === "flashcards" && (
                    <div className="flex flex-col items-center">
                      {studyGuide.flashcards && studyGuide.flashcards.length > 0 ? (
                        <div className="w-full max-w-lg">
                          <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                            <span>Card {currentCardIdx + 1} of {studyGuide.flashcards.length}</span>
                            <span>Click card to flip</span>
                          </div>

                          <div
                            onClick={() => setIsCardFlipped(!isCardFlipped)}
                            className="h-56 w-full rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-6 flex flex-col justify-between items-center text-center cursor-pointer shadow-xl transition-all duration-300 hover:border-blue-500"
                          >
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {isCardFlipped ? "Answer" : "Question / Prompt"}
                            </span>

                            <p className="text-base font-semibold text-white px-4 leading-relaxed">
                              {isCardFlipped
                                ? studyGuide.flashcards[currentCardIdx].back
                                : studyGuide.flashcards[currentCardIdx].front}
                            </p>

                            <span className="text-xs text-blue-400 font-medium">
                              {isCardFlipped ? "↺ Click to show question" : "💡 Click to reveal answer"}
                            </span>
                          </div>

                          {/* Controls */}
                          <div className="mt-5 flex items-center justify-between gap-4">
                            <button
                              onClick={() => {
                                setIsCardFlipped(false);
                                setCurrentCardIdx((prev) => Math.max(0, prev - 1));
                              }}
                              disabled={currentCardIdx === 0}
                              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                            >
                              ← Previous Card
                            </button>

                            <button
                              onClick={() => setIsCardFlipped(!isCardFlipped)}
                              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                              Flip Card
                            </button>

                            <button
                              onClick={() => {
                                setIsCardFlipped(false);
                                setCurrentCardIdx((prev) =>
                                  Math.min(studyGuide.flashcards.length - 1, prev + 1)
                                );
                              }}
                              disabled={currentCardIdx === studyGuide.flashcards.length - 1}
                              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                            >
                              Next Card →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 py-10">No flashcards available for this document.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Generated by Mentora AI Multilingual RAG
              </span>
              <button
                onClick={() => setActiveGuideDoc(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal (Phase 7) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold uppercase text-blue-400">
                    {previewDoc.file_type}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {previewDoc.filename} · {formatFileSize(previewDoc.file_size)}
                  </span>
                  {previewData?.document?.processing_stats?.ocr_applied && (
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                      🔍 OCR Extracted
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mt-1.5">
                  {previewDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 mt-4 gap-4 text-sm">
              <button
                onClick={() => setPreviewTab("outline")}
                className={`pb-3 font-semibold transition ${
                  previewTab === "outline"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📑 Document Outline ({previewData?.unit_previews?.length || 0})
              </button>
              <button
                onClick={() => setPreviewTab("chunks")}
                className={`pb-3 font-semibold transition ${
                  previewTab === "chunks"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🧩 Indexed Vector Chunks ({previewData?.sample_chunks?.length || 0})
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-5 pr-2">
              {previewLoading ? (
                <div className="py-20 text-center">
                  <LoadingSpinner size="lg" text="Extracting document preview..." />
                </div>
              ) : !previewData ? (
                <p className="text-slate-400 text-center py-10">Preview unavailable.</p>
              ) : (
                <>
                  {previewTab === "outline" && (
                    <div className="space-y-4">
                      {/* Executive summary banner */}
                      {previewDoc.summary && (
                        <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4">
                          <h4 className="text-xs font-semibold text-slate-400 mb-1">Summary Overview</h4>
                          <p className="text-xs text-slate-200 leading-relaxed">{previewDoc.summary}</p>
                        </div>
                      )}

                      {/* Units List */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {previewData.unit_previews?.map((unit, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-blue-400 text-xs flex items-center gap-1.5">
                                  <span>{unit.unit_type === "slide" ? "📊" : "📄"}</span>
                                  {unit.label}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {unit.chunk_count} chunk(s)
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-line line-clamp-6">
                                {unit.preview_text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewTab === "chunks" && (
                    <div className="space-y-3">
                      {previewData.sample_chunks?.map((chunk, cIdx) => (
                        <div
                          key={cIdx}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold mb-1.5">
                            <span>
                              Chunk #{chunk.chunk_index} · {chunk.page_or_slide_label || `Page ${chunk.page_number}`}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase">
                              Unit: {chunk.unit_type || "page"}
                            </span>
                          </div>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-line font-mono bg-slate-950/90 p-3 rounded-lg border border-slate-800/80">
                            {chunk.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="border-t border-slate-800 pt-4 flex flex-wrap justify-between items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const id = previewDoc.id;
                    setPreviewDoc(null);
                    navigate(`/tutor?doc=${id}`);
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
                >
                  💬 Chat with Doc
                </button>
                <button
                  onClick={() => {
                    const id = previewDoc.id;
                    setPreviewDoc(null);
                    navigate(`/quiz?doc=${id}`);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                >
                  📝 Generate Quiz
                </button>
                <button
                  onClick={() => {
                    const d = previewDoc;
                    setPreviewDoc(null);
                    handleOpenStudyGuide(d);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                >
                  📖 Study Guide
                </button>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Study Material?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete <span className="font-semibold text-white">"{docToDelete.title}"</span>? All vector chunks and semantic indexing for this file will be permanently removed.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDocToDelete(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-800 px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Documents;