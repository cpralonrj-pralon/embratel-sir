import React, { useEffect, useState, useMemo, useCallback } from 'react';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface DatasetItem {
    cluster: string;
    cidade?: string;
    ralType: string;
    code?: string;
    description?: string;
    date?: string;
    duration?: string;
    num?: string;
}

interface DatasetStats {
    total: number;
    clusters: Record<string, number>;
    items: DatasetItem[];
}

interface DashboardData {
    updatedAt: string;
    RAL: DatasetStats;
    REC: DatasetStats;
}

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const DATA_REFRESH_INTERVAL = 5 * 60 * 1000;

// ═══════════════════════════════════════════════
// FILTER CHIPS
// ═══════════════════════════════════════════════

const FilterChips = ({ options, selected, onChange }: {
    options: string[];
    selected: string[];
    onChange: (val: string[]) => void;
}) => {
    const toggle = (option: string) => {
        onChange(selected.includes(option)
            ? selected.filter(s => s !== option)
            : [...selected, option]);
    };

    return (
        <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest mr-1"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Filtro:
            </span>
            {options.map((option) => (
                <button
                    key={option}
                    onClick={() => toggle(option)}
                    style={{
                        fontFamily: 'var(--font-body)',
                        background: selected.length === 0 || selected.includes(option)
                            ? 'var(--accent)' : 'var(--surface-card)',
                        color: selected.length === 0 || selected.includes(option)
                            ? '#000' : 'var(--text-secondary)',
                        border: `1px solid ${selected.length === 0 || selected.includes(option)
                            ? 'var(--accent)' : 'var(--border-panel)'}`,
                    }}
                    className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all duration-200 hover:brightness-110 cursor-pointer"
                >
                    {option}
                </button>
            ))}
            {selected.length > 0 && (
                <button
                    onClick={() => onChange([])}
                    className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer hover:brightness-125"
                    style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#fca5a5',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    ✕ Limpar
                </button>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════
// DETAILS MODAL
// ═══════════════════════════════════════════════

const DetailsModal = ({
    clusterName,
    items,
    onClose
}: {
    clusterName: string;
    items: DatasetItem[];
    onClose: () => void;
}) => {
    if (!items) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="rounded-lg w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-slideUp"
                style={{
                    background: 'var(--surface-panel)',
                    border: '1px solid var(--border-panel)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4"
                    style={{ background: 'var(--surface-base)', borderBottom: '2px solid var(--accent)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full animate-live" style={{ background: 'var(--accent)' }} />
                        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                            className="text-sm sm:text-lg font-bold uppercase tracking-wider">
                            {clusterName}
                        </h2>
                        <span className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{ background: 'var(--accent)', color: '#000', fontFamily: 'var(--font-display)' }}>
                            {items.length}
                        </span>
                    </div>
                    <button onClick={onClose}
                        className="p-2 rounded transition-colors hover:brightness-150 cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label="Fechar">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-auto flex-1 p-2 sm:p-4">
                    <table className="w-full text-left border-collapse" style={{ fontFamily: 'var(--font-body)' }}>
                        <thead>
                            <tr style={{ background: 'var(--surface-base)' }}
                                className="text-[10px] uppercase tracking-wider sticky top-0 z-10">
                                <th className="p-2.5 font-semibold" style={{ color: 'var(--accent)', borderBottom: '1px solid var(--border-panel)' }}>Região</th>
                                <th className="p-2.5 font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-panel)' }}>Código</th>
                                <th className="p-2.5 font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-panel)' }}>Tipo</th>
                                <th className="p-2.5 font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-panel)' }}>Abertura</th>
                                <th className="p-2.5 font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-panel)' }}>Duração</th>
                                <th className="p-2.5 font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-panel)' }}>Recup.</th>
                                <th className="p-2.5 font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-panel)' }}>Descrição</th>
                            </tr>
                        </thead>
                        <tbody className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                            {items.map((item, idx) => (
                                <tr key={idx}
                                    className="transition-colors"
                                    style={{
                                        borderBottom: '1px solid var(--border-subtle)',
                                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-glow)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)')}>
                                    <td className="p-2.5 font-bold uppercase text-[11px] tracking-tight whitespace-nowrap"
                                        style={{ color: 'var(--accent)', borderLeft: '2px solid var(--accent-dim)', fontFamily: 'var(--font-body)' }}>
                                        {(item as any).cidade || 'N/A'}
                                    </td>
                                    <td className="p-2.5 font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '11px' }}>
                                        {item.code || 'N/A'}
                                    </td>
                                    <td className="p-2.5">{item.ralType}</td>
                                    <td className="p-2.5 whitespace-nowrap" style={{ fontFamily: 'var(--font-display)', fontSize: '11px' }}>{item.date}</td>
                                    <td className="p-2.5" style={{ fontFamily: 'var(--font-display)', fontSize: '11px' }}>{item.duration}</td>
                                    <td className="p-2.5" style={{ fontFamily: 'var(--font-display)', fontSize: '11px' }}>{item.num}</td>
                                    <td className="p-2.5 max-w-[200px] truncate" style={{ color: 'var(--text-muted)', fontSize: '11px' }} title={item.description}>
                                        {item.description}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal Footer */}
                <div className="px-4 py-3 text-right" style={{ background: 'var(--surface-base)', borderTop: '1px solid var(--border-panel)' }}>
                    <button onClick={onClose}
                        className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer hover:brightness-110"
                        style={{ background: 'var(--surface-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', border: '1px solid var(--border-panel)' }}>
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};


// ═══════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════

const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [selectedRalTypes, setSelectedRalTypes] = useState<string[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Drill-down state
    const [ralDrillCluster, setRalDrillCluster] = useState<string | null>(null);
    const [recDrillCluster, setRecDrillCluster] = useState<string | null>(null);

    // Modal state
    const [selectedCluster, setSelectedCluster] = useState<{ name: string; items: DatasetItem[] } | null>(null);

    // ─── Data Loading ───
    const fetchData = useCallback(async () => {
        try {
            setIsRefreshing(true);
            const timestamp = new Date().getTime();
            const basePath = import.meta.env.BASE_URL || '/';
            const response = await fetch(`${basePath}data/dashboard.json?t=${timestamp}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const jsonData = await response.json();
            setData(jsonData as DashboardData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, DATA_REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchData]);

    // ─── Data Processing ───
    const getFilteredItems = (dataset: DatasetStats, filterTypes: string[]) => {
        if (!dataset.items) return [];
        if (filterTypes.length === 0) return dataset.items;
        return dataset.items.filter(item => filterTypes.includes(item.ralType));
    };

    const ralItems = useMemo(() => data ? getFilteredItems(data.RAL, selectedRalTypes) : [], [data, selectedRalTypes]);
    const recItems = useMemo(() => data ? getFilteredItems(data.REC, []) : [], [data]);

    const getClusterCounts = (items: DatasetItem[]) => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
            const c = item.cluster || "Unknown";
            counts[c] = (counts[c] || 0) + 1;
        });
        return counts;
    };

    const getRegionCounts = (items: DatasetItem[], clusterName: string) => {
        const counts: Record<string, number> = {};
        items
            .filter(item => (item.cluster || "Unknown") === clusterName)
            .forEach(item => {
                const r = (item as any).cidade || "Unknown";
                counts[r] = (counts[r] || 0) + 1;
            });
        return counts;
    };

    const ralClusters = useMemo(() => getClusterCounts(ralItems), [ralItems]);
    const recClusters = useMemo(() => getClusterCounts(recItems), [recItems]);

    const ralTypeOptions = useMemo(() => {
        if (!data || !data.RAL.items) return [];
        const types = new Set(data.RAL.items.map(i => i.ralType).filter(t => t && t !== 'N/A' && t !== 'nan'));
        return Array.from(types).sort();
    }, [data]);

    // ─── Card Helpers ───
    const getCardStyle = (count: number) => {
        if (count === 0) return { bg: 'var(--status-ok)', border: '#059669' };
        if (count < 5) return { bg: '#166534', border: '#15803d' };
        if (count < 10) return { bg: '#92400e', border: '#b45309' };
        return { bg: '#991b1b', border: '#dc2626' };
    };

    const isClusterCritical = (items: DatasetItem[]) => {
        return items.some(item => {
            const desc = (item.description || "").toUpperCase();
            const duration = item.duration || "";
            const isTargetType = desc.includes("SWAP") || desc.includes("RUP CABO");
            if (!isTargetType) return false;
            try {
                const parts = duration.split('.');
                if (parts.length < 2) return false;
                const days = parseInt(parts[0].replace('d', '')) || 0;
                const hours = parseInt(parts[1].substring(0, 2)) || 0;
                return days > 0 || hours >= 12;
            } catch {
                return false;
            }
        });
    };

    const handleRegionClick = (regionName: string, clusterName: string, allItems: DatasetItem[]) => {
        const regionItems = allItems.filter(i =>
            (i.cluster || "Unknown") === clusterName &&
            ((i as any).cidade || "Unknown") === regionName
        );
        setSelectedCluster({ name: `${clusterName} › ${regionName}`, items: regionItems });
    };

    // ─── Card Grid ───
    const renderCardGrid = (
        counts: Record<string, number>,
        onCardClick: (key: string) => void,
        getItemsForCritical: (key: string) => DatasetItem[]
    ) => {
        const sortedKeys = Object.keys(counts).sort();

        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {sortedKeys.map((key, idx) => {
                    const items = getItemsForCritical(key);
                    const isCritical = isClusterCritical(items);
                    const style = getCardStyle(counts[key]);

                    return (
                        <div
                            key={key}
                            onClick={() => onCardClick(key)}
                            className={`${isCritical ? 'alert-glow' : ''} card-enter rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 flex flex-col items-center justify-center min-h-[80px] sm:min-h-[90px] group relative overflow-hidden`}
                            style={{
                                background: style.bg,
                                borderTop: `3px solid ${style.border}`,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                animationDelay: `${idx * 30}ms`,
                            }}
                        >
                            {/* Inner glow on hover */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)' }} />

                            <span className="text-[9px] font-bold uppercase text-center mb-1 tracking-wider relative z-10 px-1 leading-tight"
                                style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)' }}>
                                {isCritical && "🚨 "}{key}
                            </span>
                            <span className="text-2xl sm:text-3xl font-black relative z-10"
                                style={{ color: '#fff', fontFamily: 'var(--font-display)', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {counts[key]}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ─── Section Renderer ───
    const renderSection = (
        title: string,
        items: DatasetItem[],
        clusters: Record<string, number>,
        drillCluster: string | null,
        setDrillCluster: (v: string | null) => void,
        showFilter?: boolean,
        accentColor?: string
    ) => {
        const isDrilled = drillCluster !== null;
        const regionCounts = isDrilled ? getRegionCounts(items, drillCluster) : {};
        const accent = accentColor || 'var(--accent)';

        return (
            <section className="rounded-lg overflow-hidden"
                style={{
                    background: 'var(--surface-panel)',
                    border: '1px solid var(--border-panel)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                }}>

                {/* Section Header */}
                <div className="flex justify-between items-center px-4 py-3"
                    style={{ background: 'var(--surface-base)', borderBottom: `2px solid ${accent}` }}>
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full" style={{ background: accent }} />
                        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                            className="text-base sm:text-lg font-bold uppercase tracking-wider">
                            {title}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                            Total
                        </span>
                        <div className="px-3 py-1 rounded"
                            style={{
                                background: items.length > 50 ? 'var(--status-critical)' : items.length > 20 ? 'var(--status-warn)' : 'var(--status-ok)',
                                fontFamily: 'var(--font-display)',
                                color: items.length > 20 ? '#000' : '#fff',
                                boxShadow: `0 0 12px ${items.length > 50 ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
                            }}
                        >
                            <span className="text-xl font-black">{items.length}</span>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-4">
                    {/* Filter Chips */}
                    {showFilter && ralTypeOptions.length > 0 && (
                        <div className="mb-3 p-2.5 rounded-lg"
                            style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                            <FilterChips
                                options={ralTypeOptions}
                                selected={selectedRalTypes}
                                onChange={setSelectedRalTypes}
                            />
                        </div>
                    )}

                    {/* Breadcrumb + Back */}
                    {isDrilled && (
                        <div className="flex items-center gap-2 mb-3">
                            <button
                                onClick={() => setDrillCluster(null)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer hover:brightness-125"
                                style={{
                                    background: 'var(--surface-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-panel)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                                Voltar
                            </button>
                            <div className="flex items-center gap-1.5 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Clusters</span>
                                <span style={{ color: 'var(--text-muted)' }}>›</span>
                                <span className="font-bold" style={{ color: accent }}>{drillCluster}</span>
                            </div>
                        </div>
                    )}

                    {/* Section Label */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                            {isDrilled ? `Regiões — ${drillCluster}` : 'Por Cluster'}
                        </span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>

                    {/* Card Grid */}
                    {!isDrilled ? (
                        renderCardGrid(
                            clusters,
                            (key: string) => setDrillCluster(key),
                            (key: string) => items.filter(i => (i.cluster || "Unknown") === key)
                        )
                    ) : (
                        renderCardGrid(
                            regionCounts,
                            (regionKey: string) => handleRegionClick(regionKey, drillCluster, items),
                            (regionKey: string) => items.filter(i =>
                                (i.cluster || "Unknown") === drillCluster &&
                                ((i as any).cidade || "Unknown") === regionKey
                            )
                        )
                    )}
                </div>
            </section>
        );
    };

    // ─── Loading State ───
    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-deep)' }}>
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-live" style={{ background: 'var(--accent)' }} />
                    <p className="text-sm font-semibold uppercase tracking-widest"
                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                        Carregando painel...
                    </p>
                </div>
            </div>
        );
    }

    // ─── Render ───
    return (
        <div className="min-h-screen" style={{ background: 'var(--surface-deep)', fontFamily: 'var(--font-body)' }}>

            {/* Details Modal */}
            {selectedCluster && (
                <DetailsModal
                    clusterName={selectedCluster.name}
                    items={selectedCluster.items}
                    onClose={() => setSelectedCluster(null)}
                />
            )}

            {/* ═══ HEADER ═══ */}
            <header className="sticky top-0 z-20 px-3 sm:px-6 py-3"
                style={{
                    background: 'var(--surface-base)',
                    borderBottom: '1px solid var(--border-panel)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                }}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                        {/* Live indicator */}
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full animate-live" style={{ background: isRefreshing ? 'var(--status-ok)' : 'var(--accent)' }} />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-xl font-bold uppercase tracking-wider"
                                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                                Painel SIR
                            </h1>
                            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                Monitoração de Rede
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isRefreshing && (
                            <span className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: 'var(--status-ok)' }}>
                                Atualizando...
                            </span>
                        )}
                        <div className="px-3 py-1.5 rounded"
                            style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-subtle)' }}>
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                                Atualizado:
                            </span>
                            <span className="ml-1.5 text-[11px] font-bold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                                {data.updatedAt}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ═══ MAIN GRID ═══ */}
            <main className="p-2 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
                    {renderSection('RAL (RRE)', ralItems, ralClusters, ralDrillCluster, setRalDrillCluster, true, '#f59e0b')}
                    {renderSection('REC (RRE)', recItems, recClusters, recDrillCluster, setRecDrillCluster, false, '#06b6d4')}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
