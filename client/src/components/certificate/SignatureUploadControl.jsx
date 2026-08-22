import React, { useRef, useState } from "react";
import { processSignatureImage } from "../../utils/processSignatureImage.js";

function SignatureUploadControl({
  label = "Signature Type",
  personName = "",
  mode = "blank",
  image = null,
  onModeChange,
  onImageChange,
  onRemoveImage,
  helperText
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setErrorMsg("");
      const dataUrl = await processSignatureImage(file);
      if (onImageChange) {
        onImageChange(dataUrl);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to process signature image.");
    } finally {
      setIsProcessing(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleSelectBlank = () => {
    setErrorMsg("");
    if (onModeChange) {
      onModeChange("blank");
    }
  };

  const handleSelectUpload = () => {
    setErrorMsg("");
    if (onModeChange) {
      onModeChange("image");
    }
  };

  const handleRemove = () => {
    setErrorMsg("");
    if (onRemoveImage) {
      onRemoveImage();
    } else if (onModeChange) {
      onModeChange("blank");
    }
  };

  return (
    <div className="space-y-3">
      {/* Label and Helper Text */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          {label}
        </label>
        {helperText && <p className="text-[11px] text-slate-500 font-medium">{helperText}</p>}
      </div>

      {/* Segmented Control / Radio Group */}
      <div className="inline-flex rounded-xl bg-slate-200/70 p-1 border border-slate-200">
        <button
          type="button"
          onClick={handleSelectBlank}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
            mode === "blank"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
          aria-label={`Set signature for ${personName || "signer"} to blank`}
        >
          Blank
        </button>
        <button
          type="button"
          onClick={handleSelectUpload}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
            mode === "image"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
          aria-label={`Upload signature for ${personName || "signer"}`}
        >
          Upload Signature
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileSelect}
        className="hidden"
        id={`signature-upload-${(personName || "signer").replace(/\s+/g, "-").toLowerCase()}`}
      />

      {/* Mode = Blank Message */}
      {mode === "blank" && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-500">
          No signature will appear on the certificate.
        </div>
      )}

      {/* Mode = Upload Signature */}
      {mode === "image" && (
        <div className="space-y-3">
          {image ? (
            /* Thumbnail Preview Card */
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div
                className="flex h-16 w-36 shrink-0 items-center justify-center rounded-lg border border-slate-100 p-1.5"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)",
                  backgroundSize: "12px 12px",
                  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px"
                }}
              >
                <img
                  src={image}
                  alt={`Signature for ${personName}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                >
                  {isProcessing ? "Processing..." : "Replace Image"}
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                >
                  Remove Signature
                </button>
              </div>
            </div>
          ) : (
            /* File Upload Trigger Dropzone */
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4 text-center hover:bg-blue-50/80 transition cursor-pointer"
              >
                <span className="text-xl block mb-1">✍️</span>
                <span className="text-xs font-black text-blue-700">
                  {isProcessing ? "Processing Signature..." : "Choose Signature Image"}
                </span>
                <span className="text-[11px] block font-semibold text-slate-500 mt-0.5">
                  PNG with transparent background recommended (max 800x400)
                </span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SignatureUploadControl;
