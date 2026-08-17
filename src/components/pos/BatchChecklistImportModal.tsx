import React, { useState } from 'react';
import { ClipboardCheck, X, Plus, Search, CheckSquare, Square } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { ProductCategory } from '../../types';

interface BatchChecklistImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchChecklistImportModal: React.FC<BatchChecklistImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, addToCart } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const categories: string[] = [
    'All',
    'Diagnostic & Monitoring',
    'Surgical Instruments',
    'Wound Care & Dressings',
    'PPE & Infection Control',
    'Syringes & Needles',
    'Sterilization & Antiseptics',
    'IV Therapy & Fluids',
    'Hospital & Clinic Supplies',
  ];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.genericName && p.genericName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleSelect = (productId: string) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[productId]) {
        delete copy[productId];
      } else {
        copy[productId] = 1;
      }
      return copy;
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedItems((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } else {
      setSelectedItems((prev) => ({
        ...prev,
        [productId]: qty,
      }));
    }
  };

  const handleImportAll = () => {
    const entries = Object.entries(selectedItems);
    entries.forEach(([productId, qty]) => {
      const numQty = Number(qty);
      const product = products.find((p) => p.id === productId);
      if (product && numQty > 0) {
        addToCart(product, numQty);
      }
    });
    setSelectedItems({});
    onClose();
  };

  const totalSelectedCount = Object.keys(selectedItems).length;
  const totalItemUnits = Object.values(selectedItems).reduce((a, b) => Number(a) + Number(b), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-3xl rounded-2xl shadow-2xl border border-[#30363d] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0d1117] text-white px-6 py-4 flex items-center justify-between border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Bulk Checklist Multi-Item Adder</h3>
              <p className="text-xs text-gray-400">
                Quickly tick items from customer paper checklist (solves 50+ item slow checkout)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#21262d] transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-[#30363d] bg-[#0d1117] flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search medical supply..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500 placeholder:text-gray-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                    : 'bg-[#0a0b0d] text-gray-400 hover:bg-[#21262d] hover:text-gray-200 border-[#30363d]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Items List */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#161b22]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredProducts.map((p) => {
              const isSelected = selectedItems[p.id] !== undefined;
              const qty = selectedItems[p.id] || 1;

              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/80 shadow-sm'
                      : 'bg-[#0d1117] border-[#30363d] hover:border-gray-600 hover:bg-[#1a202c]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="text-emerald-400 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 fill-emerald-950 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span className="font-mono text-gray-500">{p.sku}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-400 font-mono">₱{p.price}</span>
                        <span>/ {p.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity adjustment if selected */}
                  {isSelected && (
                    <div
                      className="flex items-center gap-1 bg-[#0a0b0d] border border-emerald-500/50 rounded-lg p-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => updateQuantity(p.id, qty - 1)}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-300 hover:bg-[#21262d] rounded"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white font-mono">{qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(p.id, qty + 1)}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-300 hover:bg-[#21262d] rounded"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0d1117] px-6 py-3 border-t border-[#30363d] flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Selected: <span className="font-bold text-white">{totalSelectedCount} products</span> ({totalItemUnits} total units)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg text-xs font-semibold transition border border-[#30363d] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImportAll}
              disabled={totalSelectedCount === 0}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                totalSelectedCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                  : 'bg-[#21262d] text-gray-500 border border-[#30363d] cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Import to Current Cart ({totalSelectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
