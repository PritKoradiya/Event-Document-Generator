import { useState, useEffect } from "react";
import { useAttendanceOptions } from "../../hooks/useAttendanceOptions.js";
import { getReadableAttendanceError } from "../../utils/attendanceErrorUtils.js";

function AddDepartmentModal({ isOpen, onClose, onSuccess }) {
  const { createDepartment } = useAttendanceOptions();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting]);

  if (!isOpen) return null;

  const handleClose = () => {
    setCode("");
    setName("");
    setDescription("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedCode = code.replace(/^[-_\s]+/, "").trim().toUpperCase();
    const trimmedName = name.replace(/^[-_\s]+/, "").trim();

    if (!trimmedCode) {
      setError("Department Code / Name is required.");
      return;
    }
    if (!trimmedName) {
      setError("Display Name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDepartment({
        code: trimmedCode,
        name: trimmedName,
        description: description.trim()
      });
      if (res && res.success) {
        setCode("");
        setName("");
        setDescription("");
        setError("");
        onClose();
        if (onSuccess) {
          onSuccess(res.data || { code: trimmedCode, name: trimmedName });
        }
      }
    } catch (err) {
      setError(getReadableAttendanceError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="app-glass-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4 animate-hero-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <div className="app-glass-modal w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-black text-slate-950 font-sans">
              Add New Department
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              Create an academic department for student rosters
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Department Code / Short Name *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ECE"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none uppercase font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Display Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics and Communication Engineering"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Department of ECE"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? "Adding Department..." : "Add Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDepartmentModal;
