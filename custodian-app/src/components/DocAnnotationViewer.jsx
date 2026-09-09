import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText, Link2, MousePointer, PenTool, Highlighter, MessageSquarePlus,
  Eraser, Undo2, Redo2, StickyNote, PanelRight, ZoomIn, ZoomOut, Maximize2, Minimize2,
  X, Check, Trash2, RotateCcw, Download, RefreshCw, ExternalLink, MessageSquare
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { S, COLORS } from "../styles";

// Configure PDF.js worker to eliminate console warning
if (pdfjsLib && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "4.0.379"}/build/pdf.worker.min.mjs`;
  } catch {}
}

export default function DocAnnotationViewerModal({ previewDoc, details, onUpdateDetails, isTheater, setIsTheater, onClose }) {
  const [showControls, setShowControls] = useState(true);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [activeTool, setActiveTool] = useState("navigate"); // "navigate" | "pen" | "highlighter" | "sticky"
  const [penColor, setPenColor] = useState("#E2B714");
  const [activeStickyId, setActiveStickyId] = useState(null);
  const [zoom, setZoom] = useState(1.2);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [redoStack, setRedoStack] = useState([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [appendFeedback, setAppendFeedback] = useState(false);

  const docKey = String(previewDoc?.id || previewDoc?.name || "default_doc");
  const docAnnotations = (details.docAnnotations || {})[docKey] || { stickyNotes: [], strokes: [], scratchpadText: "" };
  const stickyNotes = docAnnotations.stickyNotes || [];
  const strokes = docAnnotations.strokes || [];
  const scratchpadText = docAnnotations.scratchpadText || "";

  const isPdf = previewDoc.name?.toLowerCase().endsWith(".pdf") || previewDoc.dataUrl?.startsWith("data:application/pdf");
  const isImage = previewDoc.dataUrl?.startsWith("data:image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(previewDoc.name || "");

  function updateAnnotations(newAnnotations) {
    const currentDocAnns = details.docAnnotations || {};
    onUpdateDetails({
      ...details,
      docAnnotations: {
        ...currentDocAnns,
        [docKey]: {
          ...(currentDocAnns[docKey] || {}),
          ...newAnnotations,
        },
      },
    });
  }

  // Close on Escape key
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Load PDF with PDF.js
  useEffect(() => {
    let isMounted = true;
    if (isPdf && previewDoc.dataUrl) {
      setLoadingDoc(true);
      setLoadError(null);

      let loadingTask = null;
      try {
        if (previewDoc.dataUrl.startsWith("data:application/pdf;base64,")) {
          const base64Data = previewDoc.dataUrl.replace(/^data:application\/pdf;base64,/, "");
          const raw = window.atob(base64Data);
          const rawLength = raw.length;
          const array = new Uint8Array(new ArrayBuffer(rawLength));
          for (let i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({ data: array });
        } else {
          loadingTask = pdfjsLib.getDocument(previewDoc.dataUrl);
        }

        loadingTask.promise.then(
          (pdf) => {
            if (isMounted) {
              setPdfDoc(pdf);
              setNumPages(pdf.numPages);
              setLoadingDoc(false);
            }
          },
          (err) => {
            console.error("PDF.js load error:", err);
            if (isMounted) {
              setLoadError("Could not parse PDF pages natively. Fallback viewer available.");
              setLoadingDoc(false);
            }
          }
        );
      } catch (err) {
        console.error("PDF init error:", err);
        if (isMounted) {
          setLoadError(err.message);
          setLoadingDoc(false);
        }
      }
    } else {
      setLoadingDoc(false);
    }
    return () => {
      isMounted = false;
    };
  }, [previewDoc.dataUrl, isPdf]);

  // Global Undo / Redo shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        handleRedo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [strokes, redoStack]);

  function handleUndo() {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const updatedStrokes = strokes.slice(0, -1);
    setRedoStack((prev) => [...prev, last]);
    updateAnnotations({ strokes: updatedStrokes });
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    const updatedRedo = redoStack.slice(0, -1);
    setRedoStack(updatedRedo);
    updateAnnotations({ strokes: [...strokes, last] });
  }

  function clearDrawingCanvas() {
    if (strokes.length === 0) return;
    setRedoStack((prev) => [...prev, ...strokes]);
    updateAnnotations({ strokes: [] });
  }

  function handleAddStickyOnPage(pageNumber, xPercent, yPercent) {
    const newNote = {
      id: Date.now(),
      page: pageNumber,
      x: Math.round(xPercent * 10) / 10,
      y: Math.round(yPercent * 10) / 10,
      text: "",
      color: penColor,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isOpen: true,
    };

    updateAnnotations({ stickyNotes: [...stickyNotes, newNote] });
    setActiveStickyId(newNote.id);
    setActiveTool("navigate");
  }

  function handleUpdateSticky(id, text, color) {
    const updated = stickyNotes.map((n) => (n.id === id ? { ...n, text: text !== undefined ? text : n.text, color: color || n.color } : n));
    updateAnnotations({ stickyNotes: updated });
  }

  function handleDeleteSticky(id) {
    updateAnnotations({ stickyNotes: stickyNotes.filter((n) => n.id !== id) });
    if (activeStickyId === id) setActiveStickyId(null);
  }

  function handleAddStroke(newStroke) {
    setRedoStack([]);
    updateAnnotations({ strokes: [...strokes, newStroke] });
  }

  return (
    <div
      className="custodian-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 9, 8, 0.92)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isTheater ? 0 : "12px 16px",
        boxSizing: "border-box",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        className="custodian-modal-card"
        style={{
          position: "relative",
          width: isTheater ? "100vw" : "96vw",
          height: isTheater ? "100vh" : "94vh",
          background: "#181614",
          border: isTheater ? "none" : `1px solid ${COLORS.line}`,
          borderRadius: isTheater ? 0 : 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Dedicated Always-Accessible Top-Right Close Button */}
        <button
          type="button"
          style={{
            position: "absolute",
            top: 12,
            right: 14,
            zIndex: 150,
            background: "rgba(30, 26, 22, 0.92)",
            border: `1px solid ${COLORS.line}`,
            color: COLORS.textDim,
            borderRadius: "50%",
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
            transition: "all 0.15s ease",
          }}
          onClick={onClose}
          title="Close viewer (Esc)"
          aria-label="Close viewer"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FF6B6B";
            e.currentTarget.style.borderColor = "rgba(235,87,87,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = COLORS.textDim;
            e.currentTarget.style.borderColor = COLORS.line;
          }}
        >
          <X size={16} />
        </button>

        {/* Floating Top Annotation & Tool Bar */}
        <div
          className="custodian-hscroll"
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: showControls ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-120%)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
            opacity: showControls ? 1 : 0,
            zIndex: 100,
            background: "rgba(24, 21, 18, 0.96)",
            backdropFilter: "blur(16px)",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 30,
            padding: "5px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
            maxWidth: "calc(96% - 50px)",
            flexWrap: "nowrap",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
          onMouseEnter={() => setShowControls(true)}
        >
          {/* Doc Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, paddingRight: 4 }}>
            {previewDoc.type === "file" ? <FileText size={14} color="#B08D57" /> : <Link2 size={14} color="#8FA98C" />}
            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
              {previewDoc.name}
            </span>
            {numPages > 0 && (
              <span style={{ fontSize: 10.5, color: COLORS.textFaint, background: COLORS.panelAlt, padding: "2px 6px", borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
                {numPages} {numPages === 1 ? "page" : "pages"}
              </span>
            )}
          </div>

          <div style={{ width: 1, height: 16, background: COLORS.line }} />

          {/* ANNOTATION TOOLS */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              style={{
                ...S.secondaryBtn,
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 14,
                background: activeTool === "navigate" ? "rgba(176,141,87,0.25)" : "transparent",
                borderColor: activeTool === "navigate" ? COLORS.brass : COLORS.line,
                color: activeTool === "navigate" ? COLORS.brass : COLORS.textDim,
              }}
              onClick={() => setActiveTool("navigate")}
              title="Read & Scroll (Standard Mouse Mode)"
            >
              <MousePointer size={12} /> Read
            </button>

            <button
              type="button"
              style={{
                ...S.secondaryBtn,
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 14,
                background: activeTool === "pen" ? "rgba(176,141,87,0.25)" : "transparent",
                borderColor: activeTool === "pen" ? COLORS.brass : COLORS.line,
                color: activeTool === "pen" ? COLORS.brass : COLORS.textDim,
              }}
              onClick={() => setActiveTool("pen")}
              title="Draw & Write on Paper"
            >
              <PenTool size={12} /> Pen
            </button>

            <button
              type="button"
              style={{
                ...S.secondaryBtn,
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 14,
                background: activeTool === "highlighter" ? "rgba(226,183,20,0.25)" : "transparent",
                borderColor: activeTool === "highlighter" ? "#E2B714" : COLORS.line,
                color: activeTool === "highlighter" ? "#E2B714" : COLORS.textDim,
              }}
              onClick={() => setActiveTool("highlighter")}
              title="Highlight text directly on paper"
            >
              <Highlighter size={12} /> Highlight
            </button>

            <button
              type="button"
              style={{
                ...S.secondaryBtn,
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 14,
                background: activeTool === "sticky" ? "rgba(59,130,246,0.25)" : "transparent",
                borderColor: activeTool === "sticky" ? "#3B82F6" : COLORS.line,
                color: activeTool === "sticky" ? "#60A5FA" : COLORS.textDim,
              }}
              onClick={() => setActiveTool("sticky")}
              title="Click on any page to drop a sticky note comment pin"
            >
              <MessageSquarePlus size={12} /> + Sticky Note ({stickyNotes.length})
            </button>

            {/* Colors */}
            {(activeTool === "pen" || activeTool === "highlighter" || activeTool === "sticky") && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 4px" }}>
                {[
                  { color: "#E2B714", name: "Gold" },
                  { color: "#EF4444", name: "Red" },
                  { color: "#10B981", name: "Green" },
                  { color: "#3B82F6", name: "Blue" },
                  { color: "#FFFFFF", name: "White" },
                ].map(({ color: c, name }) => (
                  <button
                    key={c}
                    type="button"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      padding: 0,
                      border: c === "#FFFFFF" ? "1px solid #999" : "none",
                      outline: penColor === c ? `2px solid ${c === "#FFFFFF" ? "#B08D57" : "#FFFFFF"}` : "none",
                      outlineOffset: 2,
                      transform: penColor === c ? "scale(1.15)" : "scale(1)",
                      boxShadow: penColor === c ? "0 0 8px rgba(255,255,255,0.4)" : "none",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => setPenColor(c)}
                    title={`${name} stroke`}
                  />
                ))}
              </div>
            )}

            {/* Undo / Redo */}
            <button
              type="button"
              style={{ ...S.iconBtnGhost, padding: "4px 6px", opacity: strokes.length > 0 ? 1 : 0.4 }}
              onClick={handleUndo}
              disabled={strokes.length === 0}
              title="Undo stroke (Ctrl+Z)"
            >
              <Undo2 size={13} />
            </button>

            <button
              type="button"
              style={{ ...S.iconBtnGhost, padding: "4px 6px", opacity: redoStack.length > 0 ? 1 : 0.4 }}
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo stroke (Ctrl+Y)"
            >
              <Redo2 size={13} />
            </button>

            <button
              type="button"
              style={{ ...S.iconBtnGhost, padding: "4px 6px" }}
              onClick={clearDrawingCanvas}
              title="Clear all drawings on paper"
            >
              <Eraser size={13} />
            </button>
          </div>

          <div style={{ width: 1, height: 16, background: COLORS.line }} />

          {/* ZOOM & CONTROLS */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button
              type="button"
              style={{ ...S.iconBtnGhost, padding: "4px 5px" }}
              onClick={() => setZoom((z) => Math.max(0.75, Math.round((z - 0.15) * 100) / 100))}
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              style={{ background: "none", border: "none", color: COLORS.text, fontSize: 11, fontWeight: 600, minWidth: 38, textAlign: "center", cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}
              onClick={() => setZoom(1.0)}
              title="Click to reset zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              style={{ ...S.iconBtnGhost, padding: "4px 5px" }}
              onClick={() => setZoom((z) => Math.min(2.2, Math.round((z + 0.15) * 100) / 100))}
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              style={{ ...S.secondaryBtn, fontSize: 10, padding: "2px 6px", borderRadius: 10 }}
              onClick={() => setZoom(1.35)}
              title="Fit to comfortable reading width"
            >
              Fit
            </button>
          </div>

          <div style={{ width: 1, height: 16, background: COLORS.line }} />

          {/* SCRATCHPAD & ACTIONS */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button
              type="button"
              style={{
                ...S.secondaryBtn,
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 14,
                background: showScratchpad ? "rgba(176,141,87,0.25)" : "transparent",
                borderColor: showScratchpad ? COLORS.brass : COLORS.line,
                color: showScratchpad ? COLORS.brass : COLORS.textDim,
              }}
              onClick={() => setShowScratchpad((prev) => !prev)}
              title="Toggle Scratchpad Drawer"
            >
              <StickyNote size={12} /> Scratchpad
            </button>

            <button
              type="button"
              style={{ ...S.secondaryBtn, fontSize: 11, padding: "4px 8px", borderRadius: 14 }}
              onClick={() => setIsTheater((prev) => !prev)}
              title={isTheater ? "Exit Fullscreen" : "Fullscreen Reader Mode"}
            >
              {isTheater ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span>{isTheater ? "Exit" : "Fullscreen"}</span>
            </button>

            {previewDoc.type === "file" && (
              <a
                href={previewDoc.dataUrl}
                download={previewDoc.name}
                style={{ ...S.secondaryBtn, textDecoration: "none", fontSize: 11, padding: "4px 8px", borderRadius: 14 }}
              >
                <Download size={12} /> Download
              </a>
            )}

            <button
              type="button"
              style={{
                background: "rgba(235,87,87,0.12)",
                border: "1px solid rgba(235,87,87,0.3)",
                color: "#FF6B6B",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 14,
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontWeight: 600,
              }}
              onClick={onClose}
              title="Close viewer"
            >
              <X size={12} /> Close
            </button>
          </div>
        </div>

        {/* Top hover trigger zone */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 45,
            zIndex: 90,
            cursor: "pointer",
          }}
          onMouseEnter={() => setShowControls(true)}
        />

        {/* MAIN SCROLLABLE DOCUMENT VIEWPORT */}
        <div
          style={{
            flex: 1,
            height: "100%",
            overflowY: "auto",
            overflowX: "auto",
            padding: "50px 20px 80px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#12100E",
          }}
        >
          {loadingDoc ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: COLORS.brass }}>
              <RefreshCw size={28} className="spin" />
              <div style={{ fontSize: 13, fontWeight: 600 }}>Rendering document pages...</div>
            </div>
          ) : previewDoc.type === "link" ? (
            <div style={{ ...S.welcomeState, padding: "80px 20px" }}>
              <Link2 size={48} color="#8FA98C" />
              <div style={{ ...S.welcomeTitle, marginTop: 14, fontSize: 19 }}>{previewDoc.name}</div>
              <div style={{ ...S.welcomeSub, maxWidth: 460, fontSize: 13, marginTop: 6 }}>
                Live specification board (Figma / Notion / Google Docs).
              </div>
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...S.primaryBtn, marginTop: 20, textDecoration: "none", padding: "10px 24px" }}
              >
                <ExternalLink size={15} /> Open Live Spec
              </a>
            </div>
          ) : isPdf && pdfDoc ? (
            /* MULTI-PAGE NATIVE PDF CANVAS PAGES */
            <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <PdfPageItem
                  key={pageNum}
                  pageNum={pageNum}
                  pdfDoc={pdfDoc}
                  scale={zoom}
                  activeTool={activeTool}
                  penColor={penColor}
                  strokes={strokes.filter((s) => (s.page || 1) === pageNum)}
                  onAddStroke={handleAddStroke}
                  stickyNotes={stickyNotes.filter((n) => (n.page || 1) === pageNum)}
                  activeStickyId={activeStickyId}
                  setActiveStickyId={setActiveStickyId}
                  onAddSticky={handleAddStickyOnPage}
                  onUpdateSticky={handleUpdateSticky}
                  onDeleteSticky={handleDeleteSticky}
                />
              ))}
            </div>
          ) : isImage ? (
            /* IMAGE PAPER CONTAINER WITH LOCKED ANNOTATIONS */
            <ImagePageItem
              imgUrl={previewDoc.dataUrl}
              name={previewDoc.name}
              scale={zoom}
              activeTool={activeTool}
              penColor={penColor}
              strokes={strokes.filter((s) => (s.page || 1) === 1)}
              onAddStroke={handleAddStroke}
              stickyNotes={stickyNotes.filter((n) => (n.page || 1) === 1)}
              activeStickyId={activeStickyId}
              setActiveStickyId={setActiveStickyId}
              onAddSticky={handleAddStickyOnPage}
              onUpdateSticky={handleUpdateSticky}
              onDeleteSticky={handleDeleteSticky}
            />
          ) : (
            /* FALLBACK IFRAME VIEWER */
            <div style={{ width: "100%", height: "100%", maxWidth: 960 }}>
              {loadError && (
                <div style={{ background: "rgba(235,87,87,0.1)", border: "1px solid rgba(235,87,87,0.3)", color: "#FF6B6B", padding: "8px 14px", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                  {loadError}
                </div>
              )}
              <iframe
                src={previewDoc.dataUrl}
                title={previewDoc.name}
                style={{ width: "100%", height: "85vh", border: `1px solid ${COLORS.line}`, borderRadius: 8, background: "#fff" }}
              />
            </div>
          )}
        </div>

        {/* SIDE SCRATCHPAD DRAWER */}
        {showScratchpad && (
          <div
            className="custodian-scratchpad-drawer"
            style={{
              width: 320,
              maxWidth: "100%",
              height: "100%",
              background: "rgba(20, 18, 16, 0.98)",
              borderLeft: `1px solid ${COLORS.line}`,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              zIndex: 110,
              boxSizing: "border-box",
              boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.brass, fontWeight: 600, fontSize: 13 }}>
                <StickyNote size={15} /> Document Scratchpad
              </div>
              <button
                type="button"
                style={S.iconBtnGhost}
                onClick={() => setShowScratchpad(false)}
                title="Close scratchpad"
              >
                <X size={13} />
              </button>
            </div>

            <div style={{ fontSize: 11, color: COLORS.textFaint, lineHeight: 1.4 }}>
              Jot down client requirements, API endpoints, or QA notes while reading the document:
            </div>

            <textarea
              style={{
                flex: 1,
                width: "100%",
                background: COLORS.panelAlt,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 8,
                padding: 12,
                color: COLORS.text,
                fontSize: 12.5,
                lineHeight: 1.6,
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              placeholder="• Webhook secret needed&#10;• Rate limit: 100 req/min&#10;• Client target: Friday..."
              value={scratchpadText}
              onChange={(e) => updateAnnotations({ scratchpadText: e.target.value })}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: "#8FA98C" }}>
                <span>✓ Auto-saved to project</span>
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, fontSize: 10.5, padding: "3px 8px" }}
                  onClick={() => {
                    navigator.clipboard.writeText(scratchpadText);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2500);
                  }}
                  disabled={!scratchpadText}
                >
                  {copyFeedback ? "✓ Copied!" : "Copy Notes"}
                </button>
              </div>

              {scratchpadText && (
                <button
                  type="button"
                  style={{
                    ...S.primaryBtnSm,
                    width: "100%",
                    fontSize: 11,
                    padding: "6px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                  onClick={() => {
                    const currentNotes = details.notes || "";
                    const newNotes = currentNotes ? `${currentNotes}\n\n[Scratchpad Note · ${new Date().toLocaleDateString()}]:\n${scratchpadText}` : scratchpadText;
                    onUpdateDetails({ ...details, notes: newNotes });
                    setAppendFeedback(true);
                    setTimeout(() => setAppendFeedback(false), 3000);
                  }}
                >
                  <FileText size={12} /> {appendFeedback ? "✓ Appended to Specs Tab!" : "Append to Project Specs Tab"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Single PDF Page Container with Page-Locked Annotation Canvas and Sticky Notes
 */
function PdfPageItem({
  pageNum,
  pdfDoc,
  scale,
  activeTool,
  penColor,
  strokes,
  onAddStroke,
  stickyNotes,
  activeStickyId,
  setActiveStickyId,
  onAddSticky,
  onUpdateSticky,
  onDeleteSticky,
}) {
  const bgCanvasRef = React.useRef(null);
  const annotCanvasRef = React.useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 800, baseWidth: 600, baseHeight: 800 });
  const [isDrawing, setIsDrawing] = useState(false);
  const activePointsRef = React.useRef([]);

  // Render PDF page to background canvas
  useEffect(() => {
    let renderTask = null;
    let isCancelled = false;

    pdfDoc.getPage(pageNum).then((page) => {
      if (isCancelled) return;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale });

      setDimensions({
        width: viewport.width,
        height: viewport.height,
        baseWidth: unscaledViewport.width,
        baseHeight: unscaledViewport.height,
      });

      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      // High DPI retina rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      renderTask = page.render(renderContext);
    });

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale]);

  // Redraw page-locked annotation strokes
  const repaintPageAnnotations = useCallback(
    (activePoints = null) => {
      const canvas = annotCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const ratio = dimensions.baseWidth ? dimensions.width / dimensions.baseWidth : 1;

      // Draw saved strokes for this page
      strokes.forEach((stroke) => {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color || "#E2B714";
        ctx.lineWidth = (stroke.size || 3) * ratio;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = stroke.isHighlight ? 0.35 : 1;

        ctx.moveTo(stroke.points[0].x * ratio, stroke.points[0].y * ratio);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * ratio, stroke.points[i].y * ratio);
        }
        ctx.stroke();
      });

      // Draw active stroke if drawing on this page
      if (activePoints && activePoints.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = penColor;
        ctx.lineWidth = (activeTool === "highlighter" ? 14 : 3) * ratio;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = activeTool === "highlighter" ? 0.35 : 1;

        ctx.moveTo(activePoints[0].x * ratio, activePoints[0].y * ratio);
        for (let i = 1; i < activePoints.length; i++) {
          ctx.lineTo(activePoints[i].x * ratio, activePoints[i].y * ratio);
        }
        ctx.stroke();
      }
    },
    [strokes, dimensions, penColor, activeTool]
  );

  useEffect(() => {
    repaintPageAnnotations();
  }, [repaintPageAnnotations, dimensions]);

  function handlePageClick(e) {
    if (activeTool !== "sticky") return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(2, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(88, ((e.clientY - rect.top) / rect.height) * 100));
    onAddSticky(pageNum, x, y);
  }

  const ratio = dimensions.baseWidth ? dimensions.width / dimensions.baseWidth : 1;

  return (
    <div
      style={{
        position: "relative",
        width: dimensions.width,
        height: dimensions.height,
        background: "#ffffff",
        borderRadius: 4,
        boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
        overflow: "visible",
        cursor: activeTool === "sticky" || activeTool === "pen" || activeTool === "highlighter" ? "crosshair" : "default",
      }}
      onClick={handlePageClick}
    >
      {/* Background PDF Content Canvas */}
      <canvas
        ref={bgCanvasRef}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          display: "block",
          pointerEvents: "none",
        }}
      />

      {/* Page-Anchored Annotation Canvas (Physically locked to this page) */}
      <canvas
        ref={annotCanvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          position: "absolute",
          inset: 0,
          width: dimensions.width,
          height: dimensions.height,
          pointerEvents: activeTool === "pen" || activeTool === "highlighter" || activeTool === "sticky" ? "auto" : "none",
          touchAction: "none",
          zIndex: 10,
        }}
        onPointerDown={(e) => {
          if (activeTool === "sticky") {
            e.stopPropagation();
            const rect = (annotCanvasRef.current || e.currentTarget).getBoundingClientRect();
            const x = Math.max(2, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(4, Math.min(88, ((e.clientY - rect.top) / rect.height) * 100));
            onAddSticky(pageNum, x, y);
            return;
          }
          if (activeTool !== "pen" && activeTool !== "highlighter") return;
          e.preventDefault();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          setIsDrawing(true);
          const rect = annotCanvasRef.current.getBoundingClientRect();
          const rawX = (e.clientX - rect.left) / ratio;
          const rawY = (e.clientY - rect.top) / ratio;
          activePointsRef.current = [{ x: rawX, y: rawY }, { x: rawX + 0.1, y: rawY + 0.1 }];
          repaintPageAnnotations(activePointsRef.current);
        }}
        onPointerMove={(e) => {
          if (!isDrawing) return;
          e.preventDefault();
          const rect = annotCanvasRef.current.getBoundingClientRect();
          const rawX = (e.clientX - rect.left) / ratio;
          const rawY = (e.clientY - rect.top) / ratio;
          activePointsRef.current.push({ x: rawX, y: rawY });
          repaintPageAnnotations(activePointsRef.current);
        }}
        onPointerUp={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
          if (isDrawing && activePointsRef.current.length > 0) {
            setIsDrawing(false);
            const newStroke = {
              id: Date.now(),
              page: pageNum,
              color: penColor,
              size: activeTool === "highlighter" ? 14 : 3,
              isHighlight: activeTool === "highlighter",
              points: [...activePointsRef.current],
            };
            onAddStroke(newStroke);
            activePointsRef.current = [];
            setTimeout(() => repaintPageAnnotations(), 10);
          } else {
            setIsDrawing(false);
          }
        }}
        onPointerCancel={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
          setIsDrawing(false);
          activePointsRef.current = [];
          repaintPageAnnotations();
        }}
      />

      {/* Page-Locked Sticky Notes (Antigravity Style) */}
      {stickyNotes.map((note, idx) => {
        const isSelected = activeStickyId === note.id || note.isOpen;

        return (
          <div
            key={note.id}
            style={{
              position: "absolute",
              left: `${note.x}%`,
              top: `${note.y}%`,
              zIndex: isSelected ? 35 : 20,
              transform: "translate(-14px, -14px)",
              pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Note Pin */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: note.color || "#E2B714",
                boxShadow: `0 4px 14px ${note.color ? note.color + "77" : "rgba(226,183,20,0.5)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "2px solid #fff",
                color: "#111",
                fontSize: 11,
                fontWeight: 700,
                transition: "transform 0.15s ease",
              }}
              onClick={() => setActiveStickyId(activeStickyId === note.id ? null : note.id)}
              title={`Page ${pageNum} Note #${idx + 1}`}
            >
              <MessageSquare size={13} />
            </div>

            {/* Note Content Popup */}
            {isSelected && (
              <div
                style={{
                  position: "absolute",
                  top: 32,
                  left: -10,
                  width: 240,
                  background: "rgba(22, 20, 18, 0.96)",
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${note.color || COLORS.brass}`,
                  borderRadius: 8,
                  padding: 10,
                  boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: note.color || COLORS.brass }}>
                      📌 Page {pageNum} · Note #{idx + 1}
                    </span>
                    <span style={{ fontSize: 9.5, color: COLORS.textFaint }}>{note.time}</span>
                  </div>
                  <button type="button" style={S.iconBtnGhost} onClick={() => onDeleteSticky(note.id)}>
                    <X size={12} color="#FF6B6B" />
                  </button>
                </div>

                <textarea
                  style={{
                    width: "100%",
                    minHeight: 65,
                    background: COLORS.panelAlt,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 6,
                    padding: 8,
                    color: COLORS.text,
                    fontSize: 12,
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  placeholder="Type note or QA task here..."
                  value={note.text}
                  onChange={(e) => onUpdateSticky(note.id, e.target.value)}
                  autoFocus
                />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["#E2B714", "#EF4444", "#10B981", "#3B82F6"].map((c) => (
                      <div
                        key={c}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: c,
                          cursor: "pointer",
                          border: note.color === c ? "2px solid #fff" : "none",
                        }}
                        onClick={() => onUpdateSticky(note.id, undefined, c)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    style={{ ...S.secondaryBtn, fontSize: 10.5, padding: "2px 8px", borderRadius: 10 }}
                    onClick={() => setActiveStickyId(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Page Number Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: -22,
          right: 0,
          fontSize: 10.5,
          color: COLORS.textFaint,
          pointerEvents: "none",
        }}
      >
        Page {pageNum}
      </div>
    </div>
  );
}

/**
 * Image Container with Page-Locked Annotation Canvas and Sticky Notes
 */
function ImagePageItem({
  imgUrl,
  name,
  scale,
  activeTool,
  penColor,
  strokes,
  onAddStroke,
  stickyNotes,
  activeStickyId,
  setActiveStickyId,
  onAddSticky,
  onUpdateSticky,
  onDeleteSticky,
}) {
  const annotCanvasRef = React.useRef(null);
  const [naturalSize, setNaturalSize] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const activePointsRef = React.useRef([]);

  const width = naturalSize.width * scale;
  const height = naturalSize.height * scale;
  const ratio = scale;

  const repaintAnnotations = useCallback(
    (activePoints = null) => {
      const canvas = annotCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      strokes.forEach((stroke) => {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color || "#E2B714";
        ctx.lineWidth = (stroke.size || 3) * ratio;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = stroke.isHighlight ? 0.35 : 1;

        ctx.moveTo(stroke.points[0].x * ratio, stroke.points[0].y * ratio);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * ratio, stroke.points[i].y * ratio);
        }
        ctx.stroke();
      });

      if (activePoints && activePoints.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = penColor;
        ctx.lineWidth = (activeTool === "highlighter" ? 14 : 3) * ratio;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = activeTool === "highlighter" ? 0.35 : 1;

        ctx.moveTo(activePoints[0].x * ratio, activePoints[0].y * ratio);
        for (let i = 1; i < activePoints.length; i++) {
          ctx.lineTo(activePoints[i].x * ratio, activePoints[i].y * ratio);
        }
        ctx.stroke();
      }
    },
    [strokes, ratio, penColor, activeTool]
  );

  useEffect(() => {
    repaintAnnotations();
  }, [repaintAnnotations, width, height]);

  function handleImageClick(e) {
    if (activeTool !== "sticky") return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(2, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(88, ((e.clientY - rect.top) / rect.height) * 100));
    onAddSticky(1, x, y);
  }

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        background: "#111",
        borderRadius: 6,
        boxShadow: "0 8px 30px rgba(0,0,0,0.7)",
        cursor: activeTool === "sticky" || activeTool === "pen" || activeTool === "highlighter" ? "crosshair" : "default",
      }}
      onClick={handleImageClick}
    >
      <img
        src={imgUrl}
        alt={name}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        onLoad={(e) => {
          setNaturalSize({
            width: Math.min(1000, e.target.naturalWidth || 800),
            height: Math.min(1200, e.target.naturalHeight || 600),
          });
        }}
      />

      {/* Locked Annotation Layer */}
      <canvas
        ref={annotCanvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          width,
          height,
          pointerEvents: activeTool === "pen" || activeTool === "highlighter" || activeTool === "sticky" ? "auto" : "none",
          touchAction: "none",
          zIndex: 10,
        }}
        onPointerDown={(e) => {
          if (activeTool === "sticky") {
            e.stopPropagation();
            const rect = (annotCanvasRef.current || e.currentTarget).getBoundingClientRect();
            const x = Math.max(2, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(4, Math.min(88, ((e.clientY - rect.top) / rect.height) * 100));
            onAddSticky(1, x, y);
            return;
          }
          if (activeTool !== "pen" && activeTool !== "highlighter") return;
          e.preventDefault();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          setIsDrawing(true);
          const rect = annotCanvasRef.current.getBoundingClientRect();
          const rawX = (e.clientX - rect.left) / ratio;
          const rawY = (e.clientY - rect.top) / ratio;
          activePointsRef.current = [{ x: rawX, y: rawY }, { x: rawX + 0.1, y: rawY + 0.1 }];
          repaintAnnotations(activePointsRef.current);
        }}
        onPointerMove={(e) => {
          if (!isDrawing) return;
          e.preventDefault();
          const rect = annotCanvasRef.current.getBoundingClientRect();
          const rawX = (e.clientX - rect.left) / ratio;
          const rawY = (e.clientY - rect.top) / ratio;
          activePointsRef.current.push({ x: rawX, y: rawY });
          repaintAnnotations(activePointsRef.current);
        }}
        onPointerUp={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
          if (isDrawing && activePointsRef.current.length > 0) {
            setIsDrawing(false);
            const newStroke = {
              id: Date.now(),
              page: 1,
              color: penColor,
              size: activeTool === "highlighter" ? 14 : 3,
              isHighlight: activeTool === "highlighter",
              points: [...activePointsRef.current],
            };
            onAddStroke(newStroke);
            activePointsRef.current = [];
            setTimeout(() => repaintAnnotations(), 10);
          } else {
            setIsDrawing(false);
          }
        }}
        onPointerCancel={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
          setIsDrawing(false);
          activePointsRef.current = [];
          repaintAnnotations();
        }}
      />

      {/* Sticky Notes */}
      {stickyNotes.map((note, idx) => {
        const isSelected = activeStickyId === note.id || note.isOpen;

        return (
          <div
            key={note.id}
            style={{
              position: "absolute",
              left: `${note.x}%`,
              top: `${note.y}%`,
              zIndex: isSelected ? 35 : 20,
              transform: "translate(-14px, -14px)",
              pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: note.color || "#E2B714",
                boxShadow: `0 4px 14px ${note.color ? note.color + "77" : "rgba(226,183,20,0.5)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "2px solid #fff",
                color: "#111",
                fontSize: 11,
                fontWeight: 700,
              }}
              onClick={() => setActiveStickyId(activeStickyId === note.id ? null : note.id)}
            >
              <MessageSquare size={13} />
            </div>

            {isSelected && (
              <div
                style={{
                  position: "absolute",
                  top: 32,
                  left: -10,
                  width: 240,
                  background: "rgba(22, 20, 18, 0.96)",
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${note.color || COLORS.brass}`,
                  borderRadius: 8,
                  padding: 10,
                  boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: note.color || COLORS.brass }}>
                    📌 Note #{idx + 1}
                  </span>
                  <button type="button" style={S.iconBtnGhost} onClick={() => onDeleteSticky(note.id)}>
                    <X size={12} color="#FF6B6B" />
                  </button>
                </div>
                <textarea
                  style={{
                    width: "100%",
                    minHeight: 65,
                    background: COLORS.panelAlt,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 6,
                    padding: 8,
                    color: COLORS.text,
                    fontSize: 12,
                    outline: "none",
                  }}
                  value={note.text}
                  onChange={(e) => onUpdateSticky(note.id, e.target.value)}
                  autoFocus
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["#E2B714", "#EF4444", "#10B981", "#3B82F6"].map((c) => (
                      <div
                        key={c}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: c,
                          cursor: "pointer",
                          border: note.color === c ? "2px solid #fff" : "none",
                        }}
                        onClick={() => onUpdateSticky(note.id, undefined, c)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    style={{ ...S.secondaryBtn, fontSize: 10.5, padding: "2px 8px", borderRadius: 10 }}
                    onClick={() => setActiveStickyId(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}