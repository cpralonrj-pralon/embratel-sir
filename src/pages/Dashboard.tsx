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
// CLUSTER ACCORDION SECTION
// ═══════════════════════════════════════════════

const ClusterAccordion = ({
    clusterName,
    totalCount,
    regionCounts,
    allClusterItems,
    isExpanded,
    onToggle,
    onRegionClick,
    accentColor,
}: {
    clusterName: string;
    totalCount: number;
    regionCounts: Record<string, number>;
    allClusterItems: DatasetItem[];
    isExpanded: boolean;
    onToggle: () => void;
    onRegionClick: (regionName: string) => void;
    accentColor: string;
}) => {
    const sortedRegions = Object.keys(regionCounts).sort();

    // Check if any region is critical
    const hasCritical = allClusterItems.some(item => {
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

    const getCardStyle = (count: number) => {
        if (count === 0) return { bg: 'var(--status-ok)', border: '#059669' };
        if (count < 5) return { bg: '#166534', border: '#15803d' };
        if (count < 10) return { bg: '#92400e', border: '#b45309' };
        return { bg: '#991b1b', border: '#dc2626' };
    };

    const isRegionCritical = (regionName: string) => {
        const regionItems = allClusterItems.filter(i => ((i as any).cidade || "Unknown") === regionName);
        return regionItems.some(item => {
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

    return (
        <div className="rounded-lg overflow-hidden transition-all duration-200"
            style={{
                background: 'var(--surface-card)',
                border: hasCritical ? '1px solid var(--status-critical)' : '1px solid var(--border-subtle)',
                boxShadow: hasCritical ? '0 0 12px rgba(239,68,68,0.15)' : 'none',
            }}>

            {/* Accordion Header — always visible */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 cursor-pointer transition-colors duration-150 hover:brightness-110"
                style={{ background: isExpanded ? 'var(--surface-elevated)' : 'transparent' }}
            >
                <div className="flex items-center gap-2.5">
                    {/* Expand/Collapse chevron */}
                    <svg
                        className="w-3.5 h-3.5 transition-transform duration-200"
                        style={{
                            color: accentColor,
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>

                    {/* Cluster name */}
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                        {hasCritical && "🚨 "}{clusterName}
                    </span>

                    {/* Region count badge */}
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--surface-base)', color: 'var(--text-muted)' }}>
                        {sortedRegions.length} {sortedRegions.length === 1 ? 'região' : 'regiões'}
                    </span>
                </div>

                {/* Total count */}
                <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded text-sm font-black"
                        style={{
                            background: totalCount > 30 ? 'var(--status-critical)' :
                                totalCount > 10 ? 'var(--status-warn)' : 'var(--status-ok)',
                            color: totalCount > 10 ? '#000' : '#fff',
                            fontFamily: 'var(--font-display)',
                            minWidth: '36px',
                            textAlign: 'center',
                        }}>
                        {totalCount}
                    </div>
                </div>
            </button>

            {/* Accordion Body — region cards */}
            {isExpanded && (
                <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-1 animate-slideUp">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
                        {sortedRegions.map((region, idx) => {
                            const count = regionCounts[region];
                            const style = getCardStyle(count);
                            const critical = isRegionCritical(region);

                            return (
                                <div
                                    key={region}
                                    onClick={() => onRegionClick(region)}
                                    className={`${critical ? 'alert-glow' : ''} card-enter rounded cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 flex flex-col items-center justify-center min-h-[60px] sm:min-h-[68px] group relative overflow-hidden`}
                                    style={{
                                        background: style.bg,
                                        borderTop: `2px solid ${style.border}`,
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                                        animationDelay: `${idx * 20}ms`,
                                    }}
                                >
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)' }} />
                                    <span className="text-[8px] sm:text-[9px] font-bold uppercase text-center mb-0.5 tracking-wide relative z-10 px-1 leading-tight"
                                        style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)' }}>
                                        {critical && "🚨 "}{region}
                                    </span>
                                    <span className="text-lg sm:text-xl font-black relative z-10"
                                        style={{ color: '#fff', fontFamily: 'var(--font-display)', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                                        {count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
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

    // Accordion state: which clusters are expanded (all expanded by default)
    const [expandedRal, setExpandedRal] = useState<Set<string>>(new Set());
    const [expandedRec, setExpandedRec] = useState<Set<string>>(new Set());
    const [ralInitialized, setRalInitialized] = useState(false);
    const [recInitialized, setRecInitialized] = useState(false);

    // Modal state
    const [selectedCluster, setSelectedCluster] = useState<{ name: string; items: DatasetItem[] } | null>(null);

    // ─── Data Loading ───
    const fetchData = useCallback(async () => {
        try {
            setIsRefreshing(true);
            const timestamp = new Date().getTime();
            const basePath = import.meta.env.BASE_URL || '/';
            const rawUrl = `https://raw.githubusercontent.com/cpralonrj-pralon/embratel-sir/main/public/data/dashboard.json?t=${timestamp}`;
            const localUrl = `${basePath}data/dashboard.json?t=${timestamp}`;

            let response: Response;
            try {
                response = await fetch(rawUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
            } catch (err) {
                console.warn('Falha ao carregar do Raw GitHub, tentando fallback local...', err);
                response = await fetch(localUrl);
            }

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

    // Auto-expand all clusters on first load
    useEffect(() => {
        if (!ralInitialized && Object.keys(ralClusters).length > 0) {
            setExpandedRal(new Set(Object.keys(ralClusters)));
            setRalInitialized(true);
        }
    }, [ralClusters, ralInitialized]);

    useEffect(() => {
        if (!recInitialized && Object.keys(recClusters).length > 0) {
            setExpandedRec(new Set(Object.keys(recClusters)));
            setRecInitialized(true);
        }
    }, [recClusters, recInitialized]);

    const ralTypeOptions = useMemo(() => {
        if (!data || !data.RAL.items) return [];
        const types = new Set(data.RAL.items.map(i => i.ralType).filter(t => t && t !== 'N/A' && t !== 'nan'));
        return Array.from(types).sort();
    }, [data]);

    // ─── Accordion Toggles ───
    const toggleRalCluster = (name: string) => {
        setExpandedRal(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const toggleRecCluster = (name: string) => {
        setExpandedRec(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    // Expand/Collapse all
    const toggleAllRal = () => {
        const allKeys = Object.keys(ralClusters);
        setExpandedRal(prev => prev.size === allKeys.length ? new Set() : new Set(allKeys));
    };

    const toggleAllRec = () => {
        const allKeys = Object.keys(recClusters);
        setExpandedRec(prev => prev.size === allKeys.length ? new Set() : new Set(allKeys));
    };

    // ─── Region Click → Modal ───
    const handleRegionClick = (regionName: string, clusterName: string, allItems: DatasetItem[]) => {
        const regionItems = allItems.filter(i =>
            (i.cluster || "Unknown") === clusterName &&
            ((i as any).cidade || "Unknown") === regionName
        );
        setSelectedCluster({ name: `${clusterName} › ${regionName}`, items: regionItems });
    };

    // ─── Loading ───
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

    // ─── Render Section ───
    const renderSection = (
        title: string,
        items: DatasetItem[],
        clusters: Record<string, number>,
        expanded: Set<string>,
        toggleCluster: (name: string) => void,
        toggleAll: () => void,
        accentColor: string,
        showFilter?: boolean,
    ) => {
        const sortedClusters = Object.keys(clusters).sort();
        const allExpanded = expanded.size === sortedClusters.length;

        return (
            <section className="rounded-lg overflow-hidden"
                style={{
                    background: 'var(--surface-panel)',
                    border: '1px solid var(--border-panel)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                }}>

                {/* Section Header */}
                <div className="flex justify-between items-center px-4 py-3"
                    style={{ background: 'var(--surface-base)', borderBottom: `2px solid ${accentColor}` }}>
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full" style={{ background: accentColor }} />
                        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                            className="text-base sm:text-lg font-bold uppercase tracking-wider">
                            {title}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Expand/Collapse All */}
                        <button
                            onClick={toggleAll}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all cursor-pointer hover:brightness-125"
                            style={{ color: 'var(--text-muted)', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-body)' }}
                        >
                            {allExpanded ? '▼ Recolher' : '► Expandir'}
                        </button>

                        {/* Total */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-semibold uppercase tracking-wider hidden sm:inline"
                                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                                Total
                            </span>
                            <div className="px-3 py-1 rounded"
                                style={{
                                    background: items.length > 50 ? 'var(--status-critical)' : items.length > 20 ? 'var(--status-warn)' : 'var(--status-ok)',
                                    fontFamily: 'var(--font-display)',
                                    color: items.length > 20 ? '#000' : '#fff',
                                    boxShadow: `0 0 12px ${items.length > 50 ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
                                }}>
                                <span className="text-xl font-black">{items.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-4 space-y-2">
                    {/* Filter Chips */}
                    {showFilter && ralTypeOptions.length > 0 && (
                        <div className="mb-2 p-2.5 rounded-lg"
                            style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                            <FilterChips
                                options={ralTypeOptions}
                                selected={selectedRalTypes}
                                onChange={setSelectedRalTypes}
                            />
                        </div>
                    )}

                    {/* Accordion List */}
                    {sortedClusters.map(clusterName => (
                        <ClusterAccordion
                            key={clusterName}
                            clusterName={clusterName}
                            totalCount={clusters[clusterName]}
                            regionCounts={getRegionCounts(items, clusterName)}
                            allClusterItems={items.filter(i => (i.cluster || "Unknown") === clusterName)}
                            isExpanded={expanded.has(clusterName)}
                            onToggle={() => toggleCluster(clusterName)}
                            onRegionClick={(regionName) => handleRegionClick(regionName, clusterName, items)}
                            accentColor={accentColor}
                        />
                    ))}
                </div>
            </section>
        );
    };

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
                        <div className="w-2 h-2 rounded-full animate-live" style={{ background: isRefreshing ? 'var(--status-ok)' : 'var(--accent)' }} />
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

            {/* ═══ MAIN CONTENT ═══ */}
            <main className="p-2 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
                    {renderSection('RAL (RRE)', ralItems, ralClusters, expandedRal, toggleRalCluster, toggleAllRal, '#f59e0b', true)}
                    {renderSection('REC (RRE)', recItems, recClusters, expandedRec, toggleRecCluster, toggleAllRec, '#06b6d4', false)}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
