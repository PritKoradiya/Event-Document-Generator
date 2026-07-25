import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import useReducedMotion from "../../hooks/useReducedMotion.js";
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

  // Background Mode State ("full" | "reduced" | "off")
  const [bgMode, setBgMode] = useState(() => {
    try {
      const saved = localStorage.getItem("eventDocumentBackgroundMode");
      return ["full", "reduced", "off"].includes(saved) ? saved : "full";
    } catch {
      return "full";
    }
  });

  // Mouse position tracking for cursor glow & parallax
  const [cursorPos, setCursorPos] = useState({ x: -500, y: -500 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth > 768 : true
  );

  const parallaxTargetRef = useRef({ x: 0, y: 0 });
  const parallaxCurrentRef = useRef({ x: 0, y: 0 });

  // Listen for background mode changes
  useEffect(() => {
    const handleBgModeChange = () => {
      try {
        const saved = localStorage.getItem("eventDocumentBackgroundMode");
        const normalized = ["full", "reduced", "off"].includes(saved)
          ? saved
          : "full";
        setBgMode(normalized);
      } catch {
        setBgMode("full");
      }
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
    if (bgMode === "off" || bgMode === "reduced" || videoFailed) {
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

  // Window resize & device type detection
  useEffect(() => {
    let timeoutId = null;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsDesktop(window.innerWidth > 768);
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Pointer movement listener for desktop cursor glow & parallax
  useEffect(() => {
    if (!isDesktop || reducedMotion || bgMode === "off") return;

    const handlePointerMove = (e) => {
      if (e.pointerType === "touch") return;
      setCursorPos({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);

      const targetX = (e.clientX / window.innerWidth - 0.5) * 14;
      const targetY = (e.clientY / window.innerHeight - 0.5) * 14;
      parallaxTargetRef.current = { x: targetX, y: targetY };
    };

    const handlePointerLeave = () => {
      setCursorVisible(false);
      parallaxTargetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener("pointermove", handlePointerMove);
    document.body.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.body.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [isDesktop, reducedMotion, bgMode]);

  // Autoplay video safely on component mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;

    const startVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Muted galaxy autoplay could not start:", error);
        }
        setVideoFailed(true);
      }
    };

    startVideo();
  }, []);

  // Canvas Star Field Render Engine
  useEffect(() => {
    if (bgMode === "off") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId = null;
    let stars = [];
    let shootingStar = null;
    let lastShootingStarTime = Date.now();
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

      // Smooth lerp parallax for desktop
      parallaxCurrentRef.current.x +=
        (parallaxTargetRef.current.x - parallaxCurrentRef.current.x) * 0.05;
      parallaxCurrentRef.current.y +=
        (parallaxTargetRef.current.y - parallaxCurrentRef.current.y) * 0.05;

      const pX = parallaxCurrentRef.current.x * 0.25;
      const pY = parallaxCurrentRef.current.y * 0.25;

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

        const twinkle = Math.sin(
          star.twinkleOffset + frameCount * star.twinkleSpeed
        );
        const currentOpacity = Math.max(
          0.08,
          Math.min(1, star.baseOpacity + twinkle * 0.22)
        );

        const drawX = star.x + pX;
        const drawY = star.y + pY;

        ctx.beginPath();
        if (star.type === 3) {
          // Accent star radial glow
          const glowRad = star.radius * 2.8;
          const grad = ctx.createRadialGradient(
            drawX,
            drawY,
            0,
            drawX,
            drawY,
            glowRad
          );
          grad.addColorStop(0, `${star.color}${currentOpacity})`);
          grad.addColorStop(0.4, `${star.color}${currentOpacity * 0.5})`);
          grad.addColorStop(1, `${star.color}0)`);
          ctx.fillStyle = grad;
          ctx.arc(drawX, drawY, glowRad, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.arc(drawX, drawY, star.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${star.color}${currentOpacity})`;
          ctx.fill();
        }
      }

      // Shooting Star (once every ~24 seconds)
      const now = Date.now();
      if (
        !reducedMotion &&
        !shootingStar &&
        now - lastShootingStarTime > 24000
      ) {
        if (Math.random() < 0.3) {
          lastShootingStarTime = now;
          shootingStar = {
            startX: Math.random() * width * 0.7,
            startY: Math.random() * height * 0.3,
            length: 90 + Math.random() * 60,
            progress: 0,
            speed: 0.035
          };
        }
      }

      if (shootingStar) {
        shootingStar.progress += shootingStar.speed;
        const tailLength = shootingStar.length;
        const currX = shootingStar.startX + shootingStar.progress * 260;
        const currY = shootingStar.startY + shootingStar.progress * 130;
        const headX = currX;
        const headY = currY;
        const tailX = currX - tailLength * 0.88;
        const tailY = currY - tailLength * 0.44;

        const alpha =
          shootingStar.progress < 0.2
            ? shootingStar.progress / 0.2
            : 1 - (shootingStar.progress - 0.2) / 0.8;

        if (alpha > 0) {
          const shotGrad = ctx.createLinearGradient(tailX, tailY, headX, headY);
          shotGrad.addColorStop(0, "rgba(186, 230, 253, 0)");
          shotGrad.addColorStop(0.7, `rgba(186, 230, 253, ${alpha * 0.35})`);
          shotGrad.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.8})`);

          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(headX, headY);
          ctx.strokeStyle = shotGrad;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        if (shootingStar.progress >= 1) {
          shootingStar = null;
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

    // Page Visibility API handler for video & canvas
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      const video = videoRef.current;

      if (isTabVisible) {
        if (!reducedMotion) {
          animFrameId = requestAnimationFrame(render);
        }
        if (
          video &&
          video.paused &&
          bgMode === "full" &&
          !reducedMotion &&
          !videoFailed
        ) {
          video.play().catch(() => {});
        }
      } else {
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
        }
        if (video && !video.paused) {
          video.pause();
        }
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
  }, [activeVariant, reducedMotion, bgMode, videoFailed]);

  // Inline transform for parallax on nebula elements
  const nebulaStyleOne = {
    transform: `translate3d(${parallaxCurrentRef.current.x * 1.2}px, ${
      parallaxCurrentRef.current.y * 1.2
    }px, 0)`
  };
  const nebulaStyleTwo = {
    transform: `translate3d(${-parallaxCurrentRef.current.x * 0.9}px, ${
      -parallaxCurrentRef.current.y * 0.9
    }px, 0)`
  };
  const nebulaStyleThree = {
    transform: `translate3d(${parallaxCurrentRef.current.x * 0.7}px, ${
      -parallaxCurrentRef.current.y * 0.7
    }px, 0)`
  };

  return (
    <div
      className={`galaxy-background galaxy-background--${activeVariant} galaxy-background--mode-${bgMode}`}
      aria-hidden="true"
    >
      {/* Layer 0: Base Gradient */}
      <div className="galaxy-base-gradient" />

      {/* Layer 1: Video Layer */}
      {bgMode === "full" && !reducedMotion && !videoFailed && (
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
          onLoadedMetadata={() => {
            if (import.meta.env.DEV) {
              console.log("Galaxy video metadata loaded");
            }
          }}
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
            if (import.meta.env.DEV) {
              console.log(
                "Galaxy video playing:",
                videoRef.current?.currentSrc
              );
            }
          }}
          onError={(event) => {
            setVideoLoading(false);
            setVideoReady(false);
            setVideoFailed(true);
            if (import.meta.env.DEV) {
              console.warn(
                "Galaxy video failed:",
                event.currentTarget.error,
                event.currentTarget.currentSrc
              );
            }
          }}
        >
          <source src="/backgrounds/galaxy-loop.webm" type="video/webm" />
          <source src="/backgrounds/galaxy-loop.mp4" type="video/mp4" />
        </video>
      )}

      {/* Layer 2: Video Tint Overlay */}
      {bgMode === "full" && !reducedMotion && !videoFailed && (
        <div className="galaxy-video-tint" />
      )}

      {/* Layer 3: Canvas Star Field */}
      {bgMode !== "off" && (
        <canvas ref={canvasRef} className="galaxy-star-canvas" />
      )}

      {/* Layer 4: Nebula Blobs */}
      {bgMode !== "off" && (
        <>
          <div
            className="galaxy-nebula galaxy-nebula-one"
            style={nebulaStyleOne}
          />
          <div
            className="galaxy-nebula galaxy-nebula-two"
            style={nebulaStyleTwo}
          />
          <div
            className="galaxy-nebula galaxy-nebula-three"
            style={nebulaStyleThree}
          />
        </>
      )}

      {/* Layer 5 & 6: Grid, Vignette & Readability Layers */}
      <div className="galaxy-grid" />
      <div className="galaxy-vignette" />
      <div className="galaxy-readability-overlay" />

      {/* Layer 7: Cursor Glow */}
      {isDesktop && !reducedMotion && bgMode !== "off" && (
        <div
          className="galaxy-cursor-glow"
          style={{
            transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
            opacity: cursorVisible ? 1 : 0
          }}
        />
      )}
    </div>
  );
}

export default GalaxyBackground;
