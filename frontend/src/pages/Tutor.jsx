import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  sendMessage,
  listConversations,
  getConversation,
  deleteConversation,
  getAIStatus,
  saveAIKey,
  listDocuments,
} from "../services/api";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";

const LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Japanese",
  "Arabic",
  "Portuguese",
  "Russian",
];

const LANGUAGE_BCP47 = {
  English: "en-US",
  Hindi: "hi-IN",
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Mandarin: "zh-CN",
  Japanese: "ja-JP",
  Arabic: "ar-SA",
  Portuguese: "pt-BR",
  Russian: "ru-RU",
};

const SUBJECTS = [
  "General",
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Economics",
  "Literature",
];

const QUICK_STARTERS = [
  {
    title: "Explain recursion",
    subtitle: "With a simple intuitive real-life analogy",
    subject: "Computer Science",
    icon: "💻",
  },
  {
    title: "Speed vs Velocity",
    subtitle: "What is the key scientific difference?",
    subject: "Physics",
    icon: "⚡",
  },
  {
    title: "Photosynthesis process",
    subtitle: "How light reactions convert into chemical energy",
    subject: "Biology",
    icon: "🧬",
  },
  {
    title: "Bayes' Theorem",
    subtitle: "Step-by-step medical test diagnosis problem",
    subject: "Mathematics",
    icon: "📐",
  },
];

function Tutor() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConvoId = searchParams.get("c") || null;
  const initialDocId = searchParams.get("doc") || "";

  const [conversations, setConversations] = useState([]);
  const [currentConvoId, setCurrentConvoId] = useState(initialConvoId);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(initialDocId);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("General");
  const [selectedLanguage, setSelectedLanguage] = useState(user?.preferred_language || "English");
  const [loading, setLoading] = useState(false);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [error, setError] = useState(null);

  // Layout & UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchConvo, setSearchConvo] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Voice Interaction state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPlayingMsgId, setCurrentPlayingMsgId] = useState(null);
  const recognitionRef = useRef(null);

  // AI Configuration Modal state
  const [aiStatus, setAiStatus] = useState({ configured: false, model: "gemini-3.8-flash" });
  const [selectedModel, setSelectedModel] = useState("gemini-3.8-flash");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyModalError, setKeyModalError] = useState("");
  const [keyModalSuccess, setKeyModalSuccess] = useState("");

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Auto-expand textarea height dynamically up to 5-6 lines (~160px), then scroll
  const adjustTextareaHeight = (element) => {
    if (!element) return;
    element.style.height = "auto";
    const scrollHeight = element.scrollHeight;
    const maxHeight = 160; // 5-6 lines limit
    if (scrollHeight > maxHeight) {
      element.style.height = `${maxHeight}px`;
      element.style.overflowY = "auto";
    } else {
      element.style.height = `${Math.max(28, scrollHeight)}px`;
      element.style.overflowY = "hidden";
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [inputMessage]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  // Check AI status
  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await getAIStatus();
        setAiStatus(status);
        if (status.model) setSelectedModel(status.model);
      } catch {
        // AI status check failed
      }
    }
    checkStatus();
  }, []);

  // Load conversation list
  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await listConversations();
        setConversations(res.conversations || []);
      } catch {
        // Ignore
      }
    }
    fetchConversations();
  }, []);

  // Load user documents for RAG
  useEffect(() => {
    async function fetchUserDocs() {
      try {
        const res = await listDocuments();
        setDocuments(res.documents || []);
      } catch {
        // Ignore
      }
    }
    fetchUserDocs();
  }, []);

  // Load active conversation
  useEffect(() => {
    async function loadActiveConvo() {
      if (!currentConvoId) {
        setMessages([]);
        return;
      }
      try {
        setLoadingConvo(true);
        setError(null);
        const data = await getConversation(currentConvoId);
        setMessages(data.messages || []);
        if (data.subject) setSelectedSubject(data.subject);
      } catch {
        setError("Failed to load conversation.");
        setCurrentConvoId(null);
      } finally {
        setLoadingConvo(false);
      }
    }
    loadActiveConvo();
  }, [currentConvoId]);

  const handleStartNewConversation = () => {
    setCurrentConvoId(null);
    setMessages([]);
    setSearchParams({});
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConvoId(id);
    setSearchParams({ c: id });
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConvoId === id) {
        handleStartNewConversation();
      }
    } catch {
      alert("Failed to delete conversation");
    }
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // --------------------------------------------------
  // Voice Helpers (TTS & STT)
  // --------------------------------------------------

  const prepareTextForSpeech = (markdown) => {
    if (!markdown) return "";
    return markdown
      .replace(/```[\s\S]*?```/g, " [Code block omitted for audio] ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*_~>]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const handleStopTTS = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentPlayingMsgId(null);
  };

  const handleToggleSpeak = (msgId, text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceError("Text-to-speech audio is not supported by your browser.");
      return;
    }

    if (currentPlayingMsgId === msgId) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        setIsPaused(true);
      } else {
        handlePlayTTS(msgId, text);
      }
      return;
    }

    handlePlayTTS(msgId, text);
  };

  const handlePlayTTS = (msgId, text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const cleanText = prepareTextForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const targetLang = LANGUAGE_BCP47[selectedLanguage] || "en-US";
    utterance.lang = targetLang;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const langPrefix = targetLang.split("-")[0];
      const match = voices.find((v) => v.lang === targetLang) || voices.find((v) => v.lang.startsWith(langPrefix));
      if (match) utterance.voice = match;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setCurrentPlayingMsgId(msgId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentPlayingMsgId(null);
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled") {
        console.warn("TTS Error:", e);
      }
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentPlayingMsgId(null);
    };

    utterance.onpause = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStartRecording = () => {
    setVoiceError(null);
    handleStopTTS();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        "Speech recognition is not supported in this browser. Please type your question, or try Chrome or Edge."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = LANGUAGE_BCP47[selectedLanguage] || "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceError(null);
      };

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interim += event.results[i][0].transcript;
        }
        if (interim) {
          setInputMessage(interim);
        }
      };

      recognition.onerror = (event) => {
        setIsRecording(false);
        if (event.error === "not-allowed") {
          setVoiceError("Microphone permission denied.");
        } else if (event.error === "no-speech") {
          setVoiceError("No speech detected.");
        } else {
          setVoiceError(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
      setError("Could not start microphone. Please check browser permissions.");
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsRecording(false);
  };

  const handleSend = async (e, inputMode = "text") => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || loading) return;

    if (isRecording) {
      handleStopRecording();
    }

    const userMsg = {
      id: "temp-" + Date.now(),
      role: "user",
      content: trimmed,
      input_mode: inputMode,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "28px";
      textareaRef.current.style.overflowY = "hidden";
    }
    setLoading(true);
    setError(null);

    try {
      const res = await sendMessage(
        trimmed,
        currentConvoId,
        selectedSubject,
        selectedLanguage,
        selectedDocId || null,
        inputMode
      );

      const assistantMsg = {
        ...res.message,
        id: res.message.id || "msg-" + Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (isVoiceMode) {
        handlePlayTTS(assistantMsg.id, assistantMsg.content);
      }

      if (!currentConvoId && res.conversation_id) {
        setCurrentConvoId(res.conversation_id);
        setSearchParams({ c: res.conversation_id });
        const convList = await listConversations();
        setConversations(convList.conversations || []);
      }
    } catch (err) {
      setError(err.message || "Failed to get AI response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(null, isRecording ? "voice" : "text");
    }
  };

  const handleSaveAPIKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setKeyModalError("Please enter your Google Gemini API key.");
      return;
    }

    setSavingKey(true);
    setKeyModalError("");
    setKeyModalSuccess("");

    try {
      const res = await saveAIKey(apiKeyInput.trim(), selectedModel);
      setKeyModalSuccess("Key saved! Gemini is active.");
      setAiStatus({ configured: true, model: res.model });
      setTimeout(() => {
        setShowKeyModal(false);
        setKeyModalSuccess("");
        setApiKeyInput("");
      }, 1200);
    } catch (err) {
      setKeyModalError(err.message || "Failed to verify key with Google Gemini.");
    } finally {
      setSavingKey(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    (c.title || "Untitled Chat").toLowerCase().includes(searchConvo.toLowerCase())
  );

  // Helper to render Markdown cleanly like ChatGPT
  const renderFormattedText = (text, messageId) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : "";
        const code = lang ? lines.slice(1).join("\n") : lines.join("\n");
        const codeBlockId = `code-${messageId}-${index}`;

        return (
          <div key={index} className="my-3 overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/5 bg-[#161b22] px-4 py-2 text-slate-400">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                {lang || "Code"}
              </span>
              <button
                type="button"
                onClick={() => handleCopyText(codeBlockId, code)}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              >
                {copiedId === codeBlockId ? (
                  <span className="text-emerald-400 font-medium">Copied!</span>
                ) : (
                  <span>Copy</span>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed font-mono">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      const lines = part.split("\n");

      return (
        <div key={index} className="space-y-2">
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lIdx} className="h-1" />;

            if (trimmed.startsWith("### ")) {
              return (
                <h3 key={lIdx} className="text-base font-semibold text-white mt-3 mb-1">
                  {trimmed.replace(/^###\s+/, "")}
                </h3>
              );
            }
            if (trimmed.startsWith("#### ")) {
              return (
                <h4 key={lIdx} className="text-sm font-semibold text-slate-200 mt-2 mb-1">
                  {trimmed.replace(/^####\s+/, "")}
                </h4>
              );
            }

            if (trimmed === "---") {
              return <hr key={lIdx} className="border-white/10 my-3" />;
            }

            const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
            const isNumbered = /^\d+\.\s/.test(trimmed);

            const content = trimmed.replace(/^[-*]\s+|\d+\.\s+/, "");
            const parsedContent = content.split(/(\*\*.*?\*\*|`.*?`)/g).map((sub, sIdx) => {
              if (sub.startsWith("**") && sub.endsWith("**")) {
                return <strong key={sIdx} className="text-white font-semibold">{sub.slice(2, -2)}</strong>;
              }
              if (sub.startsWith("`") && sub.endsWith("`")) {
                return (
                  <code key={sIdx} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-sky-300">
                    {sub.slice(1, -1)}
                  </code>
                );
              }
              return sub;
            });

            if (isBullet) {
              return (
                <div key={lIdx} className="flex items-start gap-2.5 pl-2">
                  <span className="text-slate-400 mt-1 text-sm">•</span>
                  <span className="leading-relaxed text-slate-200">{parsedContent}</span>
                </div>
              );
            }

            if (isNumbered) {
              const numMatch = trimmed.match(/^(\d+\.)\s/);
              const num = numMatch ? numMatch[1] : "1.";
              return (
                <div key={lIdx} className="flex items-start gap-2.5 pl-2">
                  <span className="text-slate-400 font-medium text-xs mt-0.5">{num}</span>
                  <span className="leading-relaxed text-slate-200">{parsedContent}</span>
                </div>
              );
            }

            return (
              <p key={lIdx} className="leading-relaxed text-slate-200">
                {parsedContent}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0f17] text-white overflow-hidden font-sans">
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ChatGPT / Gemini Clean Collapsible Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-0 -translate-x-full md:translate-x-0 md:w-0"
          } transition-all duration-200 ease-in-out shrink-0 border-r border-white/5 bg-[#0e131f] flex flex-col overflow-hidden z-20`}
        >
          {/* Top: Minimal New Chat */}
          <div className="p-3 border-b border-white/5 space-y-2">
            <button
              onClick={handleStartNewConversation}
              className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">＋</span>
                <span>New chat</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">⌘K</span>
            </button>

            {/* Quick Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search history..."
                value={searchConvo}
                onChange={(e) => setSearchConvo(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5 pl-8 text-xs text-slate-300 placeholder-slate-500 outline-none focus:border-white/20 transition"
              />
              <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Past Chats List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 select-text">
            {filteredConversations.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                {searchConvo ? "No matching chats" : "No recent chats"}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = currentConvoId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition ${
                      isActive
                        ? "bg-white/10 text-white font-medium"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <span className="truncate pr-2">{conv.title || "Untitled Chat"}</span>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="truncate">{user?.email || "Student Account"}</span>
            <span className="text-[10px] text-emerald-400">● Live</span>
          </div>
        </aside>

        {/* Main Chat Workspace */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0f17] relative">
          {/* Top Bar: Minimalist ChatGPT/Gemini Header */}
          <header className="h-13 shrink-0 border-b border-white/5 bg-[#0e131f]/60 backdrop-blur-md px-4 flex items-center justify-between gap-3 z-10">
            {/* Left: Sidebar toggle + Model Name */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                title="Toggle sidebar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>

              {/* Minimalist Model Pill */}
              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/5 transition cursor-pointer"
              >
                <span className="text-sky-400">✨</span>
                <span>{aiStatus.configured ? (aiStatus.model || "Gemini 3.8 Flash") : "Connect Gemini"}</span>
                <span className="text-[10px] text-slate-500">▾</span>
              </button>
            </div>

            {/* Right: Clean, Unobtrusive Controls */}
            <div className="flex items-center gap-2">
              {/* Subject */}
              <div className="relative">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 pl-2.5 pr-6 py-1 text-xs text-slate-300 outline-none hover:bg-white/10 transition cursor-pointer appearance-none"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s} className="bg-slate-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
                <span className="absolute right-2 top-1.5 text-[9px] text-slate-500 pointer-events-none">▼</span>
              </div>

              {/* Language */}
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 pl-2.5 pr-6 py-1 text-xs text-slate-300 outline-none hover:bg-white/10 transition cursor-pointer appearance-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang} className="bg-slate-900 text-white">
                      {lang}
                    </option>
                  ))}
                </select>
                <span className="absolute right-2 top-1.5 text-[9px] text-slate-500 pointer-events-none">▼</span>
              </div>

              {/* Document RAG Pill */}
              <div className="relative">
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className={`rounded-lg border pl-2.5 pr-6 py-1 text-xs outline-none transition cursor-pointer appearance-none max-w-[140px] truncate ${
                    selectedDocId
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                  title="Attach study material"
                >
                  <option value="" className="bg-slate-900 text-white">No Document</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                      {d.title}
                    </option>
                  ))}
                </select>
                <span className="absolute right-2 top-1.5 text-[9px] text-slate-500 pointer-events-none">▼</span>
              </div>

              {/* Voice Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsVoiceMode((prev) => !prev);
                  if (isSpeaking) handleStopTTS();
                  if (isRecording) handleStopRecording();
                }}
                className={`rounded-lg px-2.5 py-1 text-xs transition flex items-center gap-1 border cursor-pointer ${
                  isVoiceMode
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 font-medium"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
                title="Toggle voice responses"
              >
                <span>🎙️</span>
                <span className="hidden sm:inline">{isVoiceMode ? "Voice On" : "Voice"}</span>
              </button>
            </div>
          </header>

          {/* Active Voice Playback Banner */}
          {isVoiceMode && isSpeaking && (
            <div className="bg-blue-950/40 border-b border-blue-500/20 px-6 py-1.5 flex items-center justify-between text-xs text-blue-200">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                Speaking explanation in {selectedLanguage}...
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.speechSynthesis.paused) {
                      window.speechSynthesis.resume();
                      setIsPaused(false);
                    } else {
                      window.speechSynthesis.pause();
                      setIsPaused(true);
                    }
                  }}
                  className="text-xs text-blue-300 hover:text-white underline cursor-pointer"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  onClick={handleStopTTS}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {/* Messages Stream OR Minimalist Gemini Empty State */}
          <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 select-text">
            {loadingConvo ? (
              <div className="flex items-center justify-center h-full text-center py-20">
                <LoadingSpinner size="md" text="Loading chat..." />
              </div>
            ) : messages.length === 0 ? (
              /* Ultra Clean Gemini / ChatGPT Style Center Greeting */
              <div className="flex flex-col items-center justify-center min-h-full w-full max-w-2xl mx-auto px-4 py-8 text-center">
                {/* Clean Sparkle Glyph */}
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-4 text-sky-400">
                  ✨
                </div>

                <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  What can I help you learn today?
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Ask any concept, problem, or explanation in{" "}
                  <span className="text-slate-300 font-medium">{selectedLanguage}</span>.
                </p>

                {/* Clean, Compact 2x2 Starter Cards (Fits 100% on screen) */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                  {QUICK_STARTERS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputMessage(`${item.title}: ${item.subtitle}`);
                        setSelectedSubject(item.subject);
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                        }
                      }}
                      className="group rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 p-3.5 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {item.subtitle}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Conversation Stream (ChatGPT Style) */
              <div className="w-full max-w-3xl mx-auto space-y-6 pb-4">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {/* User message */}
                    {msg.role === "user" ? (
                      <div className="max-w-[85%] rounded-2xl bg-[#1e293b] px-4 py-2.5 text-sm text-white shadow-sm">
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    ) : (
                      /* Assistant message */
                      <div className="w-full text-slate-200 text-sm space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                          <span className="text-sky-400">✨</span>
                          <span>Mentora AI</span>
                        </div>

                        <div className="pl-0 leading-relaxed">
                          {renderFormattedText(msg.content, msg.id || index)}
                        </div>

                        {/* Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="pt-2">
                            <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
                              Sources cited:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((cite, ci) => (
                                <div
                                  key={ci}
                                  className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-slate-300"
                                >
                                  📄 {cite.document_title} (Page {cite.page_number})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assistant Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopyText(`msg-${index}`, msg.content)}
                            className="p-1 text-slate-400 hover:text-white transition cursor-pointer text-xs"
                            title="Copy"
                          >
                            {copiedId === `msg-${index}` ? "✓ Copied" : "📋 Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(msg.id || `msg-${index}`, msg.content)}
                            className="p-1 text-slate-400 hover:text-white transition cursor-pointer text-xs"
                            title="Listen"
                          >
                            🔊 Listen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading state */}
                {loading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                    <span className="text-sky-400 animate-spin">✨</span>
                    <span>Mentora AI is thinking...</span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Floating ChatGPT / Gemini Style Prompt Console */}
          <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1 shrink-0">
            {/* Live Recording notification */}
            {isRecording && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  Listening in {selectedLanguage}...
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleStopRecording();
                      if (inputMessage.trim()) handleSend(null, "voice");
                    }}
                    className="text-xs font-semibold text-red-300 hover:text-white underline cursor-pointer"
                  >
                    Done & Send
                  </button>
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Main Rounded Input Box */}
            <form
              onSubmit={(e) => handleSend(e, isRecording ? "voice" : "text")}
              className="rounded-2xl border border-white/10 bg-[#161f30] px-4 py-3 shadow-xl focus-within:border-white/20 transition"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  adjustTextareaHeight(e.target);
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Ask Mentora AI anything in ${selectedLanguage}... (Shift + Enter for new line)`}
                disabled={loading}
                className="w-full resize-none bg-transparent text-sm text-white placeholder-slate-500 outline-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: "28px", maxHeight: "160px" }}
              />

              {/* Bottom Row Inside Box */}
              <div className="mt-2 flex items-center justify-between gap-2 pt-1">
                {/* Voice Input Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={loading}
                    className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                      isRecording
                        ? "bg-red-500/20 text-red-300 animate-pulse"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                    title="Voice input"
                  >
                    🎙️
                  </button>
                  {selectedDocId && (
                    <span className="text-[10px] text-emerald-400">
                      📄 Notes attached
                    </span>
                  )}
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-950 font-bold transition hover:bg-slate-200 active:scale-95 disabled:opacity-20 disabled:hover:bg-white cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </form>

            <p className="mt-2 text-center text-[11px] text-slate-500">
              Mentora AI can make mistakes. Verify critical academic facts.
            </p>
          </div>
        </main>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161f30] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Google Gemini API Setup</h2>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Mentora AI uses <strong>Google Gemini</strong> for real-time tutoring and explanations.
            </p>

            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              <span>Free key available at </span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline text-sky-400 hover:text-white"
              >
                Google AI Studio →
              </a>
            </div>

            {keyModalError && (
              <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-300">
                {keyModalError}
              </div>
            )}

            {keyModalSuccess && (
              <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                {keyModalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveAPIKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={savingKey}
                  className="w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-white/30"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                  <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Fast)</option>
                  <option value="gemini-3.8-pro">gemini-3.8-pro (Deep Reasoning)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  disabled={savingKey}
                  className="w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-white/30 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  disabled={savingKey}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKey || !apiKeyInput.trim()}
                  className="rounded-lg bg-white text-slate-950 font-bold px-4 py-2 text-xs transition hover:bg-slate-200 disabled:opacity-50"
                >
                  {savingKey ? "Verifying..." : "Save Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tutor;
