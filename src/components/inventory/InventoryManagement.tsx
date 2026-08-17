import React, { useState } from 'react';
import {
  Boxes,
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  Download,
  Filter,
  Flame,
  Trash2,
  Edit,
  MoreVertical,
  AlertCircle,
  Package,
} from 'lucide-react';
import { usePOS, BRANCH_MAIN, BRANCH_USA } from '../../context/POSContext';
import { Product, ProductCategory, ShelfLifeType } from '../../types';

export const InventoryManagement: React.FC = () => {
  const { products, transferStock, restockProduct, addProduct, updateProduct, deleteProduct, setIsDatabaseModalOpen } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [onlyFastMoving, setOnlyFastMoving] = useState(false);
  const [inventoryNotice, setInventoryNotice] = useState<string | null>(null);

  // Transfer modal state (between Main and USA branch)
  const [transferModalProduct, setTransferModalProduct] = useState<Product | null>(null);
  const [transferQty, setTransferQty] = useState<number>(10);
  const [transferDirection, setTransferDirection] = useState<'main-to-usa' | 'usa-to-main'>('main-to-usa');

  // Restock modal state
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(50);
  const [restockTarget, setRestockTarget] = useState<'main' | 'usa'>('main');
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  // Delete product confirmation modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Edit product modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Add new product modal
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newProdData, setNewProdData] = useState({
    sku: '',
    barcode: '',
    name: '',
    genericName: '',
    category: 'PPE & Infection Control' as ProductCategory,
    unit: 'box (100s)',
    price: 250,
    costPrice: 180,
    stockMainBranch: 30,
    stockUsaBranch: 20,
    minStockLevel: 15,
    isFastMoving: true,
    shelfLifeType: 'short' as ShelfLifeType,
    batchNumber: `LOT-${new Date().getFullYear()}-01`,
    expiryDate: '2028-12-31',
    fdaRegistrationNo: 'FDA-CDRRHR-2024-001',
    description: '',
  });

  const categories = [
    'All',
    'Chemical & Reagents',
    'Consumables & Accessories',
    'Laboratory Equipment & Glasswares',
    'Medical Footwear & Apparel',
    'Student Clinical Kits',
    'PPE & Infection Control',
    'Diagnostic & Monitoring',
    'Syringes & Needles',
    'Wound Care & Dressings',
    'Surgical Instruments',
    'Sterilization & Antiseptics',
    'IV Therapy & Fluids',
    'Hospital & Clinic Supplies',
  ];

  // Inter-branch stock rebalancing (Main Branch ⇄ USA Branch)
  const handleRebalanceBranches = () => {
    let transferredCount = 0;
    products.forEach((p) => {
      // If USA Branch is low and Main branch has excess stock, transfer
      if (p.stockUsaBranch < p.minStockLevel && p.stockMainBranch > p.minStockLevel * 2) {
        const needed = p.minStockLevel * 2 - p.stockUsaBranch;
        const actual = Math.min(Math.floor(p.stockMainBranch / 2), needed);
        if (actual > 0) {
          transferStock(p.id, 'main', 'usa', actual, 'Auto-Balancing Engine', 'Automated surge rebalance');
          transferredCount++;
        }
      }
    });
    setInventoryNotice(`Inter-Branch Balancing Complete: Rebalanced stock for ${transferredCount} item(s) from Main Branch to USA Branch.`);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      (p.genericName && p.genericName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.fdaRegistrationNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesLow = !onlyLowStock || p.stockMainBranch <= p.minStockLevel || p.stockUsaBranch <= p.minStockLevel;
    const matchesFast = !onlyFastMoving || p.isFastMoving;

    return matchesSearch && matchesCat && matchesLow && matchesFast;
  });

  const handleExecuteTransfer = () => {
    if (!transferModalProduct || transferQty <= 0) return;
    const from = transferDirection === 'main-to-usa' ? 'main' : 'usa';
    const to = transferDirection === 'main-to-usa' ? 'usa' : 'main';
    transferStock(transferModalProduct.id, from, to, transferQty, 'Store Manager', 'Manual inter-branch transfer');
    setInventoryNotice(`Transferred ${transferQty} unit(s) of "${transferModalProduct.name}" from ${from === 'main' ? 'Main Branch' : 'USA Branch'} to ${to === 'main' ? 'Main Branch' : 'USA Branch'}.`);
    setTransferModalProduct(null);
  };

  const handleExecuteRestock = () => {
    if (!restockModalProduct || restockQty <= 0) return;
    restockProduct(
      restockModalProduct.id,
      restockQty,
      restockTarget,
      newBatchNo || undefined,
      newExpiry || undefined
    );
    setInventoryNotice(`Restocked +${restockQty} unit(s) of "${restockModalProduct.name}" into ${restockTarget === 'main' ? 'Main Branch' : 'USA Branch'}.`);
    setRestockModalProduct(null);
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdData.name.trim() || !newProdData.sku.trim()) {
      setFormError('Please provide a product name and SKU.');
      return;
    }
    addProduct(newProdData);
    setInventoryNotice(`Added new medical product: "${newProdData.name}".`);
    setIsAddProductOpen(false);
    setFormError(null);
    // Reset form
    setNewProdData({
      sku: '',
      barcode: '',
      name: '',
      genericName: '',
      category: 'PPE & Infection Control',
      unit: 'box (100s)',
      price: 250,
      costPrice: 180,
      stockMainBranch: 30,
      stockUsaBranch: 20,
      minStockLevel: 15,
      isFastMoving: true,
      shelfLifeType: 'short',
      batchNumber: `LOT-${new Date().getFullYear()}-01`,
      expiryDate: '2028-12-31',
      fdaRegistrationNo: 'FDA-CDRRHR-2024-001',
      description: '',
    });
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct(editingProduct);
    setInventoryNotice(`Updated product details for "${editingProduct.name}".`);
    setEditingProduct(null);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    deleteProduct(productToDelete.id);
    setInventoryNotice(`Deleted product: "${productToDelete.name}".`);
    setProductToDelete(null);
  };

  // Export to CSV / Excel format
  const handleExportCSV = () => {
    const headers = 'SKU,Barcode,Product Name,Generic Name,Category,Unit,Selling Price,Cost Price,Main Branch Stock,USA Branch Stock,Total Stock,Fast Moving,Shelf Life,FDA CPR No,Batch No,Expiry Date\n';
    const rows = products
      .map(
        (p) =>
          `"${p.sku}","${p.barcode}","${p.name.replace(/"/g, '""')}","${(p.genericName || '').replace(/"/g, '""')}","${p.category}","${p.unit}",${p.price},${p.costPrice},${p.stockMainBranch},${p.stockUsaBranch},${p.stockMainBranch + p.stockUsaBranch},${p.isFastMoving ? 'YES' : 'NO'},${p.shelfLifeType},"${p.fdaRegistrationNo}","${p.batchNumber}","${p.expiryDate}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `HENZ_Medical_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 text-[#c9d1d9]">
      {/* Top Banner & Multi-Branch Stock Overview */}
      <div className="bg-[#161b22] p-5 rounded-2xl border border-[#30363d] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Medical Supplies Inventory Management (CRUD)
            </h2>
            <p className="text-xs text-gray-400">
              Live stock across Main Branch (Jalandoni St) ⇄ USA Branch (Univ. of San Agustin Gate 5)
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-inv-db-ledger"
            onClick={() => setIsDatabaseModalOpen(true)}
            className="px-3.5 py-2 bg-teal-950/70 hover:bg-teal-900/80 text-teal-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-teal-500/40 shadow-sm cursor-pointer"
            title="View 1 Central Database status & Inter-Branch Transfer Ledger"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-teal-400" />
            <span>Transfer Ledger & DB</span>
          </button>

          <button
            onClick={handleRebalanceBranches}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            title="Auto-rebalances low-stock items between Main and USA branches"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Inter-Branch Balancing</span>
          </button>

          <button
            onClick={() => setIsAddProductOpen(true)}
            className="px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-[#30363d] shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Medical Item</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-[#0d1117] hover:bg-[#21262d] text-gray-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-[#30363d] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel/CSV</span>
          </button>
        </div>
      </div>

      {/* Inventory Notification Toast/Banner */}
      {inventoryNotice && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{inventoryNotice}</span>
          </div>
          <button
            onClick={() => setInventoryNotice(null)}
            className="text-emerald-400 hover:text-white font-bold ml-3 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Stock Health KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-sm">
          <span className="text-xs text-gray-400 font-medium">Total Registered Medical SKUs</span>
          <div className="text-2xl font-bold text-white mt-1">{products.length} Items</div>
          <span className="text-[11px] text-emerald-400 font-semibold">100% FDA CPR Catalogued</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-sm">
          <span className="text-xs text-gray-400 font-medium">Main Branch Stock</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {products.reduce((acc, p) => acc + (p.stockMainBranch || 0), 0).toLocaleString()} units
          </div>
          <span className="text-[11px] text-gray-400">Casa Conching Bldg., Jalandoni St</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-sm">
          <span className="text-xs text-gray-400 font-medium">USA Branch Stock</span>
          <div className="text-2xl font-bold text-blue-400 font-mono mt-1">
            {products.reduce((acc, p) => acc + (p.stockUsaBranch || 0), 0).toLocaleString()} units
          </div>
          <span className="text-[11px] text-gray-400">USA Gate 5 (Gym Front)</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-sm">
          <span className="text-xs text-gray-400 font-medium">Fast Moving Peak Supplies</span>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
            {products.filter((p) => p.isFastMoving).length} SKUs
          </div>
          <span className="text-[11px] text-amber-300 font-semibold">School Opening High Demand</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#161b22] p-4 rounded-2xl border border-[#30363d] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, generic, SKU, barcode, FDA #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500 placeholder:text-gray-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setOnlyLowStock((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                onlyLowStock
                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/50'
                  : 'bg-[#0d1117] text-gray-400 hover:bg-[#21262d] hover:text-gray-200 border-[#30363d]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Low Stock Alerts</span>
            </button>

            <button
              onClick={() => setOnlyFastMoving((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                onlyFastMoving
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                  : 'bg-[#0d1117] text-gray-400 hover:bg-[#21262d] hover:text-gray-200 border-[#30363d]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Fast Moving Only</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                  : 'bg-[#0d1117] text-gray-400 hover:bg-[#21262d] hover:text-gray-200 border-[#30363d]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table with CRUD Options */}
      <div className="bg-[#161b22] rounded-2xl border border-[#30363d] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] border-b border-[#30363d] text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Item & FDA CPR #</th>
                <th className="py-3 px-3">Barcode / SKU</th>
                <th className="py-3 px-3">Category / Unit</th>
                <th className="py-3 px-3 text-right">Price / Cost</th>
                <th className="py-3 px-3 text-center">Main Branch</th>
                <th className="py-3 px-3 text-center">USA Branch</th>
                <th className="py-3 px-3">Batch & Expiry</th>
                <th className="py-3 px-4 text-center">Actions & Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]">
              {filteredProducts.map((p) => {
                const isMainLow = p.stockMainBranch <= p.minStockLevel;
                const isUsaLow = p.stockUsaBranch <= p.minStockLevel;

                return (
                  <tr key={p.id} className="hover:bg-[#1a202c] transition">
                    {/* Name & FDA CPR */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white line-clamp-1">{p.name}</div>
                      {p.genericName && (
                        <div className="text-[10px] text-gray-400 italic">Gen: {p.genericName}</div>
                      )}
                      <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-emerald-400 font-medium">{p.fdaRegistrationNo}</span>
                        {p.isFastMoving && (
                          <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-1 rounded border border-amber-500/30">
                            Fast Moving
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-300">
                      <div>{p.barcode}</div>
                      <div className="text-[10px] text-gray-500">{p.sku}</div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <div className="text-gray-200">{p.category}</div>
                      <div className="text-[10px] text-gray-500">Unit: {p.unit}</div>
                    </td>

                    {/* Pricing */}
                    <td className="py-3 px-3 text-right font-mono">
                      <div className="font-bold text-white">₱{p.price}</div>
                      <div className="text-[10px] text-gray-500">Cost: ₱{p.costPrice}</div>
                    </td>

                    {/* Main Branch Stock */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold font-mono text-xs border ${
                          p.stockMainBranch === 0
                            ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                            : isMainLow
                            ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {p.stockMainBranch}
                      </span>
                    </td>

                    {/* USA Branch Stock */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold font-mono text-xs border ${
                          p.stockUsaBranch === 0
                            ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                            : isUsaLow
                            ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                            : 'bg-blue-950/50 text-blue-400 border-blue-500/40'
                        }`}
                      >
                        {p.stockUsaBranch}
                      </span>
                    </td>

                    {/* Batch & Expiry */}
                    <td className="py-3 px-3 text-[11px]">
                      <div className="font-mono text-gray-300">{p.batchNumber}</div>
                      <div className="text-[10px] text-gray-500 font-mono">Exp: {p.expiryDate}</div>
                    </td>

                    {/* Actions: Transfer, Restock, Edit, Delete */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setTransferModalProduct(p);
                            setTransferQty(Math.min(10, Math.max(p.stockMainBranch, p.stockUsaBranch)));
                          }}
                          className="p-1.5 bg-[#0d1117] hover:bg-[#21262d] text-gray-300 rounded-lg transition border border-[#30363d] cursor-pointer"
                          title="Transfer between Main Branch and USA Branch"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                        </button>

                        <button
                          onClick={() => {
                            setRestockModalProduct(p);
                            setNewBatchNo(p.batchNumber);
                            setNewExpiry(p.expiryDate);
                          }}
                          className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 rounded-lg transition cursor-pointer"
                          title="Restock new batch from supplier"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        </button>

                        <button
                          onClick={() => setEditingProduct({ ...p })}
                          className="p-1.5 bg-[#0d1117] hover:bg-[#21262d] text-blue-300 border border-[#30363d] hover:border-blue-500/50 rounded-lg transition cursor-pointer"
                          title="Edit product details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setProductToDelete(p)}
                          className="p-1.5 bg-[#0d1117] hover:bg-rose-950/60 text-rose-400 border border-[#30363d] hover:border-rose-500/50 rounded-lg transition cursor-pointer"
                          title="Delete product from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Transfer Modal (Main Branch ⇄ USA Branch) */}
      {transferModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-md rounded-2xl shadow-2xl border border-[#30363d] p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#30363d]">
              <h3 className="text-sm font-bold text-white">Inter-Branch Stock Transfer</h3>
              <button onClick={() => setTransferModalProduct(null)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition cursor-pointer">
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-white">{transferModalProduct.name}</p>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Main Branch: <strong className="text-emerald-400 font-mono">{transferModalProduct.stockMainBranch}</strong></span>
                <span>USA Branch: <strong className="text-blue-400 font-mono">{transferModalProduct.stockUsaBranch}</strong></span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Transfer Direction:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferDirection('main-to-usa')}
                  className={`p-2.5 text-xs font-bold rounded-xl border text-left cursor-pointer transition ${
                    transferDirection === 'main-to-usa'
                      ? 'border-emerald-500 bg-emerald-950/40 text-white ring-1 ring-emerald-500'
                      : 'border-[#30363d] bg-[#0d1117] text-gray-300 hover:bg-[#21262d]'
                  }`}
                >
                  Main Branch → USA Branch
                </button>
                <button
                  type="button"
                  onClick={() => setTransferDirection('usa-to-main')}
                  className={`p-2.5 text-xs font-bold rounded-xl border text-left cursor-pointer transition ${
                    transferDirection === 'usa-to-main'
                      ? 'border-emerald-500 bg-emerald-950/40 text-white ring-1 ring-emerald-500'
                      : 'border-[#30363d] bg-[#0d1117] text-gray-300 hover:bg-[#21262d]'
                  }`}
                >
                  USA Branch → Main Branch
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Transfer Quantity (Units):</label>
              <input
                type="number"
                min={1}
                max={transferDirection === 'main-to-usa' ? transferModalProduct.stockMainBranch : transferModalProduct.stockUsaBranch}
                value={transferQty}
                onChange={(e) => setTransferQty(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-[#0a0b0d] text-white border border-[#30363d] rounded-xl font-bold font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#30363d]">
              <button
                onClick={() => setTransferModalProduct(null)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-semibold border border-[#30363d] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTransfer}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-950/40"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-md rounded-2xl shadow-2xl border border-[#30363d] p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#30363d]">
              <h3 className="text-sm font-bold text-white">Receive Supplier Restock</h3>
              <button onClick={() => setRestockModalProduct(null)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition cursor-pointer">
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-white">{restockModalProduct.name}</p>
              <p className="text-[11px] text-gray-400 font-mono">SKU: {restockModalProduct.sku}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Restock Destination:</label>
                <select
                  value={restockTarget}
                  onChange={(e) => setRestockTarget(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="main">Main Branch (Jalandoni St)</option>
                  <option value="usa">USA Branch (Gate 5 Gym)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Units Received:</label>
                <input
                  type="number"
                  min={1}
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0a0b0d] text-white border border-[#30363d] rounded-lg font-bold font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Batch / Lot No:</label>
                <input
                  type="text"
                  value={newBatchNo}
                  onChange={(e) => setNewBatchNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Expiry Date:</label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#30363d]">
              <button
                onClick={() => setRestockModalProduct(null)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-semibold border border-[#30363d] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRestock}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-950/40"
              >
                Record Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-xl rounded-2xl shadow-2xl border border-[#30363d] p-6 space-y-4 my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-[#30363d]">
              <h3 className="text-base font-bold text-white">Edit Medical Supply Product</h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={editingProduct.genericName || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, genericName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Category</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Barcode (EAN-13)</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.barcode}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Packaging Unit</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Retail Price (₱) *</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Cost Price (₱)</label>
                  <input
                    type="number"
                    value={editingProduct.costPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Main Branch Stock</label>
                  <input
                    type="number"
                    value={editingProduct.stockMainBranch}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockMainBranch: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-emerald-400 font-bold border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">USA Branch Stock</label>
                  <input
                    type="number"
                    value={editingProduct.stockUsaBranch}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockUsaBranch: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-blue-400 font-bold border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Min. Alert Level</label>
                  <input
                    type="number"
                    value={editingProduct.minStockLevel}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStockLevel: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">FDA CPR / License #</label>
                  <input
                    type="text"
                    value={editingProduct.fdaRegistrationNo}
                    onChange={(e) => setEditingProduct({ ...editingProduct, fdaRegistrationNo: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    value={editingProduct.batchNumber}
                    onChange={(e) => setEditingProduct({ ...editingProduct, batchNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editingProduct.expiryDate}
                    onChange={(e) => setEditingProduct({ ...editingProduct, expiryDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFastMoving}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isFastMoving: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Mark as Fast-Moving High Demand Product</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-semibold border border-[#30363d] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-950/40"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-md rounded-2xl shadow-2xl border border-rose-500/40 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-950/60 rounded-xl border border-rose-500/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Medical Product?</h3>
                <p className="text-xs text-gray-400">This action will remove the product from the catalog.</p>
              </div>
            </div>

            <div className="bg-[#0d1117] p-3.5 rounded-xl border border-[#30363d] space-y-1 text-xs">
              <div className="font-bold text-white">{productToDelete.name}</div>
              <div className="text-gray-400 font-mono">SKU: {productToDelete.sku} | Barcode: {productToDelete.barcode}</div>
              <div className="text-gray-400">Main Stock: {productToDelete.stockMainBranch} | USA Stock: {productToDelete.stockUsaBranch}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#30363d]">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-semibold border border-[#30363d] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-rose-950/40"
              >
                Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Medical Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-xl rounded-2xl shadow-2xl border border-[#30363d] p-6 space-y-4 my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-[#30363d]">
              <h3 className="text-base font-bold text-white">Add New Medical Product SKU</h3>
              <button onClick={() => setIsAddProductOpen(false)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sterile Latex Surgical Gloves"
                    value={newProdData.name}
                    onChange={(e) => setNewProdData({ ...newProdData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Generic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Disposable Examination Gloves"
                    value={newProdData.genericName}
                    onChange={(e) => setNewProdData({ ...newProdData, genericName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Category</label>
                  <select
                    value={newProdData.category}
                    onChange={(e) => setNewProdData({ ...newProdData, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Barcode (EAN-13)</label>
                  <input
                    type="text"
                    required
                    placeholder="4806500123456"
                    value={newProdData.barcode}
                    onChange={(e) => setNewProdData({ ...newProdData, barcode: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="GLV-SURG-75"
                    value={newProdData.sku}
                    onChange={(e) => setNewProdData({ ...newProdData, sku: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Packaging Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="box (50 pairs)"
                    value={newProdData.unit}
                    onChange={(e) => setNewProdData({ ...newProdData, unit: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Retail Price (₱) *</label>
                  <input
                    type="number"
                    required
                    value={newProdData.price}
                    onChange={(e) => setNewProdData({ ...newProdData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Cost Price (₱)</label>
                  <input
                    type="number"
                    value={newProdData.costPrice}
                    onChange={(e) => setNewProdData({ ...newProdData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Initial Main Branch Stock</label>
                  <input
                    type="number"
                    value={newProdData.stockMainBranch}
                    onChange={(e) => setNewProdData({ ...newProdData, stockMainBranch: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-emerald-400 font-bold border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Initial USA Branch Stock</label>
                  <input
                    type="number"
                    value={newProdData.stockUsaBranch}
                    onChange={(e) => setNewProdData({ ...newProdData, stockUsaBranch: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-blue-400 font-bold border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Min. Alert Level</label>
                  <input
                    type="number"
                    value={newProdData.minStockLevel}
                    onChange={(e) => setNewProdData({ ...newProdData, minStockLevel: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">FDA CPR / License #</label>
                  <input
                    type="text"
                    value={newProdData.fdaRegistrationNo}
                    onChange={(e) => setNewProdData({ ...newProdData, fdaRegistrationNo: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    value={newProdData.batchNumber}
                    onChange={(e) => setNewProdData({ ...newProdData, batchNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newProdData.expiryDate}
                    onChange={(e) => setNewProdData({ ...newProdData, expiryDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProdData.isFastMoving}
                    onChange={(e) => setNewProdData({ ...newProdData, isFastMoving: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Mark as Fast-Moving High Demand Product</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-semibold border border-[#30363d] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-950/40"
                >
                  Save Product to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
