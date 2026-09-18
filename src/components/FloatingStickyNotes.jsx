import React, { useState, useEffect, useRef } from "react";
import {
  Pin, X, Plus, Trash2, Copy, Check, Minimize2, Maximize2,
  GripHorizontal, Palette, Sparkles, FileText, ChevronLeft, ChevronRight,
  CornerDownRight, Lock, Crown, Zap, Folder
} from "lucide-react";
import { COLORS } from "../styles";

const STICKY_THEMES = [
  { id: "honey", name: "Amber Gold", bg: "#FEF9C3", darkBg: "#2A2415", border: "#EAB308", text: "#713F12", darkText: "#FEF08A" },
  { id: "emerald", name: "Mint Green", bg: "#DCFCE7", darkBg: "#14291D", border: "#22C55E", text: "#14532D", darkText: "#BBF7D0" },
  { id: "ocean", name: "Sky Blue", bg: "#E0F2FE", darkBg: "#132638", border: "#38BDF8", text: "#0C4A6E", darkText: "#BAE6FD" },
  { id: "coral", name: "Rose Pink", bg: "#FFE4E6", darkBg: "#33181E", border: "#FB7185", text: "#881337", darkText: "#FECDD3" },
  { id: "lavender", name: "Violet", bg: "#F3E8FF", darkBg: "#251733", border: "#C084FC", text: "#581C87", darkText: "#E9D5FF" },
];

const DEFAULT_STICKIES = [
  {
    id: 1,
    title: "Quick Scratchpad",
    text: "",
    theme: "honey",
    createdAt: Date.now(),
  },
];

export default function FloatingStickyNotes({
  isOpen,
  onClose,
  currentPlan = "free",
  onOpenUpgrade,
  activeProject,
  onAppendToProject
}) {
  const isPro = currentPlan === "pro" || currentPlan === "team" || currentPlan === "founder";
  const scopeKey = activeProject?.id ? `project_${activeProject.id}` : "global_vault";
  const scopeLabel = activeProject?.name || "Global Scratchpad";

  const [stickies, setStickies] = useState(() => {
    try {
      const saved = localStorage.getItem(`custodian_stickies_${scopeKey}`);
      return saved ? JSON.parse(saved) : [{ ...DEFAULT_STICKIES[0], title: activeProject ? `${activeProject.name} Note` : "Quick Scratchpad" }];
    } catch {
      return DEFAULT_STICKIES;
    }
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return localStorage.getItem("custodian_sticky_minimized") === "true";
    } catch {
      return false;
    }
  });
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem("custodian_sticky_position");
      return saved ? JSON.parse(saved) : { x: Math.max(20, window.innerWidth - 320), y: 90 };
    } catch {
      return { x: 80, y: 100 };
    }
  });

  const [copied, setCopied] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const containerRef = useRef(null);

  // Switch stickies whenever project scope changes (scoped per project!)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`custodian_stickies_${scopeKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStickies(parsed && parsed.length ? parsed : [{ id: Date.now(), title: activeProject ? `${activeProject.name} Note` : "Quick Scratchpad", text: "", theme: "honey" }]);
      } else {
        setStickies([
          {
            id: Date.now(),
            title: activeProject ? `${activeProject.name} Note` : "Quick Scratchpad",
            text: "",
            theme: "honey",
            createdAt: Date.now(),
          },
        ]);
      }
      setActiveIndex(0);
    } catch {
      setStickies(DEFAULT_STICKIES);
    }
  }, [scopeKey]);

  // Auto-save stickies to current project scope
  useEffect(() => {
    try {
      localStorage.setItem(`custodian_stickies_${scopeKey}`, JSON.stringify(stickies));
    } catch {}
  }, [stickies, scopeKey]);

  // Save position
  useEffect(() => {
    if (isPro) {
      try {
        localStorage.setItem("custodian_sticky_position", JSON.stringify(position));
      } catch {}
    }
  }, [position, isPro]);

  // Save minimized state
  useEffect(() => {
    try {
      localStorage.setItem("custodian_sticky_minimized", isMinimized ? "true" : "false");
    } catch {}
  }, [isMinimized]);

  // Safe active sticky
  const currentSticky = stickies[activeIndex] || stickies[0] || DEFAULT_STICKIES[0];
  const activeTheme = STICKY_THEMES.find((t) => t.id === currentSticky.theme) || STICKY_THEMES[0];

  function updateCurrentSticky(updates) {
    setStickies((prev) => {
      const copy = [...prev];
      if (copy[activeIndex]) {
        copy[activeIndex] = { ...copy[activeIndex], ...updates };
      }
      return copy;
    });
  }

  function handleAddSticky() {
    if (!isPro && stickies.length >= 1) {
      if (onOpenUpgrade) onOpenUpgrade();
      return;
    }
    const newSticky = {
      id: Date.now(),
      title: `${activeProject ? activeProject.name : "Note"} #${stickies.length + 1}`,
      text: "",
      theme: STICKY_THEMES[(stickies.length) % STICKY_THEMES.length].id,
      createdAt: Date.now(),
    };
    const updated = [...stickies, newSticky];
    setStickies(updated);
    setActiveIndex(updated.length - 1);
  }

  function handleDeleteCurrentSticky() {
    if (stickies.length <= 1) {
      updateCurrentSticky({ text: "", title: activeProject ? `${activeProject.name} Note` : "Scratchpad" });
      return;
    }
    const updated = stickies.filter((_, idx) => idx !== activeIndex);
    setStickies(updated);
    setActiveIndex(Math.max(0, activeIndex - 1));
  }

  function handleCopy() {
    if (!currentSticky.text) return;
    navigator.clipboard.writeText(currentSticky.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleAppend() {
    if (!currentSticky.text || !onAppendToProject) return;
    onAppendToProject(currentSticky.text);
  }

  // Mouse & Touch Drag Handlers (Available on PRO Tier)
  function startDrag(e) {
    if (!isPro) return; // Free tier is docked
    if (e.target.tagName === "TEXTAREA" || e.target.closest("button")) {
      return;
    }
    isDraggingRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: position.x,
      initialY: position.y,
    };

    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", onDrag, { passive: false });
    window.addEventListener("touchend", stopDrag);
  }

  function onDrag(e) {
    if (!isDraggingRef.current || !isPro) return;
    if (e.cancelable) e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStartRef.current.startX;
    const deltaY = clientY - dragStartRef.current.startY;

    const width = isMinimized ? 220 : 290;
    const height = isMinimized ? 44 : 280;

    const maxX = Math.max(10, window.innerWidth - width - 10);
    const maxY = Math.max(10, window.innerHeight - height - 10);

    const newX = Math.max(10, Math.min(maxX, dragStartRef.current.initialX + deltaX));
    const newY = Math.max(10, Math.min(maxY, dragStartRef.current.initialY + deltaY));

    setPosition({ x: newX, y: newY });
  }

  function stopDrag() {
    isDraggingRef.current = false;
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("touchmove", onDrag);
    window.removeEventListener("touchend", stopDrag);
  }

  if (!isOpen) return null;

  // 1. PET / MINIMIZED COMPANION MODE (PRO ONLY)
  if (isMinimized && isPro) {
    return (
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--panel-main, #1F1B16)",
          border: `1.5px solid ${activeTheme.border}`,
          borderRadius: 24,
          padding: "6px 12px 6px 8px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
          transition: isDraggingRef.current ? "none" : "transform 0.15s ease",
          animation: "floatPulse 3s ease-in-out infinite",
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: activeTheme.border,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#111",
            boxShadow: `0 2px 8px ${activeTheme.border}66`,
            flexShrink: 0,
          }}
          title="Click to expand note"
          onClick={() => setIsMinimized(false)}
        >
          <Pin size={13} style={{ transform: "rotate(45deg)" }} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 140,
            overflow: "hidden",
            cursor: "pointer",
          }}
          onClick={() => setIsMinimized(false)}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-main, #E8E2D9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {activeProject ? `📌 ${activeProject.name}` : (currentSticky.title || "Sticky Note")}
          </span>
          <span style={{ fontSize: 9.5, color: "var(--text-faint, #8A8275)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentSticky.text ? currentSticky.text.slice(0, 24) + "..." : "Empty note"}
          </span>
        </div>

        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim, #AAA)",
            cursor: "pointer",
            padding: 2,
            display: "flex",
            alignItems: "center",
          }}
          onClick={() => setIsMinimized(false)}
          title="Expand Sticky Note"
        >
          <Maximize2 size={13} />
        </button>

        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim, #AAA)",
            cursor: "pointer",
            padding: 2,
            display: "flex",
            alignItems: "center",
          }}
          onClick={onClose}
          title="Close Sticky Note"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  // Position: Pro is freely movable by (position.x, position.y); Free is docked cleanly in bottom-right
  const containerStyle = isPro
    ? {
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999,
        width: 290,
      }
    : {
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 9999,
        width: 290,
      };

  return (
    <div
      ref={containerRef}
      style={{
        ...containerStyle,
        background: "var(--sticky-bg, " + (document.documentElement.getAttribute("data-theme") === "dark" ? activeTheme.darkBg : activeTheme.bg) + ")",
        border: `1.5px solid ${activeTheme.border}`,
        borderRadius: 12,
        boxShadow: `0 14px 38px rgba(0,0,0,0.3), 0 2px 10px ${activeTheme.border}33`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        touchAction: "none",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Draggable (PRO) or Docked (FREE) Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          background: "rgba(0, 0, 0, 0.08)",
          borderBottom: `1px solid ${activeTheme.border}44`,
          cursor: isPro ? "grab" : "default",
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
          {isPro ? (
            <GripHorizontal size={14} style={{ color: activeTheme.border, opacity: 0.8, flexShrink: 0 }} title="Drag anywhere on screen (PRO)" />
          ) : (
            <Pin size={13} style={{ color: activeTheme.border, transform: "rotate(45deg)", flexShrink: 0 }} />
          )}
          <input
            type="text"
            value={currentSticky.title}
            onChange={(e) => updateCurrentSticky({ title: e.target.value })}
            placeholder="Sticky Note..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-main, #111)",
              width: "100%",
              maxWidth: 105,
              fontFamily: "inherit",
              padding: "2px 0",
              cursor: isPro ? "grab" : "text",
            }}
            title="Click to edit note title, or drag to move"
          />
          {isPro && (
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 800,
                color: "#B45309",
                background: "rgba(245,158,11,0.2)",
                padding: "1px 4px",
                borderRadius: 4,
                letterSpacing: "0.04em",
                flexShrink: 0,
              }}
            >
              PRO
            </span>
          )}
        </div>

        {/* Note switcher & action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          {stickies.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 1, marginRight: 2 }}>
              <button
                type="button"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 1, color: "var(--text-dim, #555)" }}
                onClick={() => setActiveIndex((i) => (i > 0 ? i - 1 : stickies.length - 1))}
                title="Previous note"
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-dim, #555)", minWidth: 18, textAlign: "center" }}>
                {activeIndex + 1}/{stickies.length}
              </span>
              <button
                type="button"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 1, color: "var(--text-dim, #555)" }}
                onClick={() => setActiveIndex((i) => (i < stickies.length - 1 ? i + 1 : 0))}
                title="Next note"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Add note: Pro gets unlimited; Free triggers upgrade */}
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-dim, #555)" }}
            onClick={handleAddSticky}
            title={isPro ? "Add new sticky note" : "Upgrade to Pro for multi-stickies"}
          >
            <Plus size={13} />
          </button>

          {/* Color palette (PRO) */}
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-dim, #555)" }}
            onClick={() => {
              if (isPro) {
                setShowColorPicker((prev) => !prev);
              } else if (onOpenUpgrade) {
                onOpenUpgrade();
              }
            }}
            title={isPro ? "Change sticky color" : "Upgrade to Pro to customize sticky colors"}
          >
            <Palette size={13} />
          </button>

          {/* Minimize / Companion Mode (PRO) */}
          {isPro && (
            <button
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-dim, #555)" }}
              onClick={() => setIsMinimized(true)}
              title="Minimize to Pet Companion"
            >
              <Minimize2 size={13} />
            </button>
          )}

          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-dim, #555)" }}
            onClick={onClose}
            title="Close sticky note"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Project Scope Banner (Also Draggable!) */}
      <div
        style={{
          background: "rgba(0,0,0,0.04)",
          borderBottom: `1px solid ${activeTheme.border}33`,
          padding: "4px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10,
          cursor: isPro ? "grab" : "default",
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        title={isPro ? "Click and drag to move sticky note" : undefined}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-dim, #555)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeProject ? <Folder size={11} color="#B08D57" /> : <Pin size={11} color={activeTheme.border} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
            {scopeLabel}
          </span>
        </div>
        <span style={{ fontSize: 9.5, color: "var(--text-faint, #888)", fontWeight: 500 }}>
          {activeProject ? "Project Scoped" : "Vault Scope"}
        </span>
      </div>

      {/* Free Tier Teaser Banner */}
      {!isPro && (
        <div
          style={{
            background: "rgba(180, 83, 9, 0.12)",
            borderBottom: `1px solid ${activeTheme.border}44`,
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 10,
            cursor: "pointer",
          }}
          onClick={onOpenUpgrade}
          title="Upgrade to Pro for Movable Floating Stickies & Companion Pet Mode"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#92400E", fontWeight: 600 }}>
            <Sparkles size={11} color="#D97706" />
            <span>Unlock Movable Floating & Pet Mode</span>
          </div>
          <span style={{ color: "#D97706", fontWeight: 700, fontSize: 10 }}>PRO →</span>
        </div>
      )}

      {/* Optional Color Palette Picker (PRO) */}
      {showColorPicker && isPro && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "6px 10px",
            background: "rgba(0,0,0,0.06)",
            borderBottom: `1px solid ${activeTheme.border}33`,
          }}
        >
          {STICKY_THEMES.map((theme) => (
            <div
              key={theme.id}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: theme.border,
                cursor: "pointer",
                border: currentSticky.theme === theme.id ? "2px solid #fff" : "1px solid rgba(0,0,0,0.2)",
                transform: currentSticky.theme === theme.id ? "scale(1.2)" : "scale(1)",
                boxShadow: currentSticky.theme === theme.id ? `0 0 8px ${theme.border}` : "none",
                transition: "all 0.15s ease",
              }}
              onClick={() => {
                updateCurrentSticky({ theme: theme.id });
                setShowColorPicker(false);
              }}
              title={theme.name}
            />
          ))}
        </div>
      )}

      {/* Note Textarea Area */}
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <textarea
          value={currentSticky.text}
          onChange={(e) => updateCurrentSticky({ text: e.target.value })}
          placeholder={`Type notes for ${scopeLabel}...`}
          style={{
            width: "100%",
            minHeight: 130,
            maxHeight: 250,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--text-main, #111)",
            fontFamily: "Inter, sans-serif",
            resize: "vertical",
            boxSizing: "border-box",
            userSelect: "text",
          }}
        />

        {/* Bottom Toolbar & Shortcuts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 6,
            borderTop: `1px dashed ${activeTheme.border}55`,
            fontSize: 10.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              style={{
                background: "rgba(0,0,0,0.06)",
                border: `1px solid ${activeTheme.border}44`,
                borderRadius: 6,
                padding: "3px 6px",
                fontSize: 10.5,
                color: "var(--text-main, #333)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontWeight: 600,
              }}
              onClick={handleCopy}
              title="Copy note text"
            >
              {copied ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
              {copied ? "Copied" : "Copy"}
            </button>

            {activeProject && onAppendToProject && (
              <button
                type="button"
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: `1px solid ${activeTheme.border}44`,
                  borderRadius: 6,
                  padding: "3px 6px",
                  fontSize: 10.5,
                  color: "var(--text-main, #333)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontWeight: 600,
                }}
                onClick={handleAppend}
                title={`Append note to ${activeProject.name} Specs`}
              >
                <CornerDownRight size={11} /> Specs
              </button>
            )}
          </div>

          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "#E11D48",
              cursor: "pointer",
              padding: "2px 4px",
              opacity: 0.7,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
            onClick={handleDeleteCurrentSticky}
            title="Delete this note"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
