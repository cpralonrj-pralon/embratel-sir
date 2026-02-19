import { useState, useMemo } from 'react';
import { FilterBar } from './components/FilterBar';
import { DataTable } from './components/DataTable';
import { mockRecoveryItems } from './data/mockData';
import { groupItemsByDesignationAndType } from './utils/grouping';

import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';

function App() {
  const [isGrouped, setIsGrouped] = useState(false);

  // Group items if view mode is enabled
  const visibleItems = useMemo(() => {
    if (isGrouped) {
      return groupItemsByDesignationAndType(mockRecoveryItems);
    }
    return mockRecoveryItems;
  }, [isGrouped]);

  const ListView = () => (
    <div className="flex flex-col h-full">
      <FilterBar
        isGrouped={isGrouped}
        onToggleGrouping={() => setIsGrouped(!isGrouped)}
      />
      <div className="flex-1 overflow-hidden">
        <DataTable
          items={visibleItems}
          viewMode={isGrouped ? 'grouped' : 'list'}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen min-w-[1024px] bg-white">
      <nav className="bg-gray-800 text-white p-4 flex gap-4">
        <Link to="/" className="hover:text-gray-300 font-bold">Lista</Link>
        <Link to="/dashboard" className="hover:text-gray-300 font-bold">Dashboard</Link>
      </nav>
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<ListView />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
