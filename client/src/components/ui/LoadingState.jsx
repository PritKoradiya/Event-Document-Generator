function LoadingState({ message = "Loading workspace data..." }) {
  return (
    <div className="app-glass-surface flex flex-col items-center justify-center p-12 text-center" role="status" aria-live="polite">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-700">{message}</p>
    </div>
  );
}

export default LoadingState;
