import React, { useState, useEffect, useRef } from "react";
import {
  Pin, X, Plus, Trash2, Copy, Check, Minimize2, Maximize2,
  GripHorizontal, Palette, Sparkles, ChevronLeft, ChevronRight,
  CornerDownRight, Folder, Anchor
} from "lucide-react";
import { COLORS } from "../styles";

export const STICKY_THEMES = [
  {
    id: "cyan",
    name: "Cyber Cyan",
    accent: "#00D2FF",
    glow: "rgba(0, 210, 255, 0.28)",
    darkBg: "rgba(11, 16, 26, 0.95)",
    lightBg: "rgba(240, 249, 255, 0.97)",
    border: "rgba(0, 210, 255, 0.45)",
    text: "#F8FAFC",
    lightText: "#0C4A6E",
    badgeBg: "rgba(0, 210, 255, 0.16)",
  },
  {
    id: "honey",
    name: "Amber Gold",
    accent: "#F59E0B",
    glow: "rgba(245, 158, 11, 0.28)",
    darkBg: "rgba(22, 18, 12, 0.95)",
    lightBg: "rgba(254, 252, 232, 0.97)",
    border: "rgba(245, 158, 11, 0.45)",
    text: "#FEF3C7",
    lightText: "#78350F",
    badgeBg: "rgba(245, 158, 11, 0.16)",
  },
  {
    id: "emerald",
    name: "Mint Matrix",
    accent: "#10B981",
    glow: "rgba(16, 185, 129, 0.28)",
    darkBg: "rgba(10, 22, 17, 0.95)",
    lightBg: "rgba(236, 253, 245, 0.97)",
    border: "rgba(16, 185, 129, 0.45)",
    text: "#ECFDF5",
    lightText: "#064E3B",
    badgeBg: "rgba(16, 185, 129, 0.16)",
  },
  {
    id: "coral",
    name: "Neon Rose",
    accent: "#F43F5E",
    glow: "rgba(244, 63, 94, 0.28)",
    darkBg: "rgba(24, 11, 16, 0.95)",
    lightBg: "rgba(255, 241, 242, 0.97)",
    border: "rgba(244, 63, 94, 0.45)",
    text: "#FFF1F2",
    lightText: "#881337",
    badgeBg: "rgba(244, 63, 94, 0.16)",
  },
  {
    id: "lavender",
    name: "Electric Violet",
    accent: "#8B5CF6",
    glow: "rgba(139, 92, 246, 0.28)",
    darkBg: "rgba(18, 13, 28, 0.95)",
    lightBg: "rgba(245, 243, 255, 0.97)",
    border: "rgba(139, 92, 246, 0.45)",
    text: "#F5F3FF",
    lightText: "#581C87",
    badgeBg: "rgba(139, 92, 246, 0.16)",
  },
];

const DEFAULT_STICKIES = [
  {
    id: 1,
    title: "Quick Scratchpad",
    text: "",
    theme: "cyan",
    createdAt: Date.now(),
  },
];

export default function FloatingStickyNotes({
  isOpen,
  onClose,
  currentPlan = "free",
  theme,
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

  // Calculate safe coordinates that never cover the sidebar (sidebar width 270px)
  const getSafePosition = (x, y) => {
    const isDesktop = typeof window !== "undefined" && window.innerWidth > 768;
    const minX = isDesktop ? 285 : 12;
    const maxX = typeof window !== "undefined" ? Math.max(minX, window.innerWidth - 325) : 800;
    const maxY = typeof window !== "undefined" ? Math.max(70, window.innerHeight - 320) : 500;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(70, Math.min(maxY, y)),
    };
  };

  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem("custodian_sticky_position");
      if (saved) {
        const parsed = JSON.parse(saved);
        return getSafePosition(parsed.x, parsed.y);
      }
      const defaultX = typeof window !== "undefined" ? Math.max(285, window.innerWidth - 330) : 600;
      return getSafePosition(defaultX, 86);
    } catch {
      return { x: 300, y: 86 };
    }
  });

  const [copied, setCopied] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const containerRef = useRef(null);

  // Detect current theme (defaults to dark cyber-void)
  const isDark = theme ? theme !== "light" : (typeof document === "undefined" || document.documentElement.getAttribute("data-theme") !== "light");

  // Switch stickies whenever project scope changes (scoped per project!)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`custodian_stickies_${scopeKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStickies(parsed && parsed.length ? parsed : [{ id: Date.now(), title: activeProject ? `${activeProject.name} Note` : "Quick Scratchpad", text: "", theme: "cyan" }]);
      } else {
        setStickies([
          {
            id: Date.now(),
            title: activeProject ? `${activeProject.name} Note` : "Quick Scratchpad",
            text: "",
            theme: "cyan",
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

  // Save position with boundary verification
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

  // Safe active sticky & theme (with backward-compatible mappings)
  const currentSticky = stickies[activeIndex] || stickies[0] || DEFAULT_STICKIES[0];
  const normalizedTheme = (currentSticky.theme === "yellow" || currentSticky.theme === "amber") ? "honey" : currentSticky.theme;
  const activeTheme = STICKY_THEMES.find((t) => t.id === normalizedTheme) || STICKY_THEMES[0];

  const currentBg = isDark ? activeTheme.darkBg : activeTheme.lightBg;
  const currentTextColor = isDark ? activeTheme.text : activeTheme.lightText;

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
      if (onClose) onClose();
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

  // Snap to safe bottom-right corner
  function handleSnapToCorner() {
    if (typeof window === "undefined") return;
    const cornerPos = getSafePosition(window.innerWidth - 325, window.innerHeight - 340);
    setPosition(cornerPos);
  }

  // Mouse & Touch Drag Handlers (Available on PRO Tier)
  function startDrag(e) {
    if (!isPro) return;
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT" || e.target.closest("button")) {
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

    const width = isMinimized ? 220 : 305;
    const height = isMinimized ? 44 : 290;

    const isDesktop = window.innerWidth > 768;
    const minX = isDesktop ? 285 : 10;
    const maxX = Math.max(minX, window.innerWidth - width - 12);
    const maxY = Math.max(10, window.innerHeight - height - 12);

    const targetX = dragStartRef.current.initialX + deltaX;
    const targetY = dragStartRef.current.initialY + deltaY;

    const newX = Math.max(minX, Math.min(maxX, targetX));
    const newY = Math.max(64, Math.min(maxY, targetY));

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
          background: currentBg,
          border: `1.5px solid ${activeTheme.border}`,
          borderRadius: 24,
          padding: "6px 12px 6px 8px",
          boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 16px ${activeTheme.glow}`,
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          transition: isDraggingRef.current ? "none" : "transform 0.15s ease",
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: activeTheme.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#06080D",
            boxShadow: `0 0 10px ${activeTheme.accent}`,
            flexShrink: 0,
            cursor: "pointer",
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
          <span style={{ fontSize: 11, fontWeight: 700, color: currentTextColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {activeProject ? `📌 ${activeProject.name}` : (currentSticky.title || "Sticky Note")}
          </span>
          <span style={{ fontSize: 9.5, color: isDark ? "#94A3B8" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentSticky.text ? currentSticky.text.slice(0, 24) + "..." : "Empty note"}
          </span>
        </div>

        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: isDark ? "#94A3B8" : "#64748B",
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
            color: isDark ? "#94A3B8" : "#64748B",
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

  // Position: Pro is freely movable by safe (position.x, position.y); Free is docked cleanly in bottom-right
  const containerStyle = isPro
    ? {
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999,
        width: 305,
      }
    : {
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 9999,
        width: 305,
      };

  return (
    <div
      ref={containerRef}
      style={{
        ...containerStyle,
        background: currentBg,
        border: `1.5px solid ${activeTheme.border}`,
        borderRadius: 14,
        boxShadow: `0 16px 42px rgba(0,0,0,0.6), 0 0 20px ${activeTheme.glow}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        touchAction: "none",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {/* Draggable (PRO) or Docked (FREE) Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
          borderBottom: `1px solid ${activeTheme.border}44`,
          cursor: isPro ? "grab" : "default",
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1, marginRight: 6 }}>
          {isPro ? (
            <GripHorizontal size={14} style={{ color: activeTheme.accent, opacity: 0.85, flexShrink: 0 }} title="Drag anywhere on screen (PRO)" />
          ) : (
            <Pin size={13} style={{ color: activeTheme.accent, transform: "rotate(45deg)", flexShrink: 0 }} />
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
              fontSize: 12.5,
              fontWeight: 700,
              color: currentTextColor,
              flex: 1,
              minWidth: 60,
              fontFamily: "inherit",
              padding: "2px 4px",
              borderRadius: 4,
              cursor: isPro ? "text" : "text",
              transition: "background 0.15s ease",
            }}
            title="Click to edit note title, or drag the header to move"
          />
          {isPro && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: activeTheme.accent,
                background: activeTheme.badgeBg,
                border: `1px solid ${activeTheme.accent}44`,
                padding: "1px 5px",
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
            <div style={{ display: "flex", alignItems: "center", gap: 1, marginRight: 3 }}>
              <button
                type="button"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 1, color: isDark ? "#94A3B8" : "#64748B" }}
                onClick={() => setActiveIndex((i) => (i > 0 ? i - 1 : stickies.length - 1))}
                title="Previous note"
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: isDark ? "#94A3B8" : "#64748B", minWidth: 18, textAlign: "center" }}>
                {activeIndex + 1}/{stickies.length}
              </span>
              <button
                type="button"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 1, color: isDark ? "#94A3B8" : "#64748B" }}
                onClick={() => setActiveIndex((i) => (i < stickies.length - 1 ? i + 1 : 0))}
                title="Next note"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Add note */}
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: isDark ? "#94A3B8" : "#64748B" }}
            onClick={handleAddSticky}
            title={isPro ? "Add new sticky note" : "Upgrade to Pro for multi-stickies"}
          >
            <Plus size={13} />
          </button>

          {/* Color palette (PRO) */}
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: isDark ? "#94A3B8" : "#64748B" }}
            onClick={() => {
              if (isPro) {
                setShowColorPicker((prev) => !prev);
              } else if (onOpenUpgrade) {
                onOpenUpgrade();
              }
            }}
            title={isPro ? "Change sticky cyber accent color" : "Upgrade to Pro to customize sticky colors"}
          >
            <Palette size={13} />
          </button>

          {/* Snap / Dock to corner button */}
          {isPro && (
            <button
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: isDark ? "#94A3B8" : "#64748B" }}
              onClick={handleSnapToCorner}
              title="Snap to bottom-right corner out of the way"
            >
              <Anchor size={12} />
            </button>
          )}

          {/* Minimize / Companion Mode (PRO) */}
          {isPro && (
            <button
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: isDark ? "#94A3B8" : "#64748B" }}
              onClick={() => setIsMinimized(true)}
              title="Minimize to Pet Companion"
            >
              <Minimize2 size={13} />
            </button>
          )}

          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: isDark ? "#94A3B8" : "#64748B" }}
            onClick={onClose}
            title="Close sticky note"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Project Scope Banner */}
      <div
        style={{
          background: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
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
        title={isPro ? "Click and drag to move scratchpad" : undefined}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: isDark ? "#94A3B8" : "#64748B", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeProject ? <Folder size={11} color={activeTheme.accent} /> : <Pin size={11} color={activeTheme.accent} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
            {scopeLabel}
          </span>
        </div>
        <span style={{ fontSize: 9.5, color: isDark ? "#64748B" : "#94A3B8", fontWeight: 500 }}>
          {activeProject ? "Project Scoped" : "Vault Scope"}
        </span>
      </div>

      {/* Free Tier Teaser Banner */}
      {!isPro && (
        <div
          style={{
            background: "rgba(0, 210, 255, 0.08)",
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
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: COLORS.cyan, fontWeight: 600 }}>
            <Sparkles size={11} color={COLORS.cyan} />
            <span>Unlock Movable Floating & Pet Mode</span>
          </div>
          <span style={{ color: COLORS.cyan, fontWeight: 700, fontSize: 10 }}>PRO →</span>
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
            background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)",
            borderBottom: `1px solid ${activeTheme.border}33`,
          }}
        >
          {STICKY_THEMES.map((theme) => (
            <div
              key={theme.id}
              style={{
                width: 17,
                height: 17,
                borderRadius: "50%",
                background: theme.accent,
                cursor: "pointer",
                border: currentSticky.theme === theme.id ? "2px solid #FFFFFF" : "1px solid rgba(255,255,255,0.2)",
                transform: currentSticky.theme === theme.id ? "scale(1.2)" : "scale(1)",
                boxShadow: currentSticky.theme === theme.id ? `0 0 10px ${theme.accent}` : "none",
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
            color: currentTextColor,
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
            borderTop: `1px dashed ${activeTheme.border}44`,
            fontSize: 10.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button
              type="button"
              style={{
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                border: `1px solid ${activeTheme.border}44`,
                borderRadius: 6,
                padding: "3px 7px",
                fontSize: 10.5,
                color: currentTextColor,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontWeight: 600,
              }}
              onClick={handleCopy}
              title="Copy note text"
            >
              {copied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
              {copied ? "Copied" : "Copy"}
            </button>

            {activeProject && onAppendToProject && (
              <button
                type="button"
                style={{
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  border: `1px solid ${activeTheme.border}44`,
                  borderRadius: 6,
                  padding: "3px 7px",
                  fontSize: 10.5,
                  color: currentTextColor,
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
              color: "#F43F5E",
              cursor: "pointer",
              padding: "2px 4px",
              opacity: 0.8,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
            onClick={handleDeleteCurrentSticky}
            title="Delete this note"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
