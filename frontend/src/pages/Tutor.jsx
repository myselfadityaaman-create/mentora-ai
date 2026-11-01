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
import Footer from "../components/Footer";
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

const SUGGESTED_PROMPTS = [
  { text: "Explain recursion in programming with a simple analogy", subject: "Computer Science" },
  { text: "What is the difference between speed and velocity?", subject: "Physics" },
  { text: "How does photosynthesis produce oxygen?", subject: "Biology" },
  { text: "Explain Bayes' theorem with a real-life medical test example", subject: "Mathematics" },
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

  // Voice Interaction Mode state (Phase 8)
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPlayingMsgId, setCurrentPlayingMsgId] = useState(null);
  const [voiceError, setVoiceError] = useState(null);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Clean up audio & recognition on unmount
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
        // Conversation history load error
      }
    }
    fetchConversations();
  }, []);

  // Load user documents for RAG grounding
  useEffect(() => {
    async function fetchUserDocs() {
      try {
        const res = await listDocuments();
        setDocuments(res.documents || []);
      } catch {
        // Document fetch error
      }
    }
    fetchUserDocs();
  }, []);

  // Load active conversation when changed
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
        setError("Failed to load conversation. It may have been deleted.");
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

  // --------------------------------------------------
  // Voice Helper Functions (TTS & STT - Phase 8)
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
          setVoiceError("Microphone permission was denied. Please allow microphone access in your browser settings to use voice input.");
        } else if (event.error === "no-speech") {
          setVoiceError("No speech was detected. Please try again or type your question.");
        } else if (event.error === "audio-capture") {
          setVoiceError("No microphone was detected on this device. Please check your audio hardware.");
        } else {
          setVoiceError(`Voice input error: ${event.error}. You can continue by typing.`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsRecording(false);
      setVoiceError("Could not start microphone: " + (err.message || "Unknown error"));
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition already stopped
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

    // Optimistically append user message
    const userMsg = {
      id: "temp-" + Date.now(),
      role: "user",
      content: trimmed,
      input_mode: inputMode,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
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

      // Append assistant response with unique ID for audio playback
      const assistantMsg = {
        ...res.message,
        id: res.message.id || "msg-" + Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If Voice Mode is ON, immediately read AI response aloud
      if (isVoiceMode) {
        handlePlayTTS(assistantMsg.id, assistantMsg.content);
      }

      // If new conversation was created, record it
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
      setKeyModalSuccess("Key verified & saved! AI Tutor is now unlocked.");
      setAiStatus({ configured: true, model: res.model });
      setTimeout(() => {
        setShowKeyModal(false);
        setKeyModalSuccess("");
        setApiKeyInput("");
      }, 1500);
    } catch (err) {
      setKeyModalError(err.message || "Failed to verify API key with Google Gemini.");
    } finally {
      setSavingKey(false);
    }
  };

  // Safe markdown-like formatter for code blocks, bold text, lists, and linebreaks
  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : "";
        const code = lang ? lines.slice(1).join("\n") : lines.join("\n");

        return (
          <div key={index} className="my-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 font-mono text-xs">
            {lang && (
              <div className="bg-slate-800 px-4 py-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                {lang}
              </div>
            )}
            <pre className="p-4 overflow-x-auto text-emerald-300">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Check if this part contains setup instructions
      const isSetupWarning = part.includes("AI is not configured") || part.includes("API Key Not Configured");

      // Split into lines for list and bold parsing
      const lines = part.split("\n");

      return (
        <div key={index} className="space-y-1.5">
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lIdx} className="h-1" />;

            // Headings
            if (trimmed.startsWith("### ")) {
              return (
                <h3 key={lIdx} className="text-base font-bold text-blue-300 mt-2 mb-1">
                  {trimmed.replace(/^###\s+/, "")}
                </h3>
              );
            }
            if (trimmed.startsWith("#### ")) {
              return (
                <h4 key={lIdx} className="text-sm font-semibold text-slate-200 mt-1.5 mb-1">
                  {trimmed.replace(/^####\s+/, "")}
                </h4>
              );
            }

            // Horizontal rule
            if (trimmed === "---") {
              return <hr key={lIdx} className="border-slate-700 my-2" />;
            }

            // Bullet points
            const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
            const isNumbered = /^\d+\.\s/.test(trimmed);

            // Parse **bold** and `code`
            const content = trimmed.replace(/^[-*]\s+|\d+\.\s+/, "");
            const parsedContent = content.split(/(\*\*.*?\*\*|`.*?`)/g).map((sub, sIdx) => {
              if (sub.startsWith("**") && sub.endsWith("**")) {
                return <strong key={sIdx} className="text-white font-semibold">{sub.slice(2, -2)}</strong>;
              }
              if (sub.startsWith("`") && sub.endsWith("`")) {
                return (
                  <code key={sIdx} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-blue-300">
                    {sub.slice(1, -1)}
                  </code>
                );
              }
              return sub;
            });

            if (isBullet) {
              return (
                <div key={lIdx} className="flex items-start gap-2 pl-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="leading-relaxed">{parsedContent}</span>
                </div>
              );
            }

            if (isNumbered) {
              const numMatch = trimmed.match(/^(\d+\.)\s/);
              const num = numMatch ? numMatch[1] : "1.";
              return (
                <div key={lIdx} className="flex items-start gap-2 pl-2">
                  <span className="text-blue-400 font-semibold text-xs">{num}</span>
                  <span className="leading-relaxed">{parsedContent}</span>
                </div>
              );
            }

            return (
              <p key={lIdx} className="leading-relaxed">
                {parsedContent}
              </p>
            );
          })}

          {/* If setup notice is detected, render quick action button */}
          {isSetupWarning && !aiStatus.configured && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:brightness-110 transition"
              >
                <span>🔑</span> Connect Google Gemini API Key Now
              </button>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <Navbar />

      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-6 gap-6 overflow-hidden">
        {/* Sidebar: Conversation history */}
        <aside className="hidden md:flex w-72 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <button
            onClick={handleStartNewConversation}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
          >
            <span>+</span> New Conversation
          </button>

          <h3 className="mt-5 mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Past Conversations
          </h3>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {conversations.length === 0 ? (
              <p className="px-2 py-4 text-xs text-slate-500 text-center">
                No past conversations yet.
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm cursor-pointer transition ${
                    currentConvoId === conv.id
                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 font-medium"
                      : "text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  <span className="truncate pr-2">{conv.title || "Untitled Chat"}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 text-xs"
                    title="Delete conversation"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Chat Panel */}
        <section className="flex flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6 overflow-hidden">
          {/* Controls Bar: Language + Subject + AI Key Status */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🤖</span>
              <div>
                <h1 className="text-lg font-bold text-slate-100">Mentora AI Tutor</h1>
                <p className="text-xs text-slate-400">Multilingual generative explanations</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Subject selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Subject:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Language:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Study Material / Document RAG selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1">📎 Doc:</span>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 max-w-[170px] truncate ${
                    selectedDocId
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-semibold"
                      : "border-slate-700 bg-slate-900 text-slate-200"
                  }`}
                  title="Attach study document for RAG-grounded tutoring"
                >
                  <option value="">No Doc (General Tutor)</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.file_type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Key Status Button */}
              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition border flex items-center gap-1.5 ${
                  aiStatus.configured
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                }`}
              >
                <span>{aiStatus.configured ? "●" : "⚙️"}</span>
                <span>{aiStatus.configured ? "Gemini Active" : "Connect AI Key"}</span>
              </button>

              {/* Voice Interaction Mode Toggle (Phase 8) */}
              <button
                type="button"
                onClick={() => {
                  setIsVoiceMode((prev) => !prev);
                  if (isSpeaking) handleStopTTS();
                  if (isRecording) handleStopRecording();
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition border flex items-center gap-1.5 ${
                  isVoiceMode
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-sm"
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
                }`}
                title="Toggle automatic speech-to-text and spoken AI responses"
              >
                <span>🎙️</span>
                <span>{isVoiceMode ? "Voice Mode: ON" : "Voice: OFF"}</span>
              </button>
            </div>
          </div>

          {/* Voice Mode Status Banner (Phase 8) */}
          {isVoiceMode && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs text-blue-200">
              <div className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                <span className="truncate">
                  <strong>🎙️ Multilingual Voice Mode Active</strong> · Language: <strong>{selectedLanguage}</strong>. Spoken responses will play automatically. Click 🎙️ below to speak.
                </span>
              </div>
              {isSpeaking && (
                <div className="flex items-center gap-2 ml-3 shrink-0">
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
                    className="rounded bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-blue-500 transition"
                  >
                    {isPaused ? "▶️ Resume" : "⏸️ Pause"}
                  </button>
                  <button
                    type="button"
                    onClick={handleStopTTS}
                    className="rounded border border-blue-400/40 px-2 py-0.5 text-[11px] text-blue-300 hover:text-white transition"
                  >
                    ⏹️ Stop
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active RAG Grounding Indicator */}
          {selectedDocId && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300">
              <div className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate">
                  RAG Grounding Active:{" "}
                  <strong>
                    {documents.find((d) => d.id === selectedDocId)?.title || "Attached Document"}
                  </strong>{" "}
                  · Tutor will reference and cite your uploaded study notes.
                </span>
              </div>
              <button
                onClick={() => setSelectedDocId("")}
                className="ml-3 shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20"
              >
                Detach
              </button>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 py-2">
            {loadingConvo ? (
              <div className="py-20 text-center">
                <LoadingSpinner size="md" text="Loading conversation..." />
              </div>
            ) : messages.length === 0 ? (
              /* Empty State */
              <div className="flex h-full flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 border border-blue-500/20 text-3xl mb-4 text-blue-400">
                  ✦
                </div>
                <h2 className="text-xl font-bold text-slate-200">How can I help you learn today?</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Ask me anything about programming, science, mathematics, or any other topic in {selectedLanguage}!
                </p>

                {/* Suggestions */}
                <div className="mt-6 grid w-full gap-2 text-left">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputMessage(prompt.text);
                        setSelectedSubject(prompt.subject);
                      }}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-900 text-left"
                    >
                      <span className="font-semibold text-blue-400 mr-2">[{prompt.subject}]</span>
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-semibold text-slate-400">
                      {msg.role === "user" ? (user?.name || "You") : "Mentora AI"}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10"
                        : "border border-slate-800 bg-slate-900 text-slate-200 rounded-tl-none shadow-md"
                    }`}
                  >
                    {renderFormattedText(msg.content)}

                    {/* RAG Source Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-800/80">
                        <p className="text-[11px] font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                          <span>📄</span> Grounded Source Citations ({msg.citations.length}):
                        </p>
                        <div className="space-y-1.5">
                          {msg.citations.map((cite, ci) => (
                            <div
                              key={ci}
                              className="rounded-lg bg-slate-950/70 border border-slate-800 p-2.5 text-xs text-slate-300"
                            >
                              <div className="flex items-center justify-between text-[11px] text-blue-400 font-semibold mb-1">
                                <span>{cite.document_title} · {cite.page_or_slide_label || `Page ${cite.page_number}`}</span>
                                <span className="text-[10px] text-emerald-400/90 font-mono">
                                  Match: {Math.round(cite.score * 100)}%
                                </span>
                              </div>
                              <p className="italic text-slate-400 line-clamp-2">
                                "{cite.content_preview}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Player Controls for AI Tutor Responses (Phase 8) */}
                    {msg.role === "assistant" && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(msg.id || `msg-${index}`, msg.content)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                              currentPlayingMsgId === (msg.id || `msg-${index}`)
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                            }`}
                            title="Listen to this explanation in selected language"
                          >
                            {currentPlayingMsgId === (msg.id || `msg-${index}`) ? (
                              isPaused ? (
                                <><span>▶️</span> Resume</>
                              ) : (
                                <><span>⏸️</span> Pause</>
                              )
                            ) : (
                              <><span>🔊</span> Listen Aloud</>
                            )}
                          </button>

                          {currentPlayingMsgId === (msg.id || `msg-${index}`) && (
                            <button
                              type="button"
                              onClick={handleStopTTS}
                              className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                              title="Stop audio"
                            >
                              ⏹️ Stop
                            </button>
                          )}
                        </div>

                        {currentPlayingMsgId === (msg.id || `msg-${index}`) && !isPaused && (
                          <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-mono">
                            <span className="inline-block h-2 w-0.5 bg-blue-400 animate-pulse" />
                            <span className="inline-block h-3 w-0.5 bg-blue-400 animate-pulse delay-75" />
                            <span className="inline-block h-1.5 w-0.5 bg-blue-400 animate-pulse delay-150" />
                            <span>Speaking ({selectedLanguage})...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-xs font-semibold text-blue-400">Mentora AI</span>
                </div>
                <div className="rounded-2xl rounded-tl-none border border-slate-800 bg-slate-900 px-5 py-4">
                  <LoadingSpinner size="sm" text="Thinking and formulating explanation..." />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box with Voice & Keyboard Support (Phase 8) */}
          <form onSubmit={(e) => handleSend(e, isRecording ? "voice" : "text")} className="mt-4 pt-3 border-t border-slate-800">
            {/* Live Recording Status Bar */}
            {isRecording && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="font-semibold text-red-300">Listening in {selectedLanguage}...</span>
                  <span className="text-slate-400 text-[11px] hidden sm:inline">Speak clearly into microphone</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleStopRecording();
                      if (inputMessage.trim()) {
                        handleSend(null, "voice");
                      }
                    }}
                    className="rounded-lg bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-500 shadow transition"
                  >
                    Done &amp; Send →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleStopRecording();
                    }}
                    className="rounded-lg border border-red-500/30 px-2 py-1 text-[11px] text-red-300 hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Voice Error Notice with Text Fallback */}
            {voiceError && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{voiceError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVoiceError(null)}
                  className="text-amber-400 hover:text-white text-xs underline font-medium"
                >
                  Type Instead
                </button>
              </div>
            )}

            <div className="relative flex items-center gap-2">
              {/* Microphone Speech-to-Text Button */}
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={loading}
                className={`rounded-xl p-3 text-sm font-semibold transition flex items-center justify-center shrink-0 ${
                  isRecording
                    ? "bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/30"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600"
                }`}
                title={isRecording ? "Stop voice recording" : `Speak question in ${selectedLanguage}`}
              >
                {isRecording ? "⏹️ Stop" : "🎙️ Speak"}
              </button>

              <div className="relative flex-1">
                <textarea
                  rows={2}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isRecording
                      ? `Listening to your voice in ${selectedLanguage}...`
                      : `Ask a question in ${selectedLanguage}... (Enter to send, or click 🎙️ Speak)`
                  }
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-3.5 pr-24 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="absolute right-2.5 top-3.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? "Sending..." : "Send →"}
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-slate-500">
              Mentora AI Voice Tutor supports multilingual voice input &amp; speech synthesis. Verify important facts with primary textbooks.
            </p>
          </form>
        </section>
      </div>

      {/* AI Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">✨</span>
                <h2 className="text-lg font-bold text-white">Google Gemini API Setup</h2>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Mentora AI uses <strong>Google Gemini 3.8 Flash</strong> for live multilingual tutoring and instant quiz generation.
            </p>

            <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-200">
              <span>💡 Don't have a key? Get one free in 10 seconds at </span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="font-bold underline text-blue-300 hover:text-white"
              >
                Google AI Studio →
              </a>
            </div>

            {keyModalError && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                {keyModalError}
              </div>
            )}

            {keyModalSuccess && (
              <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                {keyModalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveAPIKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Select Gemini Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={savingKey}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                  <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Fast / High Capacity)</option>
                  <option value="gemini-3.8-pro">gemini-3.8-pro (Deep Reasoning)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  If one model is temporarily busy (503), you can switch models here and retry.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Paste Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  disabled={savingKey}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  disabled={savingKey}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKey || !apiKeyInput.trim()}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingKey ? "Verifying with Google..." : "Verify & Activate Key"}
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

export default Tutor;
