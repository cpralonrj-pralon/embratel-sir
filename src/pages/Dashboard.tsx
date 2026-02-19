import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Types derived from the new JSON structure
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
    clusters: Record<string, number>; // Original pre-calculated clusters (can be used as fallback or initial)
    items: DatasetItem[]; // New list for filtering
}

interface DashboardData {
    updatedAt: string;
    RAL: DatasetStats;
    REC: DatasetStats;
}

// Mock data for charts
const mockChartData = [
    { name: 'RT/VTA/JM/OUT/SW', value: 1 },
    { name: 'RT/RJO/AM/VIV/SW', value: 1 },
    { name: 'RT/VTA/JM/VIV/SW', value: 5 },
    { name: 'RT/RJO/AM/OUT/SW', value: 9 },
];

const mockRecChartData = [
    { name: 'RT/VTA/JM/VIV/SW', value: 1 },
];

const COLORS = ['#4ade80', '#4ade80', '#4ade80', '#fbbf24'];

const DATA_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos em ms

const CustomBarChart = ({ data, colors }: { data: any[], colors: string[] }) => (
    <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                    itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
);

const FilterChips = ({ options, selected, onChange }: { options: string[], selected: string[], onChange: (val: string[]) => void }) => {
    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wide mr-1">Tipo RAL:</span>
            {options.map((option) => (
                <button
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${selected.length === 0 || selected.includes(option)
                            ? 'bg-yellow-600 text-white border-yellow-500 shadow-md'
                            : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:bg-gray-600 hover:text-gray-200'
                        }`}
                >
                    {option}
                </button>
            ))}
            {selected.length > 0 && (
                <button
                    onClick={() => onChange([])}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-800 transition-all"
                >
                    ✕ Limpar
                </button>
            )}
        </div>
    );
};

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-700 bg-gray-900">
                    <h2 className="text-sm sm:text-xl font-bold text-white uppercase tracking-wider">
                        Detalhes: <span className="text-yellow-500">{clusterName}</span> ({items.length})
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2" aria-label="Fechar Detalhes">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="overflow-auto p-2 sm:p-4 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-xs uppercase bg-gray-700/50 sticky top-0">
                                <th className="p-3 font-semibold">Cidade</th>
                                <th className="p-3 font-semibold">Código</th>
                                <th className="p-3 font-semibold">Tipo / Cliente</th>
                                <th className="p-3 font-semibold">Data Abertura</th>
                                <th className="p-3 font-semibold">Duração</th>
                                <th className="p-3 font-semibold">Recuperação</th>
                                <th className="p-3 font-semibold">Descrição</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 text-sm text-gray-300">
                            {items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                                    <td className="p-3 border-l-2 border-yellow-600/50 bg-yellow-900/10 font-bold text-white text-[11px] uppercase tracking-tighter whitespace-nowrap">{(item as any).cidade || 'N/A'}</td>
                                    <td className="p-3 font-mono text-yellow-500 font-bold">{item.code || 'N/A'}</td>
                                    <td className="p-3">{item.ralType}</td>
                                    <td className="p-3 whitespace-nowrap">{item.date}</td>
                                    <td className="p-3">{item.duration}</td>
                                    <td className="p-3">{item.num}</td>
                                    <td className="p-3 text-xs text-gray-400 max-w-xs truncate" title={item.description}>{item.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-700 bg-gray-900 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-bold transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [selectedRalTypes, setSelectedRalTypes] = useState<string[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Modal State
    const [selectedCluster, setSelectedCluster] = useState<{ name: string, items: DatasetItem[] } | null>(null);

    // --- Load Data via Fetch ---
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

    // --- Data Processing Helpers ---
    const getFilteredItems = (dataset: DatasetStats, filterTypes: string[]) => {
        if (!dataset.items) return [];
        if (filterTypes.length === 0) return dataset.items;
        return dataset.items.filter(item => filterTypes.includes(item.ralType));
    };

    const ralItems = useMemo(() => data ? getFilteredItems(data.RAL, selectedRalTypes) : [], [data, selectedRalTypes]);
    const recItems = useMemo(() => data ? getFilteredItems(data.REC, []) : [], [data]);

    // Grouping for counts
    const getClusterCounts = (items: DatasetItem[]) => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
            const c = item.cluster || "Unknown";
            counts[c] = (counts[c] || 0) + 1;
        });
        return counts;
    };

    const ralClusters = useMemo(() => getClusterCounts(ralItems), [ralItems]);
    const recClusters = useMemo(() => getClusterCounts(recItems), [recItems]);


    // --- Extract Unique Options ---
    const ralTypeOptions = useMemo(() => {
        if (!data || !data.RAL.items) return [];
        const types = new Set(data.RAL.items.map(i => i.ralType).filter(t => t && t !== 'N/A' && t !== 'nan'));
        return Array.from(types).sort();
    }, [data]);



    if (!data) return <div className="p-8 text-white">Carregando painel...</div>;

    const getCardColor = (count: number) => {
        if (count === 0) return 'bg-green-900';
        if (count < 5) return 'bg-green-700';
        if (count < 10) return 'bg-yellow-600';
        return 'bg-red-700';
    };

    // Helper to detect if a cluster has critical items (SWAP/RUP > 12h)
    const isClusterCritical = (items: DatasetItem[]) => {
        return items.some(item => {
            const desc = (item.description || "").toUpperCase();
            const duration = item.duration || "";

            // Keywords
            const isTargetType = desc.includes("SWAP") || desc.includes("RUP CABO");
            if (!isTargetType) return false;

            // Duration check: "31d.04h12m" or "0d.13h00m"
            // We look for any day > 0 OR hours >= 12
            try {
                const parts = duration.split('.');
                if (parts.length < 2) return false;

                const days = parseInt(parts[0].replace('d', '')) || 0;
                const hours = parseInt(parts[1].substring(0, 2)) || 0;

                return days > 0 || hours >= 12;
            } catch (e) {
                return false;
            }
        });
    };

    const handleCardClick = (cluster: string, allItems: DatasetItem[]) => {
        const clusterItems = allItems.filter(i => (i.cluster || "Unknown") === cluster);
        setSelectedCluster({ name: cluster, items: clusterItems });
    };

    const renderClusterGrid = (clusters: Record<string, number>, sourceItems: DatasetItem[]) => {
        const sortedKeys = Object.keys(clusters).sort();

        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sortedKeys.map((key) => {
                    const clusterItems = sourceItems.filter(i => (i.cluster || "Unknown") === key);
                    const isCritical = isClusterCritical(clusterItems);

                    return (
                        <div
                            key={key}
                            onClick={() => handleCardClick(key, sourceItems)}
                            className={`${getCardColor(clusters[key])} ${isCritical ? 'alert-glow scale-105 z-10' : ''} p-2 sm:p-3 rounded-lg shadow-lg border-b-4 border-black/20 transform transition-all hover:brightness-110 hover:-translate-y-1 active:border-b-0 active:translate-y-0 cursor-pointer flex flex-col items-center justify-center min-h-[70px] sm:min-h-[90px] group`}
                        >
                            <span className="text-[10px] font-bold text-gray-100 uppercase text-center mb-1 tracking-wider group-hover:text-white">
                                {isCritical && "🚨 "}{key}
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">{clusters[key]}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 p-2 sm:p-4 font-sans">
            {selectedCluster && (
                <DetailsModal
                    clusterName={selectedCluster.name}
                    items={selectedCluster.items}
                    onClose={() => setSelectedCluster(null)}
                />
            )}

            <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-700 pb-3 sm:pb-4 sticky top-0 bg-gray-900 z-10 shadow-lg">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wide">Painel de Monitoração - SIR</h1>
                </div>
                <span className="text-gray-400 text-[10px] sm:text-xs flex items-center gap-2">
                    {isRefreshing && <span className="animate-pulse text-green-400">●</span>}
                    Atualizado em: {data.updatedAt}
                </span>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">

                {/* RAL SECTION */}
                <section className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700 shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">RAL (RRE)</h2>
                        <div className="bg-red-900 text-white px-4 py-2 rounded text-2xl font-bold border border-red-700 shadow-md">
                            {ralItems.length}
                        </div>
                    </div>

                    {/* FILTER CHIPS - always visible */}
                    {ralTypeOptions.length > 0 && (
                        <div className="mb-4 p-2 sm:p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                            <FilterChips
                                options={ralTypeOptions}
                                selected={selectedRalTypes}
                                onChange={setSelectedRalTypes}
                            />
                        </div>
                    )}

                    <div className="mt-4">
                        <h3 className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Por Cluster</h3>
                        {renderClusterGrid(ralClusters, ralItems)}
                    </div>

                    <div className="mt-6 border-t border-gray-700 pt-4">
                        <h3 className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">PAINEL RAL - SWAP RRE</h3>
                        <CustomBarChart data={mockChartData} colors={COLORS} />
                    </div>
                </section>

                {/* REC SECTION */}
                <section className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">REC (RRE)</h2>
                        <div className="bg-red-900 text-white px-4 py-2 rounded text-2xl font-bold border border-red-700 shadow-md">
                            {recItems.length}
                        </div>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Por Cluster</h3>
                        {renderClusterGrid(recClusters, recItems)}
                    </div>

                    <div className="mt-6 border-t border-gray-700 pt-4">
                        <h3 className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">PAINEL REC - SWAP RRE</h3>
                        <CustomBarChart data={mockRecChartData} colors={['#4ade80']} />
                    </div>
                </section>

            </div>
        </div>
    );
};

export default Dashboard;
