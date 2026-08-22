/**
 * Helper utility to process, resize, and compress signature image files in the browser.
 * Keeps output reasonably small while preserving aspect ratio and PNG transparency.
 */
export const processSignatureImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No image file selected."));
    }

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return reject(new Error("Unsupported image format. Please select a PNG, JPEG, or WebP image."));
    }

    // Reject raw files larger than 5MB
    if (file.size > 5 * 1024 * 1024) {
      return reject(new Error("Signature image is too large. Please choose a smaller image."));
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read image file."));

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error("Failed to load image."));

      img.onload = () => {
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 400;

        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scaling without distortion
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        const isPng = file.type === "image/png";

        if (isPng) {
          ctx.clearRect(0, 0, width, height);
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = isPng ? "image/png" : "image/jpeg";
        const quality = isPng ? undefined : 0.88;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // Reject if data URL string is larger than ~750,000 characters (~550KB)
        if (dataUrl.length > 750000) {
          return reject(new Error("Signature image is too large. Please choose a smaller image."));
        }

        resolve(dataUrl);
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
};

export default processSignatureImage;
