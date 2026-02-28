const { useState, useEffect, useRef, useCallback } = React;

/* ── colour tokens (light / dark) ── */
const themes = {
  light: {
    bg: "#f7f6f3",
    surface: "#ffffff",
    surfaceBorder: "rgba(0,0,0,0.06)",
    surfaceShadow: "0 4px 24px rgba(0,0,0,0.04)",
    text: "#1a1a1a",
    textMuted: "#666",
    textFaint: "#999",
    accent: "#3b6fa0",
    accentSoft: "rgba(59,111,160,0.08)",
    accentBorder: "rgba(59,111,160,0.2)",
    green: "#3a8c5c",
    greenSoft: "rgba(58,140,92,0.08)",
    greenBorder: "rgba(58,140,92,0.2)",
    red: "#b04a3a",
    redSoft: "rgba(176,74,58,0.08)",
    redBorder: "rgba(176,74,58,0.25)",
    amber: "#9a7a2a",
    amberSoft: "rgba(154,122,42,0.08)",
    amberBorder: "rgba(154,122,42,0.2)",
    diagramBg: "#fafaf8",
    diagramBorder: "rgba(0,0,0,0.06)",
    blockBg: "rgba(59,111,160,0.06)",
    blockBorder: "rgba(59,111,160,0.18)",
    connectorLine: "rgba(0,0,0,0.12)",
    connectorDash: "rgba(59,111,160,0.25)",
    stepInactiveBg: "#fff",
    stepInactiveBorder: "rgba(0,0,0,0.12)",
    stepInactiveText: "rgba(0,0,0,0.3)",
    stepDoneBg: "rgba(58,140,92,0.06)",
    stepDoneBorder: "rgba(58,140,92,0.4)",
    stepDoneText: "#3a8c5c",
    toggleBg: "rgba(0,0,0,0.08)",
    toggleKnob: "#fff",
    insightBg: "linear-gradient(135deg, rgba(59,111,160,0.04), rgba(100,60,140,0.03))",
    insightBorder: "rgba(59,111,160,0.1)",
    codeBg: "rgba(0,0,0,0.03)",
  },
  dark: {
    bg: "#111113",
    surface: "#1a1a1e",
    surfaceBorder: "rgba(255,255,255,0.06)",
    surfaceShadow: "0 4px 24px rgba(0,0,0,0.3)",
    text: "#e8e6e1",
    textMuted: "#999",
    textFaint: "#666",
    accent: "#6ba3d6",
    accentSoft: "rgba(107,163,214,0.1)",
    accentBorder: "rgba(107,163,214,0.2)",
    green: "#5cb87a",
    greenSoft: "rgba(92,184,122,0.1)",
    greenBorder: "rgba(92,184,122,0.2)",
    red: "#d06a5a",
    redSoft: "rgba(208,106,90,0.1)",
    redBorder: "rgba(208,106,90,0.25)",
    amber: "#c4a444",
    amberSoft: "rgba(196,164,68,0.1)",
    amberBorder: "rgba(196,164,68,0.2)",
    diagramBg: "#16161a",
    diagramBorder: "rgba(255,255,255,0.06)",
    blockBg: "rgba(107,163,214,0.08)",
    blockBorder: "rgba(107,163,214,0.18)",
    connectorLine: "rgba(255,255,255,0.08)",
    connectorDash: "rgba(107,163,214,0.3)",
    stepInactiveBg: "#1a1a1e",
    stepInactiveBorder: "rgba(255,255,255,0.08)",
    stepInactiveText: "rgba(255,255,255,0.25)",
    stepDoneBg: "rgba(92,184,122,0.08)",
    stepDoneBorder: "rgba(92,184,122,0.35)",
    stepDoneText: "#5cb87a",
    toggleBg: "rgba(255,255,255,0.1)",
    toggleKnob: "#2a2a2e",
    insightBg: "linear-gradient(135deg, rgba(107,163,214,0.06), rgba(140,100,180,0.04))",
    insightBorder: "rgba(107,163,214,0.12)",
    codeBg: "rgba(255,255,255,0.04)",
  },
};

const STEPS = [
  {
    id: "input",
    title: "Input Prompt",
    subtitle: "The sequence begins",
    description:
      "Unlike autoregressive models (GPT, Claude) that generate one token at a time left-to-right, a diffusion LLM receives the input prompt and prepares to generate ALL output tokens simultaneously.",
    detail:
      "The prompt is encoded into embeddings just like a standard transformer. But what happens next is fundamentally different — instead of predicting one next token, the model will operate on every output position in parallel.",
  },
  {
    id: "noise",
    title: "Initialize with Noise",
    subtitle: "Pure randomness as starting point",
    description:
      "For each output position, the model starts with a completely random (noisy) token embedding. Every output slot is filled with pure noise — no signal, no structure.",
    detail:
      "This is analogous to how image diffusion models (Stable Diffusion, DALL-E) start from random pixel noise. Here, we are doing it in discrete token space instead of continuous pixel space.",
  },
  {
    id: "denoise1",
    title: "First Denoising Pass",
    subtitle: "Structure emerges from chaos",
    description:
      "The model runs a single forward pass through the transformer. It attends to both the clean prompt tokens AND all the noisy output tokens together, predicting what each output token should be — simultaneously for every position.",
    detail:
      "Self-attention is the key mechanism: each noisy token can see the prompt AND every other noisy token. This lets the model coordinate its predictions globally, maintaining coherence across all positions at once.",
  },
  {
    id: "denoise2",
    title: "Iterative Refinement",
    subtitle: "Progressive sharpening across 5–20 steps",
    description:
      "The model does not jump to the final answer in one step. Over 5–20 denoising steps, each pass refines all tokens together. Early steps establish broad structure (topic, syntax); later steps nail precise word choices.",
    detail:
      "Each step reduces the noise level according to a schedule. The model sees its own improving predictions and can correct inconsistencies. Tokens are refined together through shared attention, not independently — this is why coherence is maintained despite parallel generation.",
  },
  {
    id: "output",
    title: "Final Output",
    subtitle: "All tokens materialised",
    description:
      "After the final denoising step, all tokens are fully resolved simultaneously. The entire response exists at once — no waiting for sequential token-by-token generation.",
    detail:
      "Mercury achieves high throughput because instead of N sequential forward passes for N tokens (autoregressive), it uses approximately 10–20 passes regardless of output length. That is a massive parallelism advantage, especially for longer outputs.",
  },
];

const PROMPT_TOKENS = ["How", "does", "a", "fox", "move", "?"];
const OUTPUT_CLEAN = ["The", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog", "today"];
const NOISE_GLYPHS = ["▓░▒█", "█▒░▓", "░▓█▒", "▒█▓░", "▓█░▒", "░▒▓█", "█░▒▓", "▒▓░█", "░█▒▓", "▓▒█░"];
const NOISE_3 = ["T#e", "qu!ck", "br$wn", "f*x", "jumqs", "ov&r", "the", "la%y", "d*g", "toda#"];
const NOISE_1 = ["The", "quic%", "brown", "fox", "jump$", "over", "the", "lazy", "do#", "today"];

/* ── Toggle ── */
function ThemeToggle({ dark, onToggle, t }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      style={{
        position: "relative",
        width: 52,
        height: 28,
        borderRadius: 14,
        border: `1px solid ${t.surfaceBorder}`,
        background: dark ? "rgba(107,163,214,0.2)" : t.toggleBg,
        cursor: "pointer",
        transition: "all 0.3s ease",
        padding: 0,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: dark ? 26 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: dark ? t.accent : "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
        }}
      >
        {dark ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f90" strokeWidth="2.5">
            <circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        )}
      </div>
    </button>
  );
}

/* ── Token Pill ── */
function TokenPill({ text, kind, noiseLevel, index, t }) {
  // kind: "prompt" | "output"
  let bg, border, color;
  if (kind === "prompt") {
    bg = t.accentSoft;
    border = t.accentBorder;
    color = t.accent;
  } else if (noiseLevel >= 4) {
    bg = t.redSoft;
    border = t.redBorder;
    color = t.red;
  } else if (noiseLevel >= 2) {
    bg = t.amberSoft;
    border = t.amberBorder;
    color = t.amber;
  } else {
    bg = t.greenSoft;
    border = t.greenBorder;
    color = t.green;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 11px",
        margin: "3px",
        borderRadius: 5,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 12.5,
        fontWeight: kind === "prompt" ? 600 : 500,
        color,
        background: bg,
        border: `1px solid ${border}`,
        filter: noiseLevel >= 4 ? "blur(0.5px)" : "none",
        opacity: noiseLevel >= 5 ? 0.7 : 1,
        transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
        transitionDelay: `${index * 30}ms`,
        minWidth: 42,
        textAlign: "center",
        letterSpacing: noiseLevel >= 4 ? "0.8px" : "0.2px",
      }}
    >
      {text}
    </span>
  );
}

/* ── SVG Block Diagram ── */
function BlockDiagram({ step, t }) {
  const showOutput = step >= 1;
  const showTransformer = step >= 2;
  const showLoop = step === 3;
  const noiseLevel = step === 0 ? -1 : step === 1 ? 5 : step === 2 ? 4 : step === 3 ? 2 : 0;

  const outputTokens =
    noiseLevel >= 5
      ? NOISE_GLYPHS
      : noiseLevel >= 4
        ? NOISE_3
        : noiseLevel >= 2
          ? NOISE_1
          : OUTPUT_CLEAN;

  const noiseLabel =
    noiseLevel >= 5
      ? "Pure noise"
      : noiseLevel >= 4
        ? "Denoising — step 1"
        : noiseLevel >= 2
          ? "Denoising — step 3"
          : noiseLevel >= 0
            ? "Resolved"
            : "";

  const noiseLabelColor =
    noiseLevel >= 4 ? t.red : noiseLevel >= 2 ? t.amber : t.green;

  return (
    <div
      style={{
        background: t.diagramBg,
        border: `1px solid ${t.diagramBorder}`,
        borderRadius: 12,
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── PROMPT ROW ── */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={labelStyle(t)}>Prompt tokens</div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
          {PROMPT_TOKENS.map((tok, i) => (
            <TokenPill key={i} text={tok} kind="prompt" noiseLevel={0} index={i} t={t} />
          ))}
        </div>
      </div>

      {/* ── CONNECTOR: prompt → transformer ── */}
      <svg width="100%" height={showTransformer ? "36" : "0"} style={{ transition: "height 0.4s ease", overflow: "visible" }}>
        {showTransformer && (
          <>
            <line x1="50%" y1="0" x2="50%" y2="36" stroke={t.connectorLine} strokeWidth="1.5" />
            <polygon points={`${50}%,36 ${49}%,28 ${51}%,28`} fill={t.connectorLine} style={{ transform: "translateX(-0.5%)" }} />
            {/* Use a simpler approach for the arrow */}
          </>
        )}
      </svg>

      {/* Connector arrow (simple div approach for reliability) */}
      {showTransformer && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "-4px 0 -2px" }}>
          <div style={{ width: 1.5, height: 28, background: t.connectorLine }} />
          <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `6px solid ${t.connectorLine}` }} />
        </div>
      )}

      {/* ── TRANSFORMER BLOCK ── */}
      {showTransformer && (
        <div
          style={{
            width: "100%",
            maxWidth: 540,
            padding: "14px 20px",
            background: t.blockBg,
            border: `1.5px solid ${t.blockBorder}`,
            borderRadius: 10,
            textAlign: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              color: t.accent,
            }}
          >
            Transformer — Self-Attention + FFN
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: t.textFaint,
              lineHeight: 1.5,
            }}
          >
            Each position attends to prompt + all other positions simultaneously
          </div>
          {/* Animated processing bar */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "10%",
              width: "80%",
              height: 2,
              borderRadius: 1,
              background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
              opacity: 0.4,
              animation: "shimmer 2.5s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* ── CONNECTOR: transformer → output ── */}
      {showTransformer && showOutput && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0" }}>
          <div style={{ width: 1.5, height: 28, background: t.connectorLine }} />
          <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `6px solid ${t.connectorLine}` }} />
        </div>
      )}

      {/* ── Spacer for non-transformer steps ── */}
      {!showTransformer && showOutput && <div style={{ height: 20 }} />}

      {/* ── OUTPUT ROW ── */}
      {showOutput && (
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <div style={{ ...labelStyle(t), color: noiseLabelColor }}>{noiseLabel}</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
            {outputTokens.map((tok, i) => (
              <TokenPill key={`${step}-${i}`} text={tok} kind="output" noiseLevel={noiseLevel} index={i} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* ── LOOP INDICATOR ── */}
      {showLoop && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px dashed ${t.amberBorder}`,
            background: t.amberSoft,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: t.amber,
              fontWeight: 500,
            }}
          >
            Feed output back as input — repeat 5–20 times
          </span>
        </div>
      )}
    </div>
  );
}

function labelStyle(t) {
  return {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: t.textFaint,
    marginBottom: 6,
    fontWeight: 600,
  };
}

/* ── Step Nav ── */
function StepNav({ steps, current, onSelect, t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={() => onSelect(i)}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: `2px solid ${i === current ? t.accent : i < current ? t.stepDoneBorder : t.stepInactiveBorder}`,
              background: i === current ? t.accent : i < current ? t.stepDoneBg : t.stepInactiveBg,
              color: i === current ? "#fff" : i < current ? t.stepDoneText : t.stepInactiveText,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: i === current ? `0 2px 10px rgba(59,111,160,0.25)` : "none",
              padding: 0,
            }}
          >
            {i < current ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              i + 1
            )}
          </button>
          {i < steps.length - 1 && (
            <div
              style={{
                width: 36,
                height: 2,
                background: i < current ? t.stepDoneBorder : t.stepInactiveBorder,
                transition: "background 0.3s ease",
                borderRadius: 1,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Comparison ── */
function Comparison({ t }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
      {/* Autoregressive */}
      <div
        style={{
          padding: 20,
          borderRadius: 10,
          border: `1px solid ${t.redBorder}`,
          background: t.redSoft,
        }}
      >
        <div style={{ ...labelStyle(t), color: t.red, marginBottom: 10 }}>Autoregressive (GPT / Claude)</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: t.textMuted, margin: "0 0 14px", fontFamily: "'Newsreader', Georgia, serif" }}>
          Generate one token, attend to all previous, generate next. Repeat N times sequentially.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {["The", "quick", "brown", "fox"].map((tok, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <TokenPill text={tok} kind="output" noiseLevel={0} index={i} t={t} />
              {i < 3 && <span style={{ color: t.textFaint, fontSize: 13, fontFamily: "monospace" }}>→</span>}
            </div>
          ))}
          <span style={{ color: t.textFaint, fontSize: 13, fontFamily: "monospace", marginLeft: 2 }}>...</span>
        </div>
        <div style={{ marginTop: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: t.red, fontWeight: 600 }}>
          N tokens = N forward passes
        </div>
      </div>

      {/* Diffusion */}
      <div
        style={{
          padding: 20,
          borderRadius: 10,
          border: `1px solid ${t.accentBorder}`,
          background: t.accentSoft,
        }}
      >
        <div style={{ ...labelStyle(t), color: t.accent, marginBottom: 10 }}>Diffusion LLM (Mercury)</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: t.textMuted, margin: "0 0 14px", fontFamily: "'Newsreader', Georgia, serif" }}>
          Start with noise at ALL positions. Denoise all together. Refine over 10–20 parallel passes.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {["The", "quick", "brown", "fox"].map((tok, i) => (
            <TokenPill key={i} text={tok} kind="prompt" noiseLevel={0} index={i} t={t} />
          ))}
          <span style={{ color: t.textFaint, fontSize: 13, fontFamily: "monospace", marginLeft: 2 }}>...</span>
        </div>
        <div style={{ marginTop: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: t.accent, fontWeight: 600 }}>
          N tokens = 10–20 forward passes
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
function DiffusionLLMVisualizer() {
  const [step, setStep] = useState(0);
  const [dark, setDark] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showComp, setShowComp] = useState(false);
  const timer = useRef(null);
  const t = dark ? themes.dark : themes.light;
  const s = STEPS[step];

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setStep((p) => {
          if (p >= STEPS.length - 1) { setPlaying(false); return p; }
          return p + 1;
        });
      }, 3200);
    }
    return () => clearInterval(timer.current);
  }, [playing]);

  const btnBase = {
    padding: "9px 18px",
    borderRadius: 7,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: `1px solid ${t.surfaceBorder}`,
    background: t.surface,
    color: t.text,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.text,
        fontFamily: "'Newsreader', Georgia, serif",
        padding: "36px 20px 60px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "background 0.4s ease, color 0.4s ease",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        @keyframes shimmer { 0%,100%{opacity:0.15} 50%{opacity:0.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 700, width: "100%" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                color: t.textFaint,
                marginBottom: 8,
              }}
            >
              Understanding Diffusion Language Models
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.25, margin: 0 }}>
              How Mercury <em style={{ fontWeight: 600, fontStyle: "italic" }}>Denoises</em>
            </h1>
            <p style={{ fontSize: 15, color: t.textMuted, margin: "6px 0 0", fontStyle: "italic" }}>
              Parallel token generation through iterative refinement
            </p>
          </div>
          <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} t={t} />
        </div>

        {/* ── Step Nav ── */}
        <StepNav steps={STEPS} current={step} onSelect={setStep} t={t} />

        {/* ── Content Card ── */}
        <div
          key={step}
          style={{
            background: t.surface,
            borderRadius: 14,
            border: `1px solid ${t.surfaceBorder}`,
            padding: "28px 28px 24px",
            marginBottom: 20,
            boxShadow: t.surfaceShadow,
            animation: "fadeUp 0.35s ease-out",
          }}
        >
          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: t.textFaint, marginBottom: 4, fontWeight: 600 }}>
              {s.subtitle}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{s.title}</h2>
          </div>

          {/* Block Diagram */}
          <BlockDiagram step={step} t={t} />

          {/* Description */}
          <p style={{ fontSize: 14.5, lineHeight: 1.75, color: t.textMuted, margin: "20px 0 14px" }}>
            {s.description}
          </p>

          {/* Detail callout */}
          <div
            style={{
              padding: "14px 18px",
              background: t.accentSoft,
              borderLeft: `3px solid ${t.accentBorder}`,
              borderRadius: "0 8px 8px 0",
            }}
          >
            <p style={{ fontSize: 13, lineHeight: 1.7, color: t.textMuted, margin: 0, fontStyle: "italic" }}>
              {s.detail}
            </p>
          </div>
        </div>

        {/* ── Controls ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 28 }}>
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={{ ...btnBase, opacity: step === 0 ? 0.35 : 1, cursor: step === 0 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <button
            onClick={() => { if (playing) { setPlaying(false); } else { setStep(0); setPlaying(true); } }}
            style={{
              ...btnBase,
              background: playing ? t.red : t.accent,
              color: "#fff",
              border: "none",
              boxShadow: `0 2px 8px ${playing ? "rgba(176,74,58,0.2)" : "rgba(59,111,160,0.2)"}`,
            }}
          >
            {playing ? "Pause" : "Autoplay"}
          </button>
          <button
            onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
            disabled={step === STEPS.length - 1}
            style={{ ...btnBase, opacity: step === STEPS.length - 1 ? 0.35 : 1, cursor: step === STEPS.length - 1 ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>

        {/* ── Comparison Toggle ── */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <button
            onClick={() => setShowComp(!showComp)}
            style={{
              ...btnBase,
              background: showComp ? t.accentSoft : t.surface,
              color: t.accent,
              border: `1px solid ${t.accentBorder}`,
            }}
          >
            {showComp ? "Hide" : "Show"} Autoregressive vs Diffusion
          </button>
        </div>
        {showComp && <Comparison t={t} />}

        {/* ── Key Insight ── */}
        <div
          style={{
            marginTop: 28,
            padding: 22,
            borderRadius: 12,
            background: t.insightBg,
            border: `1px solid ${t.insightBorder}`,
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: t.accent, marginBottom: 8, fontWeight: 600 }}>
            The Key Insight
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.75, color: t.textMuted, margin: 0 }}>
            Mercury decouples generation count from forward pass count. Where an autoregressive model needs 1,000 sequential forward passes for 1,000 tokens, Mercury needs only 10–20 passes regardless of output length — all tokens are denoised in parallel through shared self-attention, maintaining coherence while achieving roughly 1,100 tokens per second.
          </p>
        </div>
      </div>
    </div>
  );
}
