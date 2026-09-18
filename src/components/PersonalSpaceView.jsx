import {
  ShieldCheck, Plus, Search, Eye, EyeOff, Copy, Check, ExternalLink,
  Edit3, Trash2, Mail, Smartphone, FileText, CreditCard, KeyRound, Layers,
  Lock, ArrowLeft, Clock
} from "lucide-react";
import { S, COLORS } from "../styles";
import { classifyPersonalSecret, PERSONAL_CATEGORIES } from "../utils/personalSpace";
import { formatDateUSA } from "../utils/dateFormatter";

const CATEGORY_ICONS = {
  all: Layers,
  logins: Mail,
  pins: Smartphone,
  notes: FileText,
  cards: CreditCard,
};

function getCategoryEmptyMeta(catId) {
  switch (catId) {
    case "pins":
      return {
        icon: Smartphone,
        title: "No Apps & PINs Yet",
        desc: "Save your mobile banking PINs, UPI passcodes, device locks, or home Wi-Fi keys for instant, private access.",
        addLabel: "Add an App PIN / Wi-Fi",
        preset: "pin",
      };
    case "notes":
      return {
        icon: FileText,
        title: "No Notes & Seed Words Yet",
        desc: "Securely store crypto recovery seed phrases (12/24 words), private backup keys, or sensitive personal notes.",
        addLabel: "Add a Note / Seed Words",
        preset: "note",
      };
    case "cards":
      return {
        icon: CreditCard,
        title: "No Cards & Identity Saved Yet",
        desc: "Keep credit cards, debit card ATM PINs, bank accounts, and CVVs encrypted with zero-knowledge security.",
        addLabel: "Add a Card / Bank Item",
        preset: "card",
      };
    case "logins":
      return {
        icon: Mail,
        title: "No Logins & Accounts Saved Yet",
        desc: "Store personal email passwords, streaming accounts (Netflix, Spotify), and social logins.",
        addLabel: "Add an Account Login",
        preset: "login",
      };
    default:
      return {
        icon: Lock,
        title: "Your Personal Vault is Empty",
        desc: "Store your personal Gmail logins, Netflix passwords, mobile banking PINs, Wi-Fi passcodes, or 12/24-word recovery seeds completely private and encrypted.",
        addLabel: "Add Your First Secret",
        preset: "login",
      };
  }
}

export default function PersonalSpaceView({
  personalClient,
  personalProject,
  creds = [],
  onAddCred,
  onEditCred,
  onDeleteCred,
  onCopy,
  copiedId,
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealedIds, setRevealedIds] = useState(new Set());

  const toggleReveal = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Categorize and filter credentials
  const categorizedCreds = useMemo(() => {
    return (creds || []).map((c) => ({
      ...c,
      category: classifyPersonalSecret(c),
    }));
  }, [creds]);

  const countsByCategory = useMemo(() => {
    const counts = { all: categorizedCreds.length, logins: 0, pins: 0, notes: 0, cards: 0 };
    categorizedCreds.forEach((c) => {
      if (counts[c.category] !== undefined) {
        counts[c.category]++;
      }
    });
    return counts;
  }, [categorizedCreds]);

  const filteredCreds = useMemo(() => {
    return categorizedCreds.filter((c) => {
      const matchesCategory = activeCategory === "all" || c.category === activeCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.label || "").toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q) ||
        (c.url || "").toLowerCase().includes(q) ||
        (c.notes || "").toLowerCase().includes(q)
      );
    });
  }, [categorizedCreds, activeCategory, searchQuery]);

  const emptyMeta = getCategoryEmptyMeta(activeCategory);
  const EmptyIcon = emptyMeta.icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 1. Header Banner */}
      <div style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        boxShadow: "var(--card-shadow, 0 4px 20px rgba(0,0,0,0.06))",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 260 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, rgba(176,141,87,0.2) 0%, rgba(143,169,140,0.15) 100%)",
            border: `1.5px solid ${COLORS.brassDim}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(176,141,87,0.15)",
          }}>
            <ShieldCheck size={22} color={COLORS.brass} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16.5, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em" }}>
                Personal Space
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: COLORS.textFaint,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                🔒 Client-Side AES-256-GCM
              </span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 3 }}>
              Your private personal vault for email passwords, app PINs, Wi-Fi codes, cards, and crypto seed phrases.
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            id="btn-add-personal-secret"
            style={{
              background: "linear-gradient(135deg, #B08D57 0%, #8C6F3E 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 12.5,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(176,141,87,0.25)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => onAddCred(emptyMeta.preset ? { secretType: emptyMeta.preset } : { secretType: "login" })}
          >
            <Plus size={14} />
            <span>Add Personal Secret</span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter Tabs & Search Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PERSONAL_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = countsByCategory[cat.id] || 0;
            const CatIcon = CATEGORY_ICONS[cat.id] || Layers;
            return (
              <button
                key={cat.id}
                type="button"
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 8,
                  background: isActive ? "var(--highlight-bg, rgba(176,141,87,0.15))" : COLORS.panel,
                  border: `1px solid ${isActive ? COLORS.brass : COLORS.line}`,
                  color: isActive ? COLORS.brass : COLORS.textDim,
                  fontWeight: isActive ? 600 : 400,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={() => setActiveCategory(cat.id)}
              >
                <CatIcon size={13} color={isActive ? COLORS.brass : COLORS.textFaint} />
                <span>{cat.label}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: isActive ? COLORS.brass : "rgba(128,128,128,0.12)",
                  color: isActive ? "#FFFFFF" : COLORS.textFaint,
                  lineHeight: 1.3,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", minWidth: 220 }}>
          <input
            style={{
              ...S.input,
              padding: "7px 10px 7px 32px",
              fontSize: 12,
              borderRadius: 8,
              width: "100%",
              boxSizing: "border-box",
            }}
            type="text"
            placeholder="Search personal secrets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={14} color={COLORS.textFaint} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        </div>
      </div>

      {/* 3. Empty State or Credential Cards Grid */}
      {filteredCreds.length === 0 ? (
        <div style={{
          maxWidth: 480,
          margin: "40px auto",
          padding: "36px 28px",
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 16,
          textAlign: "center",
          boxShadow: "var(--card-shadow, 0 6px 24px rgba(0,0,0,0.06))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "rgba(176,141,87,0.12)",
            border: `1px solid ${COLORS.brassDim}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}>
            <EmptyIcon size={24} color={COLORS.brass} />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, margin: "0 0 6px 0" }}>
            {searchQuery ? "No matching items found" : emptyMeta.title}
          </h3>

          <p style={{ fontSize: 12.5, color: COLORS.textDim, margin: "0 0 20px 0", lineHeight: 1.5, maxWidth: 380 }}>
            {searchQuery
              ? `No personal items matched "${searchQuery}". Check the spelling or try another keyword.`
              : emptyMeta.desc}
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              style={{
                background: "linear-gradient(135deg, #B08D57 0%, #8C6F3E 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(176,141,87,0.25)",
              }}
              onClick={() => {
                if (searchQuery) {
                  setSearchQuery("");
                } else {
                  onAddCred({ secretType: emptyMeta.preset });
                }
              }}
            >
              <Plus size={14} />
              <span>{searchQuery ? "Clear Search Filter" : emptyMeta.addLabel}</span>
            </button>

            {activeCategory !== "all" && countsByCategory.all > 0 && (
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: COLORS.brass,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  fontWeight: 500,
                }}
                onClick={() => setActiveCategory("all")}
              >
                <ArrowLeft size={12} />
                <span>View All Items ({countsByCategory.all})</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {filteredCreds.map((cred) => {
            const isRevealed = revealedIds.has(cred.id);
            const isNoteOrWords = cred.category === "notes" || cred.secretType === "note";
            const isPin = cred.category === "pins" || cred.secretType === "pin";
            const isCard = cred.category === "cards" || cred.secretType === "card";

            // If seed words (e.g. 12 or 24 space-separated words)
            const wordsList = isNoteOrWords && cred.password && cred.password.trim().split(/\s+/);
            const isSeedPhrase = wordsList && (wordsList.length === 12 || wordsList.length === 24);

            return (
              <div
                key={cred.id}
                style={{
                  background: COLORS.panel,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 12,
                  padding: 15,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: "var(--card-shadow, 0 2px 10px rgba(0,0,0,0.04))",
                }}
              >
                {/* Card Head */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(176,141,87,0.12)",
                      border: `1px solid ${COLORS.brassDim}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isPin ? (
                        <Smartphone size={16} color={COLORS.brass} />
                      ) : isNoteOrWords ? (
                        <FileText size={16} color={COLORS.brass} />
                      ) : isCard ? (
                        <CreditCard size={16} color={COLORS.brass} />
                      ) : (
                        <Mail size={16} color={COLORS.brass} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cred.label || "Untitled Secret"}
                      </div>
                      {cred.url && (
                        <a
                          href={cred.url.startsWith("http") ? cred.url : `https://${cred.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11, color: COLORS.brass, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none", marginTop: 1 }}
                        >
                          <ExternalLink size={10} /> {cred.url.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      style={{ ...S.iconBtnGhost, padding: 5, borderRadius: 6 }}
                      onClick={() => onEditCred(cred)}
                      title="Edit Item"
                    >
                      <Edit3 size={13} color={COLORS.textFaint} />
                    </button>
                    <button
                      type="button"
                      style={{ ...S.iconBtnGhost, padding: 5, borderRadius: 6 }}
                      onClick={() => onDeleteCred(cred.id)}
                      title="Delete Item"
                    >
                      <Trash2 size={13} color="#E07A6D" />
                    </button>
                  </div>
                </div>

                {/* Username / Account Field (if present) */}
                {cred.username && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: COLORS.panelAlt,
                    padding: "7px 10px",
                    borderRadius: 7,
                    border: `1px solid ${COLORS.line}`,
                  }}>
                    <span style={{ fontSize: 12, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cred.username}
                    </span>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", cursor: "pointer", color: copiedId === `${cred.id}-user` ? "#16A34A" : COLORS.textFaint, padding: 2 }}
                      onClick={() => onCopy(cred.username, `${cred.id}-user`)}
                      title="Copy Username / Identifier"
                    >
                      {copiedId === `${cred.id}-user` ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                )}

                {/* Password / PIN / Value Field */}
                {cred.password && (
                  <div>
                    {isSeedPhrase && isRevealed ? (
                      <div style={{
                        background: COLORS.panelAlt,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 8,
                        padding: 10,
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 6,
                      }}>
                        {wordsList.map((word, idx) => (
                          <div key={idx} style={{ fontSize: 11, color: COLORS.text, background: "rgba(128,128,128,0.06)", padding: "3px 6px", borderRadius: 4 }}>
                            <span style={{ color: COLORS.brass, fontWeight: 700, marginRight: 4 }}>{idx + 1}.</span>
                            {word}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: COLORS.panelAlt,
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: `1px solid ${COLORS.line}`,
                      }}>
                        <span style={{
                          fontSize: 12,
                          fontFamily: isRevealed && !isNoteOrWords ? "IBM Plex Mono, monospace" : "inherit",
                          color: COLORS.text,
                          letterSpacing: !isRevealed ? "0.15em" : "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "75%",
                        }}>
                          {isRevealed ? cred.password : "••••••••••••"}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint, padding: 2 }}
                            onClick={() => toggleReveal(cred.id)}
                            title={isRevealed ? "Hide Value" : "Reveal Value"}
                          >
                            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            type="button"
                            style={{ background: "none", border: "none", cursor: "pointer", color: copiedId === `${cred.id}-pass` ? "#16A34A" : COLORS.textFaint, padding: 2 }}
                            onClick={() => onCopy(cred.password, `${cred.id}-pass`)}
                            title="Copy Password / PIN"
                          >
                            {copiedId === `${cred.id}-pass` ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes (if present) */}
                {cred.notes && !isSeedPhrase && (
                  <div style={{ fontSize: 11, color: COLORS.textFaint, background: "rgba(128,128,128,0.05)", padding: "5px 8px", borderRadius: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {cred.notes}
                  </div>
                )}

                {/* Secret Timeline (USA Format: MM/DD/YYYY) */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: COLORS.textFaint, marginTop: 4, paddingTop: 4, borderTop: `1px dashed ${COLORS.line}` }}>
                  <Clock size={10} color={COLORS.brass} />
                  <span>
                    {cred.updatedAt ? `Updated: ${formatDateUSA(cred.updatedAt)} (MM/DD/YYYY)` : cred.createdAt ? `Created: ${formatDateUSA(cred.createdAt)} (MM/DD/YYYY)` : "Format: MM/DD/YYYY"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
