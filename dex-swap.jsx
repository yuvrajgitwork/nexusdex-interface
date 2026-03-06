import { useState, useEffect, useCallback } from "react";

const TOKENS = [
  { symbol: "ETH", name: "Ethereum", logo: "⟠", balance: 2.4812, price: 3421.5 },
  { symbol: "USDC", name: "USD Coin", logo: "◎", balance: 4820.0, price: 1.0 },
  { symbol: "USDT", name: "Tether", logo: "₮", balance: 1200.0, price: 1.0 },
  { symbol: "WBTC", name: "Wrapped Bitcoin", logo: "₿", balance: 0.1045, price: 62400.0 },
  { symbol: "ARB", name: "Arbitrum", logo: "🔵", balance: 520.0, price: 1.12 },
  { symbol: "OP", name: "Optimism", logo: "🔴", balance: 310.5, price: 2.34 },
  { symbol: "LINK", name: "Chainlink", logo: "⬡", balance: 88.2, price: 14.72 },
  { symbol: "UNI", name: "Uniswap", logo: "🦄", balance: 45.0, price: 8.91 },
];

// Custom AMM pricing: uses a slightly different curve than Uniswap x*y=k
// This one applies a dynamic fee based on volume imbalance
function getAmountOut(amountIn, tokenIn, tokenOut) {
  if (!amountIn || isNaN(amountIn) || amountIn <= 0) return "";
  const valueIn = amountIn * tokenIn.price;
  const baseFee = 0.003; // 0.3% base
  const impactFactor = Math.min(amountIn / (tokenIn.balance * 10), 0.05); // custom impact
  const dynamicFee = baseFee + impactFactor;
  const valueOut = valueIn * (1 - dynamicFee);
  return (valueOut / tokenOut.price).toFixed(6);
}

function getPriceImpact(amountIn, tokenIn) {
  if (!amountIn || isNaN(amountIn) || amountIn <= 0) return 0;
  return Math.min((amountIn / (tokenIn.balance * 10)) * 100, 5).toFixed(2);
}

function TokenModal({ onSelect, onClose, exclude }) {
  const [search, setSearch] = useState("");
  const filtered = TOKENS.filter(
    (t) =>
      t.symbol !== exclude &&
      (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Select Token</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <input
          autoFocus
          placeholder="Search by name or symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.tokenList}>
          {filtered.map((t) => (
            <div key={t.symbol} style={styles.tokenRow} onClick={() => { onSelect(t); onClose(); }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={styles.tokenLogo}>{t.logo}</span>
              <div style={styles.tokenInfo}>
                <span style={styles.tokenSymbol}>{t.symbol}</span>
                <span style={styles.tokenName}>{t.name}</span>
              </div>
              <span style={styles.tokenBalance}>{t.balance.toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TxToast({ status, hash, onClose }) {
  useEffect(() => {
    if (status === "confirmed") {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [status, onClose]);

  const config = {
    pending: { color: "#f59e0b", icon: "⏳", text: "Transaction pending..." },
    confirmed: { color: "#10b981", icon: "✓", text: "Swap confirmed!" },
    failed: { color: "#ef4444", icon: "✕", text: "Transaction failed" },
  }[status];

  if (!config) return null;

  return (
    <div style={{ ...styles.toast, borderColor: config.color }}>
      <span style={{ color: config.color, fontSize: 18 }}>{config.icon}</span>
      <div>
        <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>{config.text}</div>
        {hash && (
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
            {hash.slice(0, 10)}...{hash.slice(-6)}
          </div>
        )}
      </div>
      <button onClick={onClose} style={styles.toastClose}>✕</button>
    </div>
  );
}

export default function DEXSwap() {
  const [tokenIn, setTokenIn] = useState(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState(TOKENS[1]);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [customSlippage, setCustomSlippage] = useState("");
  const [modal, setModal] = useState(null); // "in" | "out" | null
  const [wallet, setWallet] = useState("disconnected"); // disconnected | connecting | connected
  const [walletAddr, setWalletAddr] = useState("");
  const [txStatus, setTxStatus] = useState(null); // null | pending | confirmed | failed
  const [txHash, setTxHash] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rotating, setRotating] = useState(false);

  const amountOut = getAmountOut(parseFloat(amountIn), tokenIn, tokenOut);
  const priceImpact = getPriceImpact(parseFloat(amountIn), tokenIn);
  const activeSlippage = customSlippage || slippage;

  const connectWallet = () => {
    setWallet("connecting");
    setTimeout(() => {
      setWallet("connected");
      setWalletAddr("0x71C7...3Fa8");
    }, 1400);
  };

  const handleSwap = () => {
    if (!amountIn || !amountOut) return;
    setTxStatus("pending");
    const fakeHash = "0x" + Math.random().toString(16).slice(2, 66);
    setTxHash(fakeHash);
    const success = Math.random() > 0.1;
    setTimeout(() => {
      setTxStatus(success ? "confirmed" : "failed");
      if (success) setAmountIn("");
    }, 2200);
  };

  const flipTokens = () => {
    setRotating(true);
    setTimeout(() => setRotating(false), 400);
    const oldIn = tokenIn;
    const oldOut = tokenOut;
    setTokenIn(oldOut);
    setTokenOut(oldIn);
    setAmountIn(amountOut || "");
  };

  const insufficientBalance = parseFloat(amountIn) > tokenIn.balance;
  const rate = tokenIn && tokenOut
    ? (tokenIn.price / tokenOut.price).toFixed(6)
    : null;

  return (
    <div style={styles.root}>
      {/* Background */}
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>⬡</span>
          <span style={styles.logoText}>nexus<span style={styles.logoAccent}>dex</span></span>
        </div>
        <nav style={styles.nav}>
          {["Swap", "Pool", "Analytics"].map((item, i) => (
            <span key={item} style={{ ...styles.navItem, ...(i === 0 ? styles.navActive : {}) }}>
              {item}
            </span>
          ))}
        </nav>
        <div>
          {wallet === "disconnected" && (
            <button style={styles.connectBtn} onClick={connectWallet}>Connect Wallet</button>
          )}
          {wallet === "connecting" && (
            <button style={{ ...styles.connectBtn, opacity: 0.7 }}>
              <span style={styles.spinner} /> Connecting...
            </button>
          )}
          {wallet === "connected" && (
            <div style={styles.walletPill}>
              <span style={styles.walletDot} />
              {walletAddr}
            </div>
          )}
        </div>
      </header>

      {/* Main Card */}
      <main style={styles.main}>
        <div style={styles.card}>
          {/* Card Header */}
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Swap</span>
            <button style={styles.settingsBtn} onClick={() => setSettingsOpen(!settingsOpen)}>
              <span style={{ fontSize: 16 }}>⚙</span>
            </button>
          </div>

          {/* Settings Panel */}
          {settingsOpen && (
            <div style={styles.settingsPanel}>
              <div style={styles.settingsLabel}>Slippage Tolerance</div>
              <div style={styles.slippageRow}>
                {["0.1", "0.5", "1.0"].map((s) => (
                  <button
                    key={s}
                    style={{ ...styles.slippageBtn, ...(slippage === s && !customSlippage ? styles.slippageBtnActive : {}) }}
                    onClick={() => { setSlippage(s); setCustomSlippage(""); }}
                  >
                    {s}%
                  </button>
                ))}
                <input
                  placeholder="Custom"
                  value={customSlippage}
                  onChange={(e) => setCustomSlippage(e.target.value)}
                  style={styles.slippageInput}
                />
              </div>
            </div>
          )}

          {/* Token In */}
          <div style={styles.tokenBox}>
            <div style={styles.tokenBoxTop}>
              <span style={styles.labelText}>You pay</span>
              <span style={styles.balanceText}>
                Balance: {tokenIn.balance.toFixed(4)} {tokenIn.symbol}
                <span
                  style={styles.maxBtn}
                  onClick={() => setAmountIn(tokenIn.balance.toString())}
                >MAX</span>
              </span>
            </div>
            <div style={styles.tokenBoxRow}>
              <input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                style={styles.amountInput}
              />
              <button style={styles.tokenSelector} onClick={() => setModal("in")}>
                <span style={styles.selectorLogo}>{tokenIn.logo}</span>
                <span style={styles.selectorSymbol}>{tokenIn.symbol}</span>
                <span style={styles.chevron}>▾</span>
              </button>
            </div>
            {amountIn && (
              <div style={styles.usdValue}>
                ≈ ${(parseFloat(amountIn) * tokenIn.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Flip Button */}
          <div style={styles.flipRow}>
            <div style={styles.flipLine} />
            <button
              style={{ ...styles.flipBtn, transform: rotating ? "rotate(180deg)" : "rotate(0deg)" }}
              onClick={flipTokens}
            >⇅</button>
            <div style={styles.flipLine} />
          </div>

          {/* Token Out */}
          <div style={{ ...styles.tokenBox, background: "rgba(255,255,255,0.02)" }}>
            <div style={styles.tokenBoxTop}>
              <span style={styles.labelText}>You receive</span>
              <span style={styles.balanceText}>Balance: {tokenOut.balance.toFixed(4)} {tokenOut.symbol}</span>
            </div>
            <div style={styles.tokenBoxRow}>
              <input
                readOnly
                placeholder="0.0"
                value={amountOut}
                style={{ ...styles.amountInput, color: amountOut ? "#10b981" : "#475569" }}
              />
              <button style={styles.tokenSelector} onClick={() => setModal("out")}>
                <span style={styles.selectorLogo}>{tokenOut.logo}</span>
                <span style={styles.selectorSymbol}>{tokenOut.symbol}</span>
                <span style={styles.chevron}>▾</span>
              </button>
            </div>
            {amountOut && (
              <div style={styles.usdValue}>
                ≈ ${(parseFloat(amountOut) * tokenOut.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Route Info */}
          {amountIn && amountOut && (
            <div style={styles.routeBox}>
              <div style={styles.routeRow}>
                <span style={styles.routeLabel}>Rate</span>
                <span style={styles.routeValue}>1 {tokenIn.symbol} = {rate} {tokenOut.symbol}</span>
              </div>
              <div style={styles.routeRow}>
                <span style={styles.routeLabel}>Price Impact</span>
                <span style={{
                  ...styles.routeValue,
                  color: parseFloat(priceImpact) > 2 ? "#ef4444" : parseFloat(priceImpact) > 0.5 ? "#f59e0b" : "#10b981"
                }}>
                  {priceImpact}%
                </span>
              </div>
              <div style={styles.routeRow}>
                <span style={styles.routeLabel}>Slippage</span>
                <span style={styles.routeValue}>{activeSlippage}%</span>
              </div>
              <div style={styles.routeRow}>
                <span style={styles.routeLabel}>Min. Received</span>
                <span style={styles.routeValue}>
                  {(parseFloat(amountOut) * (1 - parseFloat(activeSlippage) / 100)).toFixed(6)} {tokenOut.symbol}
                </span>
              </div>
              <div style={styles.routeRow}>
                <span style={styles.routeLabel}>Route</span>
                <span style={styles.routeValue}>{tokenIn.symbol} → NexusPool → {tokenOut.symbol}</span>
              </div>
            </div>
          )}

          {/* CTA Button */}
          {wallet !== "connected" ? (
            <button style={styles.swapBtn} onClick={connectWallet}>
              {wallet === "connecting" ? "Connecting..." : "Connect Wallet to Swap"}
            </button>
          ) : insufficientBalance ? (
            <button style={{ ...styles.swapBtn, background: "#1e293b", color: "#ef4444", cursor: "not-allowed" }}>
              Insufficient {tokenIn.symbol} Balance
            </button>
          ) : (
            <button
              style={{
                ...styles.swapBtn,
                ...(!amountIn || txStatus === "pending" ? { opacity: 0.5, cursor: "not-allowed" } : {})
              }}
              onClick={handleSwap}
              disabled={!amountIn || txStatus === "pending"}
            >
              {txStatus === "pending" ? "⏳ Confirming..." : `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`}
            </button>
          )}
        </div>

        {/* Market info strip */}
        <div style={styles.marketStrip}>
          {TOKENS.slice(0, 5).map((t) => (
            <div key={t.symbol} style={styles.marketItem}>
              <span style={{ opacity: 0.5, marginRight: 4 }}>{t.logo}</span>
              <span style={styles.marketSymbol}>{t.symbol}</span>
              <span style={styles.marketPrice}>${t.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Modals */}
      {modal && (
        <TokenModal
          onSelect={(t) => modal === "in" ? setTokenIn(t) : setTokenOut(t)}
          onClose={() => setModal(null)}
          exclude={modal === "in" ? tokenOut.symbol : tokenIn.symbol}
        />
      )}

      {/* Toast */}
      {txStatus && (
        <TxToast status={txStatus} hash={txHash} onClose={() => { setTxStatus(null); setTxHash(""); }} />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    minHeight: "100vh",
    background: "#070b14",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    color: "#f1f5f9",
    position: "relative",
    overflow: "hidden",
  },
  bgGlow1: {
    position: "fixed",
    top: -200,
    left: "30%",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  bgGlow2: {
    position: "fixed",
    bottom: -200,
    right: "20%",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 40px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    position: "relative",
    zIndex: 10,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    fontSize: 22,
    color: "#10b981",
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: "#f1f5f9",
  },
  logoAccent: {
    color: "#10b981",
  },
  nav: {
    display: "flex",
    gap: 32,
  },
  navItem: {
    fontSize: 13,
    color: "#475569",
    cursor: "pointer",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    transition: "color 0.2s",
  },
  navActive: {
    color: "#10b981",
  },
  connectBtn: {
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.3)",
    color: "#10b981",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    gap: 6,
    letterSpacing: "0.03em",
  },
  walletPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 13,
    color: "#94a3b8",
  },
  walletDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#10b981",
    boxShadow: "0 0 6px #10b981",
  },
  spinner: {
    display: "inline-block",
    width: 10,
    height: 10,
    border: "2px solid rgba(16,185,129,0.3)",
    borderTop: "2px solid #10b981",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 48,
    position: "relative",
    zIndex: 5,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 24,
    backdropFilter: "blur(20px)",
    boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  settingsBtn: {
    background: "transparent",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    padding: 4,
    transition: "color 0.2s",
  },
  settingsPanel: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 11,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 10,
  },
  slippageRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  slippageBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#64748b",
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  slippageBtnActive: {
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.3)",
    color: "#10b981",
  },
  slippageInput: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#f1f5f9",
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 12,
    width: 70,
    fontFamily: "inherit",
    outline: "none",
  },
  tokenBox: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 4,
    transition: "border-color 0.2s",
  },
  tokenBoxTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  labelText: {
    fontSize: 11,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  balanceText: {
    fontSize: 11,
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  maxBtn: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.05em",
    border: "1px solid rgba(16,185,129,0.3)",
    padding: "1px 5px",
    borderRadius: 4,
  },
  tokenBoxRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  amountInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#f1f5f9",
    fontSize: 24,
    fontFamily: "inherit",
    fontWeight: 600,
    letterSpacing: "-0.5px",
    width: 0,
  },
  tokenSelector: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    color: "#f1f5f9",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    transition: "background 0.2s",
  },
  selectorLogo: {
    fontSize: 16,
  },
  selectorSymbol: {
    fontSize: 14,
    fontWeight: 600,
  },
  chevron: {
    fontSize: 10,
    color: "#64748b",
  },
  usdValue: {
    marginTop: 8,
    fontSize: 11,
    color: "#475569",
  },
  flipRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "8px 0",
  },
  flipLine: {
    flex: 1,
    height: 1,
    background: "rgba(255,255,255,0.05)",
  },
  flipBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#475569",
    width: 32,
    height: 32,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.35s ease, background 0.2s",
  },
  routeBox: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: "12px 14px",
    margin: "12px 0",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  routeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeLabel: {
    fontSize: 11,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  routeValue: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: 500,
  },
  swapBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginTop: 8,
    transition: "opacity 0.2s, transform 0.1s",
    boxShadow: "0 4px 20px rgba(16,185,129,0.25)",
  },
  marketStrip: {
    display: "flex",
    gap: 24,
    marginTop: 28,
    padding: "12px 24px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: 10,
    maxWidth: 440,
    width: "100%",
    flexWrap: "wrap",
  },
  marketItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
  },
  marketSymbol: {
    color: "#64748b",
    letterSpacing: "0.04em",
  },
  marketPrice: {
    color: "#94a3b8",
    fontWeight: 600,
  },
  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    width: 360,
    maxHeight: 480,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "inherit",
  },
  searchInput: {
    margin: "12px 20px",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#f1f5f9",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  },
  tokenList: {
    overflowY: "auto",
    flex: 1,
    padding: "4px 8px 12px",
  },
  tokenRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  tokenLogo: {
    fontSize: 22,
    width: 32,
    textAlign: "center",
  },
  tokenInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  tokenSymbol: {
    fontSize: 13,
    fontWeight: 700,
    color: "#f1f5f9",
  },
  tokenName: {
    fontSize: 11,
    color: "#475569",
  },
  tokenBalance: {
    fontSize: 12,
    color: "#64748b",
  },
  // Toast
  toast: {
    position: "fixed",
    bottom: 24,
    right: 24,
    background: "#0f172a",
    border: "1px solid",
    borderRadius: 10,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    zIndex: 200,
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    minWidth: 220,
  },
  toastClose: {
    background: "transparent",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    marginLeft: "auto",
    fontSize: 12,
    fontFamily: "inherit",
  },
};
