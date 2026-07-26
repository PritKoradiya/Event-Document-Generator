import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import useReducedMotion from "../../hooks/useReducedMotion.js";
import { getSavedBackgroundMode } from "../../utils/backgroundMode.js";
import "./GalaxyBackground.css";

function GalaxyBackground({ variant }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  // Video State Diagnostics
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  // Background Mode State ("video" | "stars" | "static")
  const [bgMode, setBgMode] = useState(getSavedBackgroundMode);

  // Listen for background mode changes
  useEffect(() => {
    const handleBgModeChange = () => {
      setBgMode(getSavedBackgroundMode());
    };

    window.addEventListener("bgModeChange", handleBgModeChange);
    window.addEventListener("storage", handleBgModeChange);

    return () => {
      window.removeEventListener("bgModeChange", handleBgModeChange);
      window.removeEventListener("storage", handleBgModeChange);
    };
  }, []);

  // Broadcast video status changes for DEV environment diagnostics
  useEffect(() => {
    let status = "Loading";
    if (bgMode !== "video" || videoFailed) {
      status = "Fallback";
    } else if (videoReady && !videoFailed) {
      status = "Playing";
    }

    window.dispatchEvent(
      new CustomEvent("galaxyVideoStatusChange", {
        detail: { status, videoReady, videoFailed, videoLoading, bgMode }
      })
    );
  }, [videoReady, videoFailed, videoLoading, bgMode]);

  // Infer variant from route if not explicitly passed
  const activeVariant = useMemo(() => {
    if (variant) return variant;
    const path = location.pathname;
    if (path === "/") return "landing";
    if (path.endsWith("-dashboard")) return "dashboard";
    if (
      path.startsWith("/create-") ||
      path === "/bulk-generate" ||
      path === "/templates" ||
      path === "/categories"
    ) {
      return "workspace";
    }
    return "record";
  }, [variant, location.pathname]);

  // Play/Pause Video according to background mode & reduced motion
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (bgMode === "video" && !reducedMotion && !videoFailed) {
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.play().catch((error) => {
        if (import.meta.env.DEV) {
          console.warn("Galaxy video play error:", error);
        }
        setVideoFailed(true);
      });
    } else {
      video.pause();
    }
  }, [bgMode, reducedMotion, videoFailed]);

  // Canvas Star Field Render Engine - Active ONLY in "stars" mode
  useEffect(() => {
    if (bgMode !== "stars") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId = null;
    let stars = [];
    let isTabVisible = !document.hidden;

    // Helper: generate stars based on viewport & active variant
    const generateStars = (width, height) => {
      let baseCount = 110;
      if (width <= 640) {
        baseCount = 45;
      } else if (width <= 1024) {
        baseCount = 75;
      }

      let variantMultiplier = 1.0;
      if (activeVariant === "dashboard") variantMultiplier = 0.85;
      if (activeVariant === "workspace") variantMultiplier = 0.65;
      if (activeVariant === "record") variantMultiplier = 0.5;

      const starCount = Math.round(baseCount * variantMultiplier);
      const generated = [];

      for (let i = 0; i < starCount; i++) {
        const rand = Math.random();
        let type = 1; // Distant star
        let radius = 0.6 + Math.random() * 0.6;
        let baseOpacity = 0.15 + Math.random() * 0.3;
        let speed = 0.04 + Math.random() * 0.1;

        if (rand > 0.65 && rand <= 0.92) {
          type = 2; // Medium star
          radius = 1.1 + Math.random() * 0.8;
          baseOpacity = 0.4 + Math.random() * 0.35;
          speed = 0.08 + Math.random() * 0.12;
        } else if (rand > 0.92) {
          type = 3; // Accent star with soft blue glow
          radius = 1.8 + Math.random() * 1.2;
          baseOpacity = 0.65 + Math.random() * 0.3;
          speed = 0.1 + Math.random() * 0.15;
        }

        generated.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          type,
          baseOpacity,
          speed,
          twinkleSpeed: 0.015 + Math.random() * 0.03,
          twinkleOffset: Math.random() * Math.PI * 2,
          color:
            type === 3
              ? Math.random() > 0.5
                ? "rgba(186, 230, 253, "
                : "rgba(196, 181, 253, "
              : "rgba(248, 250, 252, "
        });
      }
      return generated;
    };

    let width = window.innerWidth;
    let height = window.innerHeight;

    const setupCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      stars = generateStars(width, height);
    };

    setupCanvasSize();

    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // Draw & Update Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        if (!reducedMotion) {
          star.y -= star.speed;
          star.x += star.speed * 0.15;

          if (star.y < -10) {
            star.y = height + 10;
            star.x = Math.random() * width;
          }
          if (star.x > width + 10) {
            star.x = -10;
          }
        }

        const twinkle = reducedMotion
          ? 0
          : Math.sin(star.twinkleOffset + frameCount * star.twinkleSpeed);
        const currentOpacity = Math.max(
          0.08,
          Math.min(1, star.baseOpacity + twinkle * 0.22)
        );

        ctx.beginPath();
        if (star.type === 3) {
          const glowRad = star.radius * 2.8;
          const grad = ctx.createRadialGradient(
            star.x,
            star.y,
            0,
            star.x,
            star.y,
            glowRad
          );
          grad.addColorStop(0, `${star.color}${currentOpacity})`);
          grad.addColorStop(0.4, `${star.color}${currentOpacity * 0.5})`);
          grad.addColorStop(1, `${star.color}0)`);
          ctx.fillStyle = grad;
          ctx.arc(star.x, star.y, glowRad, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${star.color}${currentOpacity})`;
          ctx.fill();
        }
      }

      if (!reducedMotion && isTabVisible) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    // Render single frame if reduced motion, else start loop
    if (reducedMotion) {
      render();
    } else {
      animFrameId = requestAnimationFrame(render);
    }

    // Page Visibility API handler
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !reducedMotion) {
        animFrameId = requestAnimationFrame(render);
      } else if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };

    // Debounced Resize handler
    let resizeTimer = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setupCanvasSize();
        if (reducedMotion) {
          render();
        }
      }, 200);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeVariant, reducedMotion, bgMode]);

  return (
    <div
      className={`galaxy-background galaxy-background--${activeVariant} galaxy-background--mode-${bgMode}`}
      aria-hidden="true"
    >
      {/* Layer 0 / Base Gradient (Static fallback base) */}
      <div className="galaxy-base-gradient" />

      {/* Mode: VIDEO */}
      {bgMode === "video" && (
        <>
          {/* Video Layer */}
          {!reducedMotion && !videoFailed ? (
            <video
              ref={videoRef}
              className={`galaxy-video-layer ${
                videoReady && !videoFailed ? "is-ready" : ""
              }`}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/backgrounds/galaxy-poster.webp"
              tabIndex={-1}
              aria-hidden="true"
              onLoadStart={() => setVideoLoading(true)}
              onLoadedData={() => {
                setVideoLoading(false);
                setVideoReady(true);
                setVideoFailed(false);
              }}
              onCanPlay={() => {
                setVideoLoading(false);
                setVideoReady(true);
                setVideoFailed(false);
              }}
              onPlaying={() => {
                setVideoReady(true);
                setVideoFailed(false);
              }}
              onError={(event) => {
                setVideoLoading(false);
                setVideoReady(false);
                setVideoFailed(true);
                if (import.meta.env.DEV) {
                  console.warn(
                    "Galaxy video load failed:",
                    event.currentTarget?.error
                  );
                }
              }}
            >
              <source src="/backgrounds/galaxy-loop.webm" type="video/webm" />
              <source src="/backgrounds/galaxy-loop.mp4" type="video/mp4" />
            </video>
          ) : (
            /* Poster fallback when reduced motion or video fails */
            <img
              src="/backgrounds/galaxy-poster.webp"
              className="galaxy-video-layer is-ready"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              alt=""
            />
          )}

          {/* Minimal blue tint */}
          <div className="galaxy-video-tint" />

          {/* Minimal readability overlay */}
          <div className="galaxy-readability-overlay" />
        </>
      )}

      {/* Mode: STARS */}
      {bgMode === "stars" && (
        <canvas ref={canvasRef} className="galaxy-star-canvas" />
      )}

      {/* Mode: STATIC - Base gradient only, no extra DOM elements needed */}
    </div>
  );
}

export default GalaxyBackground;
