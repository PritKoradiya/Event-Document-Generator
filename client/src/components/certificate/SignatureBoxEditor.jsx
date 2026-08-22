import React from "react";
import SignatureUploadControl from "./SignatureUploadControl.jsx";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

function SignatureBoxEditor({
  box,
  index,
  onChange,
  onRemove
}) {
  const {
    signerName = "",
    signerDesignation = "",
    signatureMode = "blank",
    signatureImage = null
  } = box || {};

  const handleFieldChange = (field, value) => {
    onChange({
      ...box,
      [field]: value
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4 shadow-xs transition hover:border-slate-300">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <h4 className="text-sm font-black text-slate-900 font-sans">
          Signature {index + 1}
        </h4>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95"
        >
          Remove Signature Box
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
          Signer Name
          <input
            className={inputClass}
            type="text"
            value={signerName}
            onChange={(e) => handleFieldChange("signerName", e.target.value)}
            placeholder="e.g. Dr. Niraj Shah"
          />
        </label>

        <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
          Text Below Name
          <input
            className={inputClass}
            type="text"
            value={signerDesignation}
            onChange={(e) => handleFieldChange("signerDesignation", e.target.value)}
            placeholder="e.g. Conference Chair"
          />
        </label>
      </div>

      <SignatureUploadControl
        label="Signature Type"
        personName={signerName || `Signature ${index + 1}`}
        mode={signatureMode}
        image={signatureImage}
        onModeChange={(mode) => {
          if (mode === "blank") {
            onChange({ ...box, signatureMode: "blank", signatureImage: null });
          } else {
            onChange({ ...box, signatureMode: "image" });
          }
        }}
        onImageChange={(imageDataUrl) => {
          onChange({
            ...box,
            signatureMode: "image",
            signatureImage: imageDataUrl
          });
        }}
        onRemoveImage={() => {
          onChange({
            ...box,
            signatureMode: "blank",
            signatureImage: null
          });
        }}
      />
    </div>
  );
}

export default SignatureBoxEditor;
