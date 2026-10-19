import React, { useEffect, useState, useMemo, useCallback } from "react";

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
interface KPIs {
  pendentes: number;
  ral_gt8h: number; pct_gt8h: number;
  ral_gt24h: number; pct_gt24h: number;
  ral_gt7d: number; pct_gt7d: number;
  ral_gt30d: number; pct_gt30d: number;
}
interface AgingItem  { label: string; count: number; pct: number; }
interface AreaItem   { area: string;  count: number; pct: number; }
interface RankItem   { rank: number; sigla: string; total?: number; pct?: number; volume?: number; fraction?: string; }
interface TipoStats  { kpis: KPIs; aging: AgingItem[]; areas: AreaItem[]; rankings: { byTotal: RankItem[]; byPct8h: RankItem[]; byPct24h: RankItem[] }; }
interface RalReportData {
  updatedAt: string;
  tipos: string[];
  all: TipoStats;
  byTipo: Record<string, TipoStats>;
}

// ═══════════════════════════════════════
// HORIZONTAL BAR
// ═══════════════════════════════════════
const HBar = ({ pct, color }: { pct: number; color: string }) => (
  <div style={{ flex: 1, height: 9, borderRadius: 4, background: "rgba(0,0,0,0.08)", overflow: "hidden", margin: "0 8px", flexShrink: 0 }}>
    <div style={{ width: `${Math.max(Math.min(pct, 100), pct > 0 ? 2 : 0)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} />
  </div>
);

// ═══════════════════════════════════════
// KPI ICONS
// ═══════════════════════════════════════
const KpiIcon = ({ type, color }: { type: string; color: string }) => {
  const s = { stroke: color, strokeWidth: "1.8", strokeLinecap: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    pendentes: <><rect x="3" y="3" width="18" height="18" rx="3" fill="none" {...s}/><path d="M7 8h10M7 12h8M7 16h5" fill="none" {...s}/></>,
    clock8:    <><circle cx="12" cy="12" r="9" fill="none" {...s}/><path d="M12 7v5l3 3" fill="none" {...s}/></>,
    clock24:   <><circle cx="12" cy="12" r="9" fill="none" {...s}/><path d="M12 7v5l-3 3" fill="none" {...s}/></>,
    cal7:      <><rect x="3" y="4" width="18" height="17" rx="2" fill="none" {...s}/><path d="M3 9h18M8 2v4M16 2v4" fill="none" {...s}/></>,
    timer30:   <><circle cx="12" cy="13" r="8" fill="none" {...s}/><path d="M12 9v4l2.5 2.5M9 2h6" fill="none" {...s}/></>,
  };
  return <svg width="26" height="26" viewBox="0 0 24 24">{paths[type]}</svg>;
};

// ═══════════════════════════════════════
// FILTER CHIPS & HELPERS
// ═══════════════════════════════════════
const TIPOS_DISPLAY: Record<string, string> = {
  "ACESSO CLIENTE": "Acesso Cliente",
  "BACKBONE":       "Backbone",
  "COLETOR":        "Coletor",
  "FOTONICA":       "Fotonico",
  "FOTÔNICA":       "Fotonico",
  "QUALIDADE":      "Qualidade",
};

/** Normaliza chaves vindas do JSON para o label correto (ex: Fotonico) */
const displayTipo = (key: string): string => {
  if (TIPOS_DISPLAY[key]) return TIPOS_DISPLAY[key];
  if (key.toUpperCase().includes("FOT") && key.toUpperCase().includes("NIC")) return "Fotonico";
  return key;
};

/** Agrega estatísticas para um conjunto de tipos selecionados (suporte a seleção múltipla) */
function aggregateStats(selectedKeys: string[], data: RalReportData): TipoStats {
  if (selectedKeys.length === 0 || selectedKeys.length === data.tipos.length) {
    return data.all;
  }
  if (selectedKeys.length === 1) {
    return data.byTipo[selectedKeys[0]] ?? data.all;
  }

  const subsets = selectedKeys.map(k => data.byTipo[k]).filter(Boolean);
  if (subsets.length === 0) return data.all;

  const pendentes = subsets.reduce((acc, s) => acc + s.kpis.pendentes, 0);
  const gt8 = subsets.reduce((acc, s) => acc + s.kpis.ral_gt8h, 0);
  const gt24 = subsets.reduce((acc, s) => acc + s.kpis.ral_gt24h, 0);
  const gt7 = subsets.reduce((acc, s) => acc + s.kpis.ral_gt7d, 0);
  const gt30 = subsets.reduce((acc, s) => acc + s.kpis.ral_gt30d, 0);

  const pct = (val: number) => (pendentes > 0 ? Math.round((val / pendentes) * 100) : 0);

  const kpis: KPIs = {
    pendentes,
    ral_gt8h: gt8,
    pct_gt8h: pct(gt8),
    ral_gt24h: gt24,
    pct_gt24h: pct(gt24),
    ral_gt7d: gt7,
    pct_gt7d: pct(gt7),
    ral_gt30d: gt30,
    pct_gt30d: pct(gt30),
  };

  // Aging
  const agingLabels = subsets[0].aging.map(a => a.label);
  const agingMap: Record<string, number> = {};
  for (const s of subsets) {
    for (const a of s.aging) {
      agingMap[a.label] = (agingMap[a.label] || 0) + a.count;
    }
  }
  const aging: AgingItem[] = agingLabels.map(label => {
    const count = agingMap[label] || 0;
    return {
      label,
      count,
      pct: pct(count),
    };
  });

  // Areas
  const areaMap: Record<string, number> = {};
  for (const s of subsets) {
    for (const a of s.areas) {
      areaMap[a.area] = (areaMap[a.area] || 0) + a.count;
    }
  }
  const areas: AreaItem[] = Object.entries(areaMap)
    .map(([area, count]) => ({
      area,
      count,
      pct: pct(count),
    }))
    .sort((a, b) => b.count - a.count);

  // Rankings By Total
  const totalBySigla: Record<string, number> = {};
  for (const s of subsets) {
    for (const r of s.rankings.byTotal) {
      totalBySigla[r.sigla] = (totalBySigla[r.sigla] || 0) + (r.total || 0);
    }
  }
  const grandTotal = Object.values(totalBySigla).reduce((a, b) => a + b, 0) || 1;
  const byTotal: RankItem[] = Object.entries(totalBySigla)
    .map(([sigla, total]) => ({
      sigla,
      total,
      pct: Math.round((total / grandTotal) * 100),
      rank: 0,
    }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Rankings By % >8h
  const pct8BySigla: Record<string, { volume: number; total: number }> = {};
  for (const s of subsets) {
    for (const r of s.rankings.byPct8h) {
      if (!pct8BySigla[r.sigla]) pct8BySigla[r.sigla] = { volume: 0, total: 0 };
      pct8BySigla[r.sigla].volume += (r.volume || 0);
      pct8BySigla[r.sigla].total += (r.total || 0);
    }
  }
  const byPct8h: RankItem[] = Object.entries(pct8BySigla)
    .map(([sigla, d]) => {
      const p = d.total > 0 ? Math.round((d.volume / d.total) * 100) : 0;
      return {
        sigla,
        volume: d.volume,
        total: d.total,
        pct: p,
        fraction: `${d.volume}/${d.total}`,
        rank: 0,
      };
    })
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0) || (b.total ?? 0) - (a.total ?? 0))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Rankings By % >24h
  const pct24BySigla: Record<string, { volume: number; total: number }> = {};
  for (const s of subsets) {
    for (const r of s.rankings.byPct24h) {
      if (!pct24BySigla[r.sigla]) pct24BySigla[r.sigla] = { volume: 0, total: 0 };
      pct24BySigla[r.sigla].volume += (r.volume || 0);
      pct24BySigla[r.sigla].total += (r.total || 0);
    }
  }
  const byPct24h: RankItem[] = Object.entries(pct24BySigla)
    .map(([sigla, d]) => {
      const p = d.total > 0 ? Math.round((d.volume / d.total) * 100) : 0;
      return {
        sigla,
        volume: d.volume,
        total: d.total,
        pct: p,
        fraction: `${d.volume}/${d.total}`,
        rank: 0,
      };
    })
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0) || (b.total ?? 0) - (a.total ?? 0))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return {
    kpis,
    aging,
    areas,
    rankings: {
      byTotal,
      byPct8h,
      byPct24h,
    },
  };
}

const FilterChips = ({
  tipos,
  selected,
  onToggle,
  onSelectAll,
}: {
  tipos: string[];
  selected: string[];
  onToggle: (tipo: string) => void;
  onSelectAll: () => void;
}) => {
  const isAll = selected.length === 0 || selected.length === tipos.length;

  const ALLOWED_TIPOS = ["ACESSO CLIENTE", "BACKBONE", "COLETOR", "FOTONICA", "QUALIDADE"];
  const visibleTipos = tipos.filter(t => ALLOWED_TIPOS.includes(t));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 14px",
        background: "#fff",
        borderBottom: "1px solid #dde3ec",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#666",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginRight: 4,
        }}
      >
        Filtro:
      </span>

      {/* Botão Todos */}
      <button
        onClick={onSelectAll}
        style={{
          padding: "6px 14px",
          borderRadius: 20,
          border: isAll ? "2px solid #1a3a6e" : "1px solid #d1d5db",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: 0.3,
          transition: "all 0.15s ease",
          background: isAll ? "#1a3a6e" : "#f8fafc",
          color: isAll ? "#fff" : "#475569",
          boxShadow: isAll ? "0 2px 8px rgba(26,58,110,0.25)" : "none",
        }}
      >
        Todos
      </button>

      {/* Botões individuais com seleção múltipla */}
      {visibleTipos.map(t => {
        const isSelected = selected.includes(t);
        return (
          <button
            key={t}
            onClick={() => onToggle(t)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: isSelected ? "2px solid #e2001a" : "1px solid #cbd5e1",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.3,
              transition: "all 0.15s ease",
              background: isSelected ? "#e2001a" : "#f8fafc",
              color: isSelected ? "#fff" : "#334155",
              boxShadow: isSelected ? "0 2px 8px rgba(226,0,26,0.3)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 13,
                height: 13,
                borderRadius: 3,
                border: isSelected ? "1px solid #fff" : "1px solid #94a3b8",
                background: isSelected ? "#fff" : "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "#e2001a",
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {isSelected ? "✓" : ""}
            </span>
            <span>{displayTipo(t)}</span>
          </button>
        );
      })}

      {selected.length > 0 && selected.length < visibleTipos.length && (
        <button
          onClick={onSelectAll}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            fontSize: 11,
            cursor: "pointer",
            textDecoration: "underline",
            marginLeft: 4,
          }}
        >
          Limpar ({selected.length} selecionado{selected.length > 1 ? "s" : ""})
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════
// CLARO LOGO
// ═══════════════════════════════════════
const ClaroLogo = () => (
  <div style={{ background: "#fff", borderRadius: 6, padding: "5px 14px", display: "flex", alignItems: "center", minWidth: 130 }}>
    <span style={{ color: "#e2001a", fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: -0.5, lineHeight: 1 }}>
      Claro<sup style={{ fontSize: 9 }}>°</sup>{" "}
      <span style={{ fontWeight: 400, fontSize: 11 }}>empresas</span>
    </span>
  </div>
);

// ═══════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════
const DATA_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

const RalReport: React.FC = () => {
  const [data, setData] = useState<RalReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  const fetchData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      const timestamp = Date.now();
      const basePath = import.meta.env.BASE_URL || "/";

      const isLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.port === "5173");

      const localUrl = `${basePath}data/ral_report.json?t=${timestamp}`;
      const apiUrl = `https://api.github.com/repos/cpralonrj-pralon/embratel-sir/contents/public/data/ral_report.json?t=${timestamp}`;
      const rawUrl = `https://raw.githubusercontent.com/cpralonrj-pralon/embratel-sir/main/public/data/ral_report.json?t=${timestamp}`;

      // No localhost / dev local, prioriza SEMPRE o arquivo local gerado
      const urlsToTry = isLocalhost
        ? [localUrl, apiUrl, rawUrl]
        : [apiUrl, rawUrl, localUrl];

      let response: Response | null = null;
      for (const url of urlsToTry) {
        try {
          const res = await fetch(url, {
            headers: url.includes("api.github.com") ? { Accept: "application/vnd.github.v3.raw" } : undefined,
          });
          if (res.ok) {
            response = res;
            break;
          }
        } catch {
          // tenta próxima fonte
        }
      }

      if (!response || !response.ok) throw new Error("Falha ao carregar dados do relatório RAL");
      const jsonData = await response.json();
      setData(jsonData as RalReportData);
      setLastRefreshedAt(
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch (e) {
      console.error("Erro ao carregar dados do relatório RAL:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, DATA_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggleTipo = (tipo: string) => {
    setSelectedTipos(prev => {
      if (prev.includes(tipo)) {
        return prev.filter(t => t !== tipo);
      } else {
        return [...prev, tipo];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedTipos([]);
  };

  // Pick or aggregate active stats set based on multi-select filter
  const active: TipoStats | null = useMemo(() => {
    if (!data) return null;
    return aggregateStats(selectedTipos, data);
  }, [data, selectedTipos]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ecf0f5" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "4px solid #e2001a", borderTop: "4px solid transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#666", fontFamily: "Arial, sans-serif", fontSize: 13 }}>Carregando relatório...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!data || !active) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ecf0f5" }}>
      <p style={{ color: "#c00", fontFamily: "Arial", fontSize: 14 }}>Erro ao carregar dados.</p>
    </div>
  );

  const { kpis, aging, areas, rankings } = active;
  const maxAging = Math.max(...aging.map(a => a.count), 1);
  const maxArea  = Math.max(...areas.map(a => a.count), 1);
  const maxTotal = rankings.byTotal[0]?.total ?? 1;

  const PH: React.CSSProperties = {
    background: "#1a3a6e", color: "#fff",
    padding: "7px 16px", fontSize: 11, fontWeight: 900,
    textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Arial, sans-serif",
  };
  const ROW: React.CSSProperties = { display: "flex", alignItems: "center", marginBottom: 5, minHeight: 22 };

  const kpiCards = [
    { icon: "pendentes", label: "Pendentes",  sub: "Total classificado",  val: String(kpis.pendentes),                         color: "#1a3a6e" },
    { icon: "clock8",    label: "RAL >8h",    sub: "Volume | percentual", val: `${kpis.ral_gt8h} | ${kpis.pct_gt8h}%`,         color: "#d05a00" },
    { icon: "clock24",   label: "RAL >24h",   sub: "Volume | percentual", val: `${kpis.ral_gt24h} | ${kpis.pct_gt24h}%`,       color: "#b07000" },
    { icon: "cal7",      label: "RAL >7d",    sub: "Volume | percentual", val: `${kpis.ral_gt7d} | ${kpis.pct_gt7d}%`,         color: "#6a1a8a" },
    { icon: "timer30",   label: "RAL >30d",   sub: "Volume | percentual", val: `${kpis.ral_gt30d} | ${kpis.pct_gt30d}%`,       color: "#8a1a1a" },
  ];

  return (
    <div style={{ background: "#ecf0f5", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: "#e2001a", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <ClaroLogo />
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: 0.5, textAlign: "center", flex: 1, margin: 0, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          RAL &gt;8h e RAL &gt;24h
          {selectedTipos.length > 0 && selectedTipos.length < data.tipos.length && (
            <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 12, opacity: 0.9 }}>
              — {selectedTipos.map(displayTipo).join(", ")}
            </span>
          )}
        </h1>

        {/* Status de atualização periódica de 5min */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.2)", padding: "4px 10px", borderRadius: 20 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isRefreshing ? "#fbbf24" : "#4ade80",
                boxShadow: isRefreshing ? "0 0 8px #fbbf24" : "0 0 8px #4ade80",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {isRefreshing ? "Atualizando..." : "Ao Vivo • 5 min"}
            </span>
          </div>

          <div style={{ textAlign: "right", lineHeight: 1.3 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, opacity: 0.85 }}>
              Dados Base
            </div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{data.updatedAt}</div>
            {lastRefreshedAt && (
              <div style={{ fontSize: 9, opacity: 0.8 }}>Sincronizado: {lastRefreshedAt}</div>
            )}
          </div>

          {/* Botão de atualização manual instantânea */}
          <button
            onClick={() => fetchData(true)}
            title="Atualizar dados agora"
            disabled={isRefreshing}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "#fff",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: isRefreshing ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "background 0.2s",
            }}
          >
            <span style={{ display: "inline-block", transform: isRefreshing ? "rotate(360deg)" : "none", transition: "transform 0.6s linear" }}>
              ↻
            </span>
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* FILTER CHIPS */}
      <FilterChips
        tipos={data.tipos}
        selected={selectedTipos}
        onToggle={handleToggleTipo}
        onSelectAll={handleSelectAll}
      />

      {/* KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, padding: "12px 14px" }}>
        {kpiCards.map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", minWidth: 0 }}>
            <KpiIcon type={k.icon} color={k.color} />
            <div style={{ fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1.1, marginTop: 4 }}>{k.val}</div>
            <div style={{ fontSize: 10, color: "#999", marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* AGING + AREAS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 14px" }}>
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={PH}>Distribuição por Faixa de Aging</div>
          <div style={{ padding: "10px 16px 14px" }}>
            {aging.map(a => (
              <div key={a.label} style={ROW}>
                <span style={{ width: 62, fontSize: 11, fontWeight: 600, color: "#333", flexShrink: 0 }}>{a.label}</span>
                <HBar pct={(a.count / maxAging) * 100} color="#1a3a6e" />
                <span style={{ width: 30, textAlign: "right", fontSize: 12, fontWeight: 700, color: "#222", flexShrink: 0 }}>{a.count}</span>
                <span style={{ width: 32, textAlign: "right", fontSize: 11, color: "#888", flexShrink: 0 }}>{a.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={PH}>Pendências por Área Responsável</div>
          <div style={{ padding: "10px 16px 14px" }}>
            {areas.length === 0 && <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 20 }}>Sem dados</p>}
            {areas.map(a => (
              <div key={a.area} style={ROW}>
                <span style={{ width: 118, fontSize: 10, fontWeight: 700, color: "#333", flexShrink: 0, textTransform: "uppercase", letterSpacing: 0.2 }}>{a.area}</span>
                <HBar pct={(a.count / maxArea) * 100} color="#e2001a" />
                <span style={{ width: 34, textAlign: "right", fontSize: 12, fontWeight: 700, color: "#222", flexShrink: 0 }}>{a.count}</span>
                <span style={{ width: 32, textAlign: "right", fontSize: 11, color: "#888", flexShrink: 0 }}>{a.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RANKINGS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "10px 14px 0" }}>
        {/* Backlog Total */}
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={PH}>Ranking por Backlog Total</div>
          <div style={{ padding: "10px 16px 14px" }}>
            {rankings.byTotal.slice(0, 11).map(r => (
              <div key={r.sigla} style={ROW}>
                <span style={{ width: 18, fontSize: 10, color: "#bbb", flexShrink: 0 }}>{r.rank}</span>
                <span style={{ width: 52, fontSize: 11, fontWeight: 800, color: "#222", flexShrink: 0 }}>{r.sigla}</span>
                <HBar pct={((r.total ?? 0) / maxTotal) * 100} color="#1a3a6e" />
                <span style={{ width: 30, textAlign: "right", fontSize: 12, fontWeight: 700, color: "#222", flexShrink: 0 }}>{r.total}</span>
                <span style={{ width: 32, textAlign: "right", fontSize: 11, color: "#888", flexShrink: 0 }}>{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* % >8h */}
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={PH}>Ranking por Percentual &gt;8H</div>
          <div style={{ padding: "10px 16px 14px" }}>
            {rankings.byPct8h.slice(0, 11).map(r => (
              <div key={r.sigla} style={ROW}>
                <span style={{ width: 18, fontSize: 10, color: "#bbb", flexShrink: 0 }}>{r.rank}</span>
                <span style={{ width: 52, fontSize: 11, fontWeight: 800, color: "#222", flexShrink: 0 }}>{r.sigla}</span>
                <HBar pct={r.pct ?? 0} color="#e2001a" />
                <span style={{ width: 36, textAlign: "right", fontSize: 12, fontWeight: 900, color: "#e2001a", flexShrink: 0 }}>{r.pct}%</span>
                <span style={{ width: 52, textAlign: "right", fontSize: 10, color: "#888", flexShrink: 0 }}>{r.fraction}</span>
              </div>
            ))}
          </div>
        </div>

        {/* % >24h */}
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={PH}>Ranking por Percentual &gt;24H</div>
          <div style={{ padding: "10px 16px 14px" }}>
            {rankings.byPct24h.slice(0, 11).map(r => (
              <div key={r.sigla} style={ROW}>
                <span style={{ width: 18, fontSize: 10, color: "#bbb", flexShrink: 0 }}>{r.rank}</span>
                <span style={{ width: 52, fontSize: 11, fontWeight: 800, color: "#222", flexShrink: 0 }}>{r.sigla}</span>
                <HBar pct={r.pct ?? 0} color="#e2001a" />
                <span style={{ width: 36, textAlign: "right", fontSize: 12, fontWeight: 900, color: "#e2001a", flexShrink: 0 }}>{r.pct}%</span>
                <span style={{ width: 52, textAlign: "right", fontSize: 10, color: "#888", flexShrink: 0 }}>{r.fraction}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: "#1a3a6e", color: "#fff", padding: "8px 20px", display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginTop: 12 }}>
        <span>70 . 70 . 50 | CLIENTE, RECEITA, RENTABILIDADE</span>
        <span>SERVIÇOS DE CAMPO EMPRESARIAL</span>
      </div>
    </div>
  );
};

export default RalReport;
