function LoadingSpinner({ size = "md", text = "" }) {
  const sizes = {
    sm: "h-5 w-5 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizes[size] || sizes.md}`}
      />
      {text && <span className="text-slate-400 text-sm">{text}</span>}
    </div>
  );
}

export default LoadingSpinner;
