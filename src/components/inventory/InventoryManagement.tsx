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
  QrCode,
  Wand2,
  Printer,
} from 'lucide-react';
import { usePOS, branchShortLabel } from '../../context/POSContext';
import { BranchKey, Product, ProductCategory, ShelfLifeType } from '../../types';
import { uniqueEan13 } from '../../lib/barcode';
import { printProductLabels, LabelSymbology } from '../../utils/printLabel';
import { QRCodeRenderer } from '../common/QRCodeRenderer';
import { BarcodeRenderer } from '../common/BarcodeRenderer';

export const InventoryManagement: React.FC = () => {
  const { products, transferStock, restockProduct, addProduct, updateProduct, deleteProduct, setIsDatabaseModalOpen } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [onlyFastMoving, setOnlyFastMoving] = useState(false);
  const [inventoryNotice, setInventoryNotice] = useState<string | null>(null);

  // Transfer modal state (between the Main and D'Jabez branches)
  const [transferModalProduct, setTransferModalProduct] = useState<Product | null>(null);
  const [transferQty, setTransferQty] = useState<number>(10);
  const [transferDirection, setTransferDirection] = useState<'main-to-djabez' | 'djabez-to-main'>('main-to-djabez');

  // Restock modal state
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(50);
  const [restockTarget, setRestockTarget] = useState<BranchKey>('main');
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  // Delete product confirmation modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Edit product modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Barcode label print modal
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const [labelStyle, setLabelStyle] = useState<LabelSymbology>('qr');
  const [labelCopies, setLabelCopies] = useState<number>(1);

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

  // Inter-branch stock rebalancing (Main Branch ⇄ D'Jabez Branch)
  const handleRebalanceBranches = () => {
    let transferredCount = 0;
    products.forEach((p) => {
      // If D'Jabez Branch is low and Main branch has excess stock, transfer
      if (p.stockUsaBranch < p.minStockLevel && p.stockMainBranch > p.minStockLevel * 2) {
        const needed = p.minStockLevel * 2 - p.stockUsaBranch;
        const actual = Math.min(Math.floor(p.stockMainBranch / 2), needed);
        if (actual > 0) {
          transferStock(p.id, 'main', 'djabez', actual, 'Auto-Balancing Engine', 'Automated surge rebalance');
          transferredCount++;
        }
      }
    });
    setInventoryNotice(`Inter-Branch Balancing Complete: Rebalanced stock for ${transferredCount} item(s) from Main Branch to D'Jabez Branch.`);
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
    const from: BranchKey = transferDirection === 'main-to-djabez' ? 'main' : 'djabez';
    const to: BranchKey = transferDirection === 'main-to-djabez' ? 'djabez' : 'main';
    transferStock(transferModalProduct.id, from, to, transferQty, 'Store Manager', 'Manual inter-branch transfer');
    setInventoryNotice(`Transferred ${transferQty} unit(s) of "${transferModalProduct.name}" from ${branchShortLabel[from]} to ${branchShortLabel[to]}.`);
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
    setInventoryNotice(`Restocked +${restockQty} unit(s) of "${restockModalProduct.name}" into ${branchShortLabel[restockTarget]}.`);
    setRestockModalProduct(null);
  };

  // Fill the barcode field with a fresh, valid EAN-13 not already in the catalogue.
  // Lets the operator add a placeholder product without inventing a number by hand.
  const generateBarcode = (): string =>
    uniqueEan13(new Set(products.map((p) => p.barcode).filter(Boolean)));

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
    const headers =
      "SKU,Barcode,Product Name,Generic Name,Category,Unit,Selling Price,Cost Price,Main Branch Stock,D'Jabez Branch Stock,Total Stock,Fast Moving,Shelf Life,FDA CPR No,Batch No,Expiry Date\n";
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
    <div className="max-w-7xl mx-auto p-4 space-y-6 text-slate-800">
      {/* Top Banner & Multi-Branch Stock Overview */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Medical Supplies Inventory Management (CRUD)
            </h2>
            <p className="text-xs text-slate-500">
              Live stock across Main Branch (Jalandoni St) ⇄ D&apos;Jabez Branch (21 Gen. Luna St)
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-inv-db-ledger"
            onClick={() => setIsDatabaseModalOpen(true)}
            className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-teal-200 shadow-sm cursor-pointer"
            title="View 1 Central Database status & Inter-Branch Transfer Ledger"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-teal-600" />
            <span>Transfer Ledger & DB</span>
          </button>

          <button
            onClick={handleRebalanceBranches}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            title="Auto-rebalances low-stock items between the Main and D'Jabez branches"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Inter-Branch Balancing</span>
          </button>

          <button
            onClick={() => setIsAddProductOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Medical Item</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel/CSV</span>
          </button>
        </div>
      </div>

      {/* Inventory Notification Toast/Banner */}
      {inventoryNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{inventoryNotice}</span>
          </div>
          <button
            onClick={() => setInventoryNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-3 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Stock Health KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Registered Medical SKUs</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{products.length} Items</div>
          <span className="text-[11px] text-emerald-600 font-semibold">100% FDA CPR Catalogued</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Main Branch Stock</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
            {products.reduce((acc, p) => acc + (p.stockMainBranch || 0), 0).toLocaleString()} units
          </div>
          <span className="text-[11px] text-slate-500">Casa Conching Bldg., Jalandoni St</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">D&apos;Jabez Branch Stock</span>
          <div className="text-2xl font-bold text-blue-600 font-mono mt-1">
            {products.reduce((acc, p) => acc + (p.stockUsaBranch || 0), 0).toLocaleString()} units
          </div>
          <span className="text-[11px] text-slate-500">D&apos;Jabez Bldg., 21 Gen. Luna St</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Fast Moving Peak Supplies</span>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {products.filter((p) => p.isFastMoving).length} SKUs
          </div>
          <span className="text-[11px] text-amber-600 font-semibold">School Opening High Demand</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, generic, SKU, barcode, FDA #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setOnlyLowStock((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                onlyLowStock
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Low Stock Alerts</span>
            </button>

            <button
              onClick={() => setOnlyFastMoving((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                onlyFastMoving
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
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
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table with CRUD Options */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Item & FDA CPR #</th>
                <th className="py-3 px-3">Barcode / SKU</th>
                <th className="py-3 px-3">Category / Unit</th>
                <th className="py-3 px-3 text-right">Price / Cost</th>
                <th className="py-3 px-3 text-center">Main Branch</th>
                <th className="py-3 px-3 text-center">D&apos;Jabez Branch</th>
                <th className="py-3 px-3">Batch & Expiry</th>
                <th className="py-3 px-4 text-center">Actions & Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.map((p) => {
                const isMainLow = p.stockMainBranch <= p.minStockLevel;
                const isDjabezLow = p.stockUsaBranch <= p.minStockLevel;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    {/* Name & FDA CPR */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 line-clamp-1">{p.name}</div>
                      {p.genericName && (
                        <div className="text-[10px] text-slate-500 italic">Gen: {p.genericName}</div>
                      )}
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="text-emerald-600 font-medium">{p.fdaRegistrationNo}</span>
                        {p.isFastMoving && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded border border-amber-200">
                            Fast Moving
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                      <div>{p.barcode}</div>
                      <div className="text-[10px] text-slate-400">{p.sku}</div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <div className="text-slate-700">{p.category}</div>
                      <div className="text-[10px] text-slate-400">Unit: {p.unit}</div>
                    </td>

                    {/* Pricing */}
                    <td className="py-3 px-3 text-right font-mono">
                      <div className="font-bold text-slate-900">₱{p.price}</div>
                      <div className="text-[10px] text-slate-400">Cost: ₱{p.costPrice}</div>
                    </td>

                    {/* Main Branch Stock */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold font-mono text-xs border ${
                          p.stockMainBranch < 0
                            ? 'bg-rose-600 text-white border-rose-700'
                            : p.stockMainBranch === 0
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : isMainLow
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                        title={
                          p.stockMainBranch < 0
                            ? 'Oversold — more units were sold than were recorded on hand. Recount and correct this figure with Edit.'
                            : undefined
                        }
                      >
                        {p.stockMainBranch}
                      </span>
                    </td>

                    {/* D'Jabez Branch Stock */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold font-mono text-xs border ${
                          p.stockUsaBranch < 0
                            ? 'bg-rose-600 text-white border-rose-700'
                            : p.stockUsaBranch === 0
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : isDjabezLow
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}
                        title={
                          p.stockUsaBranch < 0
                            ? 'Oversold — more units were sold than were recorded on hand. Recount and correct this figure with Edit.'
                            : undefined
                        }
                      >
                        {p.stockUsaBranch}
                      </span>
                    </td>

                    {/* Batch & Expiry */}
                    <td className="py-3 px-3 text-[11px]">
                      <div className="font-mono text-slate-600">{p.batchNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Exp: {p.expiryDate}</div>
                    </td>

                    {/* Actions: Transfer, Restock, Edit, Delete */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setTransferModalProduct(p);
                            setTransferQty(Math.min(10, Math.max(p.stockMainBranch, p.stockUsaBranch)));
                          }}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition border border-slate-200 cursor-pointer"
                          title="Transfer between the Main and D'Jabez branches"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                        </button>

                        <button
                          onClick={() => {
                            setRestockModalProduct(p);
                            setNewBatchNo(p.batchNumber);
                            setNewExpiry(p.expiryDate);
                          }}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition cursor-pointer"
                          title="Restock new batch from supplier"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        </button>

                        <button
                          onClick={() => {
                            setLabelProduct(p);
                            setLabelStyle('qr');
                            setLabelCopies(1);
                          }}
                          className="p-1.5 bg-slate-50 hover:bg-indigo-100 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-lg transition cursor-pointer"
                          title="Generate & print a scannable barcode label"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setEditingProduct({ ...p })}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg transition cursor-pointer"
                          title="Edit product details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setProductToDelete(p)}
                          className="p-1.5 bg-slate-50 hover:bg-rose-100 text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg transition cursor-pointer"
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

      {/* Stock Transfer Modal (Main Branch ⇄ D'Jabez Branch) */}
      {transferModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Inter-Branch Stock Transfer</h3>
              <button onClick={() => setTransferModalProduct(null)} className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition cursor-pointer">
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">{transferModalProduct.name}</p>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Main Branch: <strong className="text-emerald-600 font-mono">{transferModalProduct.stockMainBranch}</strong></span>
                <span>D&apos;Jabez Branch: <strong className="text-blue-600 font-mono">{transferModalProduct.stockUsaBranch}</strong></span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Direction:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferDirection('main-to-djabez')}
                  className={`p-2.5 text-xs font-bold rounded-xl border text-left cursor-pointer transition ${
                    transferDirection === 'main-to-djabez'
                      ? 'border-emerald-500 bg-emerald-50 text-slate-900 ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Main Branch → D&apos;Jabez Branch
                </button>
                <button
                  type="button"
                  onClick={() => setTransferDirection('djabez-to-main')}
                  className={`p-2.5 text-xs font-bold rounded-xl border text-left cursor-pointer transition ${
                    transferDirection === 'djabez-to-main'
                      ? 'border-emerald-500 bg-emerald-50 text-slate-900 ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  D&apos;Jabez Branch → Main Branch
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Quantity (Units):</label>
              <input
                type="number"
                min={1}
                max={transferDirection === 'main-to-djabez' ? transferModalProduct.stockMainBranch : transferModalProduct.stockUsaBranch}
                value={transferQty}
                onChange={(e) => setTransferQty(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setTransferModalProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
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
          <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Receive Supplier Restock</h3>
              <button onClick={() => setRestockModalProduct(null)} className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition cursor-pointer">
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">{restockModalProduct.name}</p>
              <p className="text-[11px] text-slate-500 font-mono">SKU: {restockModalProduct.sku}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Restock Destination:</label>
                <select
                  value={restockTarget}
                  onChange={(e) => setRestockTarget(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="main">Main Branch (Jalandoni St)</option>
                  <option value="djabez">D&apos;Jabez Branch (21 Gen. Luna St)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Units Received:</label>
                <input
                  type="number"
                  min={1}
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-bold font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot No:</label>
                <input
                  type="text"
                  value={newBatchNo}
                  onChange={(e) => setNewBatchNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date:</label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setRestockModalProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
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
          <div className="bg-white text-slate-800 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Edit Medical Supply Product</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={editingProduct.genericName || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, genericName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode (EAN-13)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      value={editingProduct.barcode}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, barcode: generateBarcode() })}
                      className="shrink-0 inline-flex items-center px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition cursor-pointer"
                      title="Auto-generate a valid EAN-13 barcode"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Packaging Unit</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Retail Price (₱) *</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price (₱)</label>
                  <input
                    type="number"
                    value={editingProduct.costPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Main Branch Stock</label>
                  <input
                    type="number"
                    value={editingProduct.stockMainBranch}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockMainBranch: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-emerald-600 font-bold border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">D&apos;Jabez Branch Stock</label>
                  <input
                    type="number"
                    value={editingProduct.stockUsaBranch}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockUsaBranch: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-blue-600 font-bold border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min. Alert Level</label>
                  <input
                    type="number"
                    value={editingProduct.minStockLevel}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStockLevel: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">FDA CPR / License #</label>
                  <input
                    type="text"
                    value={editingProduct.fdaRegistrationNo}
                    onChange={(e) => setEditingProduct({ ...editingProduct, fdaRegistrationNo: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    value={editingProduct.batchNumber}
                    onChange={(e) => setEditingProduct({ ...editingProduct, batchNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editingProduct.expiryDate}
                    onChange={(e) => setEditingProduct({ ...editingProduct, expiryDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFastMoving}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isFastMoving: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Mark as Fast-Moving High Demand Product</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
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
          <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Medical Product?</h3>
                <p className="text-xs text-slate-500">This action will remove the product from the catalog.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="font-bold text-slate-900">{productToDelete.name}</div>
              <div className="text-slate-500 font-mono">SKU: {productToDelete.sku} | Barcode: {productToDelete.barcode}</div>
              <div className="text-slate-500">Main Stock: {productToDelete.stockMainBranch} | D&apos;Jabez Stock: {productToDelete.stockUsaBranch}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
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
          <div className="bg-white text-slate-800 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add New Medical Product SKU</h3>
              <button onClick={() => setIsAddProductOpen(false)} className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sterile Latex Surgical Gloves"
                    value={newProdData.name}
                    onChange={(e) => setNewProdData({ ...newProdData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Disposable Examination Gloves"
                    value={newProdData.genericName}
                    onChange={(e) => setNewProdData({ ...newProdData, genericName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newProdData.category}
                    onChange={(e) => setNewProdData({ ...newProdData, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode (EAN-13)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      placeholder="4806500123456"
                      value={newProdData.barcode}
                      onChange={(e) => setNewProdData({ ...newProdData, barcode: e.target.value })}
                      className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setNewProdData({ ...newProdData, barcode: generateBarcode() })}
                      className="shrink-0 inline-flex items-center px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition cursor-pointer"
                      title="Auto-generate a valid EAN-13 barcode"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="GLV-SURG-75"
                    value={newProdData.sku}
                    onChange={(e) => setNewProdData({ ...newProdData, sku: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Packaging Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="box (50 pairs)"
                    value={newProdData.unit}
                    onChange={(e) => setNewProdData({ ...newProdData, unit: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Retail Price (₱) *</label>
                  <input
                    type="number"
                    required
                    value={newProdData.price}
                    onChange={(e) => setNewProdData({ ...newProdData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price (₱)</label>
                  <input
                    type="number"
                    value={newProdData.costPrice}
                    onChange={(e) => setNewProdData({ ...newProdData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Main Branch Stock</label>
                  <input
                    type="number"
                    value={newProdData.stockMainBranch}
                    onChange={(e) => setNewProdData({ ...newProdData, stockMainBranch: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-emerald-600 font-bold border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial D&apos;Jabez Branch Stock</label>
                  <input
                    type="number"
                    value={newProdData.stockUsaBranch}
                    onChange={(e) => setNewProdData({ ...newProdData, stockUsaBranch: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-blue-600 font-bold border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min. Alert Level</label>
                  <input
                    type="number"
                    value={newProdData.minStockLevel}
                    onChange={(e) => setNewProdData({ ...newProdData, minStockLevel: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">FDA CPR / License #</label>
                  <input
                    type="text"
                    value={newProdData.fdaRegistrationNo}
                    onChange={(e) => setNewProdData({ ...newProdData, fdaRegistrationNo: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    value={newProdData.batchNumber}
                    onChange={(e) => setNewProdData({ ...newProdData, batchNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newProdData.expiryDate}
                    onChange={(e) => setNewProdData({ ...newProdData, expiryDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProdData.isFastMoving}
                    onChange={(e) => setNewProdData({ ...newProdData, isFastMoving: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Mark as Fast-Moving High Demand Product</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
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

      {/* Barcode Label Print Modal */}
      {labelProduct && (() => {
        const labelCode = (labelProduct.barcode || labelProduct.sku || '').trim();
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 my-auto">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  Print Barcode Label
                </h3>
                <button onClick={() => setLabelProduct(null)} className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition cursor-pointer">
                  ✕
                </button>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-900 leading-tight">{labelProduct.name}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  Encodes: <span className="text-slate-700">{labelCode || '— none —'}</span>
                </div>
              </div>

              {labelCode ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Label Style</label>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setLabelStyle('qr')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${labelStyle === 'qr' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        QR Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setLabelStyle('barcode')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${labelStyle === 'barcode' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Striped Barcode
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      QR scans on any phone camera. Striped barcodes need an Android/Chrome device or a USB scanner.
                    </p>
                  </div>

                  <div className="flex justify-center py-2">
                    {labelStyle === 'qr' ? (
                      <QRCodeRenderer value={labelCode} size={170} />
                    ) : (
                      <BarcodeRenderer value={labelCode} />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Copies</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={labelCopies}
                      onChange={(e) => setLabelCopies(Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 1)))}
                      className="w-24 px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setLabelProduct(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => void printProductLabels(labelProduct, { symbology: labelStyle, copies: labelCopies })}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-indigo-950/40 inline-flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print {labelCopies > 1 ? `${labelCopies} Labels` : 'Label'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  This product has no barcode or SKU to encode. Add one first (use the ⚡ button to
                  auto-generate a valid EAN-13), then print a label.
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
