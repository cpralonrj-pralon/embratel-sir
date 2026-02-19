import React from 'react';
import type { RecoveryItem } from '../types';
import type { GroupedItem } from '../utils/grouping';

interface DataTableProps {
    items: RecoveryItem[] | GroupedItem[];
    viewMode: 'list' | 'grouped';
}

export const DataTable: React.FC<DataTableProps> = ({ items, viewMode }) => {
    return (
        <div className="flex flex-col h-full text-xs font-sans">
            {/* Header Bar */}
            <div
                className="px-2 py-1 font-bold text-black border-b border-gray-400"
                style={{ backgroundColor: '#FF8080' }}
            >
                {viewMode === 'list'
                    ? `Itens Recebidos pelo Centro Funcional - Total: ${items.length} itens`
                    : `Resumo por Designação - Total: ${items.length} grupos`
                }
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        {viewMode === 'list' ? (
                            <tr>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal w-6 text-center"></th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal w-12 text-center">Prior.</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal w-12 text-center">Pontos</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal">Num.Recup.</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal">Cliente</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal">Designação</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal w-24">Abertura</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal">CF Exec.</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal w-8">Resp.</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal w-8">Técn.</th>
                            </tr>
                        ) : (
                            <tr>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal">Designação</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal w-24">Tipo</th>
                                <th className="border border-gray-400 px-1 py-0.5 font-normal w-24 text-right">Quantidade</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            if (viewMode === 'list') {
                                const i = item as RecoveryItem;
                                return (
                                    <tr key={i.id} className="even:bg-gray-100 hover:bg-blue-50">
                                        <td className="border border-gray-400 px-1 py-0.5 text-center text-gray-600">{index + 1}</td>
                                        <td className="border border-gray-400 px-1 py-0.5 text-right">{i.priority}</td>
                                        <td className="border border-gray-400 px-1 py-0.5 text-right font-bold text-gray-700">{i.points}</td>
                                        <td className="border border-gray-400 px-1 py-0.5">
                                            <a href="#" className="text-blue-700 hover:underline">{i.recoveryNumber}</a>
                                        </td>
                                        <td className="border border-gray-400 px-1 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                                            {i.client}
                                        </td>
                                        <td className="border border-gray-400 px-1 py-0.5">
                                            <a href="#" className="text-blue-700 hover:underline">{i.designation}</a>
                                        </td>
                                        <td className="border border-gray-400 px-1 py-0.5 text-center">{i.openingDate}</td>
                                        <td className="border border-gray-400 px-1 py-0.5 truncate max-w-[200px]" title={i.executingCF}>
                                            {i.executingCF}
                                        </td>
                                        <td className="border border-gray-400 px-1 py-0.5 text-center">{i.responsible}</td>
                                        <td className="border border-gray-400 px-1 py-0.5">{i.technician}</td>
                                    </tr>
                                );
                            } else {
                                const g = item as GroupedItem;
                                return (
                                    <tr key={`${g.designation}-${g.type}`} className="even:bg-gray-100 hover:bg-blue-50">
                                        <td className="border border-gray-400 px-1 py-0.5">
                                            <a href="#" className="text-blue-700 hover:underline">{g.designation}</a>
                                        </td>
                                        <td className="border border-gray-400 px-1 py-0.5">
                                            <span className={`px-1 rounded text-[10px] font-bold ${g.type === 'REC' ? 'bg-blue-100 text-blue-800' :
                                                    g.type === 'RAL' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100'
                                                }`}>
                                                {g.type}
                                            </span>
                                        </td>
                                        <td className="border border-gray-400 px-1 py-0.5 text-right font-bold">{g.count}</td>
                                    </tr>
                                );
                            }
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
