import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  Sparkles,
  Percent,
  Package,
  AlertCircle,
  HelpCircle,
  FileText,
  Save,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { PresetKit, Product } from '../../types';

interface PresetKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetToEdit?: PresetKit | null;
  initialItems?: { productId: string; quantity: number }[];
  onSaved?: (kit: PresetKit) => void;
}

export const PresetKitModal: React.FC<PresetKitModalProps> = ({
  isOpen,
  onClose,
  presetToEdit,
  initialItems,
  onSaved,
}) => {
  const { products, addPresetKit, updatePresetKit } = usePOS();

  const [name, setName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [category, setCategory] = useState('Student Clinical Kits');
  const [description, setDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(5);

  // Selected items: record of productId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('All');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Preset categories
  const kitCategories = [
    'Student Clinical Kits',
    'Hospital & Clinic Supplies',
    'PPE & Infection Control',
    'Diagnostic & Monitoring',
    'Wound Care & Dressings',
    'Surgical & Suture',
    'Custom Department Bundle',
  ];

  const productCategories = [
    'All',
    'PPE & Infection Control',
    'Diagnostic & Monitoring',
    'Syringes & Needles',
    'Wound Care & Dressings',
    'Surgical Instruments',
    'Sterilization & Antiseptics',
    'IV Therapy & Fluids',
    'Student Clinical Kits',
    'Hospital & Clinic Supplies',
  ];

  useEffect(() => {
    if (!isOpen) return;

    if (presetToEdit) {
      setName(presetToEdit.name);
      setTargetAudience(presetToEdit.targetAudience);
      setCategory(presetToEdit.category || 'Student Clinical Kits');
      setDescription(presetToEdit.description);
      setDiscountPercentage(presetToEdit.discountPercentage || 0);

      const itemsMap: Record<string, number> = {};
      presetToEdit.items.forEach((item) => {
        itemsMap[item.productId] = item.quantity;
      });
      setSelectedItems(itemsMap);
    } else if (initialItems && initialItems.length > 0) {
      setName('');
      setTargetAudience('Nursing & Medical Students');
      setCategory('Student Clinical Kits');
      setDescription('Custom bundled starter package with essential student clinical supplies.');
      setDiscountPercentage(5);

      const itemsMap: Record<string, number> = {};
      initialItems.forEach((item) => {
        itemsMap[item.productId] = item.quantity;
      });
      setSelectedItems(itemsMap);
    } else {
      setName('');
      setTargetAudience('');
      setCategory('Student Clinical Kits');
      setDescription('');
      setDiscountPercentage(5);
      setSelectedItems({});
    }
    setErrorNotice(null);
  }, [isOpen, presetToEdit, initialItems]);

  if (!isOpen) return null;

  const toggleProduct = (productId: string) => {
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

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      const copy = { ...prev };
      if (next <= 0) {
        delete copy[productId];
      } else {
        copy[productId] = next;
      }
      return copy;
    });
  };

  const setExactQuantity = (productId: string, qty: number) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (qty <= 0) {
        delete copy[productId];
      } else {
        copy[productId] = qty;
      }
      return copy;
    });
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.genericName && p.genericName.toLowerCase().includes(productSearch.toLowerCase()));
    const matchesCat = selectedProductCategory === 'All' || p.category === selectedProductCategory;
    return matchesSearch && matchesCat;
  });

  const selectedEntries = Object.entries(selectedItems) as [string, number][];
  const totalItemCount = selectedEntries.reduce((acc, [, qty]) => acc + Number(qty), 0);
  const rawSubtotal = selectedEntries.reduce((acc, [prodId, qty]) => {
    const prod = products.find((p) => p.id === prodId);
    return acc + (prod ? prod.price * Number(qty) : 0);
  }, 0);

  const discountAmount = Math.round(rawSubtotal * ((discountPercentage || 0) / 100));
  const bundleTotal = Math.max(0, rawSubtotal - discountAmount);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorNotice('Please provide a name for this Starter Checklist Preset.');
      return;
    }

    if (!targetAudience.trim()) {
      setErrorNotice('Please specify the target course/audience (e.g. BSN Level 1 Students).');
      return;
    }

    if (selectedEntries.length === 0) {
      setErrorNotice('Please select at least one medical item for this preset kit.');
      return;
    }

    const itemsPayload = selectedEntries.map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    if (presetToEdit) {
      const updated: PresetKit = {
        ...presetToEdit,
        name: name.trim(),
        targetAudience: targetAudience.trim(),
        category,
        description: description.trim() || 'Clinical student supply bundle',
        discountPercentage: Number(discountPercentage) || 0,
        items: itemsPayload,
      };
      updatePresetKit(updated);
      if (onSaved) onSaved(updated);
    } else {
      const created = addPresetKit({
        name: name.trim(),
        targetAudience: targetAudience.trim(),
        category,
        description: description.trim() || 'Clinical student supply bundle',
        discountPercentage: Number(discountPercentage) || 0,
        items: itemsPayload,
      });
      if (onSaved) onSaved(created);
    }

    onClose();
  };

  return (
    <div
      id="preset-kit-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  {presetToEdit ? 'Edit Starter Checklist Preset' : 'Create Starter Checklist Preset'}
                </h2>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-100 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                  1-Click Student Bundle
                </span>
              </div>
              <p className="text-xs text-emerald-50/90 mt-0.5">
                Configure auto-fill presets for nursing, medtech, pharmacy, or clinic supply packages
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorNotice && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Kit Details Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preset Kit Name <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BSN 2nd Year Duty Kit, Dental Hygiene Pack..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Course / Audience <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. BSN 2nd Year / MedTech Interns / School Clinics"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {kitCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kit Description & Purpose
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief notes on what items this kit includes, special packing instructions, or student guidelines..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Kit Bundle Discount (%)</span>
                  <span className="text-emerald-600 font-bold">{discountPercentage}%</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-900 min-w-[50px] text-center">
                    {discountPercentage}%
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Students applying this preset will get this bundle incentive automatically.
                </span>
              </div>
            </div>
          </div>

          {/* Selected Kit Items Summary Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Bundled Medical Items ({selectedEntries.length} items • {totalItemCount} total units)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">
                  Total Value: <span className="line-through">₱{rawSubtotal.toLocaleString()}</span>
                </span>
                <span className="font-bold text-emerald-600 text-sm">
                  Bundle Price: ₱{bundleTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {selectedEntries.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-200 rounded-lg">
                No items selected yet. Use the catalog browser below to search and add items to this preset kit.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {selectedEntries.map(([prodId, qty]) => {
                  const prod = products.find((p) => p.id === prodId);
                  if (!prod) return null;

                  return (
                    <div
                      key={prodId}
                      className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate text-[11px]">{prod.name}</p>
                        <p className="text-[10px] text-slate-500">
                          ₱{prod.price} / {prod.unit} • Sub: ₱{(prod.price * qty).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(prodId, -1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={qty}
                          onChange={(e) => setExactQuantity(prodId, parseInt(e.target.value) || 1)}
                          className="w-10 text-center font-mono font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 text-xs py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(prodId, 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleProduct(prodId)}
                          className="p-1 text-slate-500 hover:text-rose-500 transition ml-1"
                          title="Remove item from kit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Medical Catalog Picker */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Browse & Add Supplies from Live 60+ Medical Catalog
                </h3>
                <p className="text-[11px] text-slate-500">
                  Search medical supplies to add into this Starter Preset.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search medical item, SKU..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={selectedProductCategory}
                  onChange={(e) => setSelectedProductCategory(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 max-w-[140px]"
                >
                  {productCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {filteredProducts.map((prod) => {
                const isSelected = !!selectedItems[prod.id];
                const qty = selectedItems[prod.id] || 0;

                return (
                  <div
                    key={prod.id}
                    className={`p-2.5 rounded-lg border transition text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-slate-900 text-[11px] line-clamp-1">
                          {prod.name}
                        </span>
                        <span className="font-mono text-emerald-600 font-bold text-[11px] shrink-0">
                          ₱{prod.price}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {prod.category} • {prod.unit}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">SKU: {prod.sku}</span>

                      {isSelected ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(prod.id, -1)}
                            className="w-5 h-5 rounded bg-slate-100 text-slate-700 hover:text-slate-900 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-emerald-600 text-xs px-1.5">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(prod.id, 1)}
                            className="w-5 h-5 rounded bg-slate-100 text-slate-700 hover:text-slate-900 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleProduct(prod.id)}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add to Kit</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedEntries.length > 0 ? (
              <span>
                Ready to save <strong className="text-slate-900">{selectedEntries.length} items</strong> into "{name || 'Preset Kit'}"
              </span>
            ) : (
              <span className="text-amber-600">Select items to enable saving</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={selectedEntries.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md shadow-emerald-950/50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{presetToEdit ? 'Save Changes' : 'Create Preset Kit'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
