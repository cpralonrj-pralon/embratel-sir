import React from 'react';
import { Search } from 'lucide-react';

interface FilterBarProps {
    onToggleGrouping: () => void;
    isGrouped: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({ onToggleGrouping, isGrouped }) => {
    return (
        <div className="bg-gray-300 p-2 text-xs font-sans border-b border-gray-400">
            <div className="grid grid-cols-[1fr_auto] gap-4">
                {/* Left Section: Inputs */}
                <div className="space-y-1">
                    {/* Row 1 */}
                    <div className="flex items-center gap-2">
                        <label className="font-bold w-20 text-right">Tipo:</label>
                        <select className="border border-gray-500 rounded-sm px-1 h-5 w-32">
                            <option value="REC">REC</option>
                        </select>

                        <div className="flex items-center gap-2 ml-10">
                            <label className="font-bold">Abertura:</label>
                            <input type="text" className="border border-gray-500 w-8 h-5 px-1" />
                            <span>/</span>
                            <input type="text" className="border border-gray-500 w-8 h-5 px-1" />
                            <span>/</span>
                            <input type="text" className="border border-gray-500 w-12 h-5 px-1" />

                            <span className="mx-2">a</span>

                            <input type="text" className="border border-gray-500 w-8 h-5 px-1" />
                            <span>/</span>
                            <input type="text" className="border border-gray-500 w-8 h-5 px-1" />
                            <span>/</span>
                            <input type="text" className="border border-gray-500 w-12 h-5 px-1" />
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="flex items-center gap-2">
                        <label className="font-bold w-20 text-right">Nome Cliente:</label>
                        <input type="text" className="border border-gray-500 w-48 h-5 px-1" />

                        <label className="font-bold ml-2">Segmento:</label>
                        <input type="text" className="border border-gray-500 w-24 h-5 px-1" />

                        <label className="font-bold ml-4">CF. Exec:</label>
                        <div className="relative flex items-center">
                            <select className="border border-gray-500 w-32 h-5 px-1 appearance-none">
                                <option></option>
                            </select>
                            <Search className="w-4 h-4 text-green-700 absolute -right-5 cursor-pointer" />
                        </div>
                    </div>

                    {/* Row 3 */}
                    <div className="flex items-center gap-2">
                        <label className="font-bold w-20 text-right">Login do Técnico:</label>
                        <input type="text" className="border border-gray-500 w-32 h-5 px-1" />

                        <button className="bg-steelblue text-white px-2 h-5 text-xs rounded-sm hover:bg-blue-700 ml-2" style={{ backgroundColor: '#4682B4' }}>
                            Ativar Alerta
                        </button>
                    </div>
                </div>

                {/* Right Section: Checkboxes and Action Buttons */}
                <div className="flex flex-col justify-between items-end">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" defaultChecked />
                            <span className="font-bold">Recebidos</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" />
                            <span>Ocultar Assumidos</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" />
                            <span>Meus</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" />
                            <span>Enviados</span>
                        </label>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button className={`${isGrouped ? 'bg-green-600' : 'bg-gray-500'} text-white px-3 py-0.5 rounded-sm hover:opacity-90 text-xs font-bold transition-colors`}
                            onClick={onToggleGrouping}
                            title="Alternar visualização agrupada"
                        >
                            Agrupar
                        </button>
                        <button className="bg-blue-600 text-white px-3 py-0.5 rounded-sm hover:bg-blue-700 text-xs font-bold" style={{ backgroundColor: '#4682B4' }}>
                            Exibir
                        </button>
                        <button className="bg-blue-600 text-white px-3 py-0.5 rounded-sm hover:bg-blue-700 text-xs font-bold" style={{ backgroundColor: '#4682B4' }}>
                            Limpar
                        </button>
                        <button className="bg-blue-600 text-white px-3 py-0.5 rounded-sm hover:bg-blue-700 text-xs font-bold" style={{ backgroundColor: '#4682B4' }}>
                            Sair
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
