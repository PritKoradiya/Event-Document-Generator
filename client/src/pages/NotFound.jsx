import { Link, useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center animate-hero-fade-in">
      <div className="app-glass-surface max-w-lg w-full p-8 sm:p-12 space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-600 font-mono text-3xl font-black shadow-lg">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 font-sans">
            Page not found
          </h1>
          <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-md mx-auto">
            The requested page does not exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-xs font-black text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition active:scale-98"
          >
            <span>🏠</span>
            <span>Go to Main Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/80 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-white transition active:scale-98"
          >
            <span>←</span>
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default NotFound;
