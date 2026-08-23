import React, { useState } from 'react';
import {
  ClipboardList,
  Sparkles,
  Layers,
  MapPin,
  Building2,
  Calendar,
  User,
  Phone,
  Mail,
  GraduationCap,
  Plus,
  Minus,
  CheckCircle2,
  QrCode,
  Printer,
  Download,
  AlertCircle,
  FileText,
  CreditCard,
  Banknote,
  Search,
  Check,
  ShieldCheck,
  Smartphone,
  Wallet,
  Share2,
  Lock,
  Edit3,
  Trash2,
  RotateCcw,
  FolderPlus,
  BookmarkPlus,
  Info,
  Stethoscope,
  Activity,
  HeartPulse,
  PackageCheck,
  Clock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePOS, BRANCH_MAIN, BRANCH_DJABEZ } from '../../context/POSContext';
import { CustomerPreOrder, BranchName, PresetKit } from '../../types';
import { QRCodeRenderer } from '../common/QRCodeRenderer';
import { PresetKitModal } from './PresetKitModal';
import { OrderStatusTracker } from './OrderStatusTracker';
import { openGmailWeb, openClientEmail } from '../../utils/emailNotifier';

export const DigitalChecklistPortal: React.FC = () => {
  const {
    products,
    presetKits,
    deletePresetKit,
    resetPresetKitsToDefaults,
    addCustomerPreOrder,
    setActiveView,
    userRole,
    setIsShareModalOpen,
    setIsAdminLoginModalOpen,
    isAdminAuthenticated,
    preOrders,
  } = usePOS();

  // Portal Navigation Tabs: 'order' (Build Checklist) vs 'track' (Order Status Tracker)
  const [activePortalTab, setActivePortalTab] = useState<'order' | 'track'>('order');
  const [trackedOrderNumber, setTrackedOrderNumber] = useState<string>('');

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [schoolOrClinic, setSchoolOrClinic] = useState('University of San Agustin (College of Nursing)');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [pickupBranch, setPickupBranch] = useState<BranchName>(BRANCH_MAIN);
  const [targetPickupDate, setTargetPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [paymentOption, setPaymentOption] = useState<'Pay Later' | 'GCash' | 'Bank'>('Pay Later');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');

  // Selected items: record of productId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Preset management modal states
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PresetKit | null>(null);
  const [presetInitialItems, setPresetInitialItems] = useState<{ productId: string; quantity: number }[] | undefined>(undefined);
  const [presetToDelete, setPresetToDelete] = useState<PresetKit | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Completed pre-order response modal
  const [submittedOrder, setSubmittedOrder] = useState<CustomerPreOrder | null>(null);

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

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => {
      setNoticeMessage(null);
    }, 4000);
  };

  // Apply a preset kit
  const applyPresetKit = (kitId: string) => {
    const kit = presetKits.find((k) => k.id === kitId);
    if (!kit) return;

    setSelectedItems((prev) => {
      const copy = { ...prev };
      kit.items.forEach((item) => {
        copy[item.productId] = (copy[item.productId] || 0) + item.quantity;
      });
      return copy;
    });

    showNotice(`Applied "${kit.name}" (${kit.items.length} items added to your checklist)`);
  };

  const handleOpenAddPreset = () => {
    setEditingPreset(null);
    setPresetInitialItems(undefined);
    setIsPresetModalOpen(true);
  };

  const handleSaveCurrentAsPreset = () => {
    const items = Object.entries(selectedItems).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    if (items.length === 0) {
      alert('Please check at least one supply item to save as a preset kit.');
      return;
    }
    setEditingPreset(null);
    setPresetInitialItems(items);
    setIsPresetModalOpen(true);
  };

  const handleOpenEditPreset = (e: React.MouseEvent, kit: PresetKit) => {
    e.stopPropagation();
    setEditingPreset(kit);
    setPresetInitialItems(undefined);
    setIsPresetModalOpen(true);
  };

  const handleDeletePresetClick = (e: React.MouseEvent, kit: PresetKit) => {
    e.stopPropagation();
    setPresetToDelete(kit);
  };

  const confirmDeletePreset = () => {
    if (!presetToDelete) return;
    deletePresetKit(presetToDelete.id);
    showNotice(`Preset kit "${presetToDelete.name}" was deleted.`);
    setPresetToDelete(null);
  };

  const handleResetPresets = () => {
    if (window.confirm('Reset all Starter Checklist Presets back to the default HENZ Clinical Kits?')) {
      resetPresetKitsToDefaults();
      showNotice('Starter presets restored to default HENZ clinical catalog.');
    }
  };

  const toggleItem = (productId: string) => {
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

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.genericName && p.genericName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Calculate totals
  const selectedEntries = Object.entries(selectedItems);
  const totalItemCount = selectedEntries.reduce((acc, [, qty]) => acc + Number(qty), 0);
  const rawSubtotal = selectedEntries.reduce((acc, [prodId, qty]) => {
    const prod = products.find((p) => p.id === prodId);
    return acc + (prod ? prod.price * Number(qty) : 0);
  }, 0);

  // Student bundle discount (5% for >10 items)
  const isBundleDiscount = totalItemCount >= 10;
  const discountAmount = isBundleDiscount ? Math.round(rawSubtotal * 0.05) : 0;
  const estimatedTotal = Math.max(0, rawSubtotal - discountAmount);

  const handleSubmitPreOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !contactNumber.trim()) {
      alert('Please fill in your name and contact phone number.');
      return;
    }
    if (selectedEntries.length === 0) {
      alert('Please select at least one medical supply item for your checklist.');
      return;
    }

    const itemsPayload = selectedEntries.map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    const newOrder = addCustomerPreOrder({
      customerName: customerName.trim(),
      schoolOrClinic: schoolOrClinic.trim(),
      contactNumber: contactNumber.trim(),
      email: email.trim() || undefined,
      pickupBranch,
      targetPickupDate,
      items: itemsPayload,
      paymentStatus:
        paymentOption === 'Pay Later'
          ? 'Unpaid (Pay Later at Store)'
          : paymentOption === 'GCash'
          ? 'Paid via GCash'
          : 'Paid via Bank',
      paymentMethod:
        paymentOption === 'Pay Later' ? 'Cash' : paymentOption === 'GCash' ? 'GCash' : 'Bank Payment',
      paymentRefNumber: paymentRef.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setSubmittedOrder(newOrder);

    // Save to customer's private device session so they can track only their own orders
    try {
      const existingMyOrders: string[] = JSON.parse(localStorage.getItem('henz_my_orders_v1') || '[]');
      if (!existingMyOrders.includes(newOrder.orderNumber)) {
        localStorage.setItem('henz_my_orders_v1', JSON.stringify([newOrder.orderNumber, ...existingMyOrders]));
      }
    } catch {
      // ignore
    }

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 text-slate-800">
      {/* Medical Header & Portal Mode Switcher */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-teal-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <span className="p-3 bg-teal-500/20 rounded-2xl border border-teal-500/40 text-teal-400 shadow-inner">
              <Stethoscope className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  HENZ Clinical Supplies & Student Pre-Order Portal
                </h2>
                <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2.5 py-0.5 rounded-full">
                  Zero Login Required
                </span>
              </div>
              <p className="text-xs text-teal-300/90 mt-0.5">
                Official retail portal for College of Nursing, MedTech, Pharmacy, and Hospital clinical supplies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-teal-950/50"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Portal</span>
            </button>
            <span className="text-xs font-semibold bg-slate-900/90 text-slate-300 px-3 py-2 rounded-xl border border-slate-700 hidden sm:inline">
              Casa Conching &amp; D&apos;Jabez Branch
            </span>
          </div>
        </div>

        {/* Portal Tabs: Order Medical Supplies vs Live Order Tracker */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActivePortalTab('order')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activePortalTab === 'order'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-950/40'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>1. Medical Supplies & Kit Checklist</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('track')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activePortalTab === 'track'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-950/40'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. Track Order Status & Notifications</span>
            {preOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-400 text-slate-950">
                {preOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Render Active Portal Tab */}
      {activePortalTab === 'track' ? (
        <OrderStatusTracker
          initialOrderNumber={trackedOrderNumber}
          onNewOrderClick={() => setActivePortalTab('order')}
        />
      ) : (
        <>
          {/* Temporary Notice Toast */}
          {noticeMessage && (
            <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg shadow-teal-100 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{noticeMessage}</span>
              </div>
              <button
                onClick={() => setNoticeMessage(null)}
                className="text-teal-600 hover:text-teal-800 text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

      {/* Preset Starter Kits (1-Click Fill & Custom Management) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Step 1: Choose Starter Checklist Preset (Optional)
                </h3>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                  {presetKits.length} Available Kits
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any kit to auto-populate items, or create & manage custom course presets.
              </p>
            </div>
          </div>

          {isAdminAuthenticated && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveCurrentAsPreset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-xs font-bold transition cursor-pointer"
                  title="Save currently checked items as a reusable Starter Preset"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save Checked as Preset ({selectedEntries.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenAddPreset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-sm shadow-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Preset</span>
              </button>

              <button
                type="button"
                onClick={handleResetPresets}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 border border-slate-200 transition cursor-pointer"
                title="Reset presets to default clinical kits"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {presetKits.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500">No checklist presets currently saved.</p>
            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={handleResetPresets}
                className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Default Starter Kits</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {presetKits.map((kit) => (
              <div
                key={kit.id}
                onClick={() => applyPresetKit(kit.id)}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50 transition cursor-pointer group flex flex-col justify-between relative shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 leading-snug">
                      {kit.name}
                    </h4>
                    {kit.discountPercentage ? (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                        {kit.discountPercentage}% Off
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap my-1.5">
                    <span className="text-[9px] font-medium bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                      {kit.targetAudience}
                    </span>
                    {kit.isCustom && (
                      <span className="text-[9px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200">
                        Custom
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                    {kit.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium text-[11px]">
                    {kit.items.length} items bundle
                  </span>

                  <div className="flex items-center gap-1">
                    {isAdminAuthenticated && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditPreset(e, kit)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 transition"
                          title="Edit preset kit items and settings"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePresetClick(e, kit)}
                          className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition"
                          title="Delete preset kit"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    <span className="font-bold text-emerald-600 flex items-center gap-0.5 ml-1 group-hover:translate-x-0.5 transition text-[11px]">
                      <Plus className="w-3 h-3" />
                      <span>Apply</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Form & Catalog Layout */}
      <form onSubmit={handleSubmitPreOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Medical Catalog Checkboxes (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Step 2: Customize Supplies Checklist
              </h3>
              <p className="text-xs text-slate-500">
                Tick items and adjust quantities. Fast-search among all 60+ medical items.
              </p>
            </div>

            {selectedEntries.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedItems({})}
                className="text-xs text-rose-600 hover:text-rose-500 font-semibold cursor-pointer"
              >
                Clear Selections ({selectedEntries.length})
              </button>
            )}
          </div>

          {/* Search and Categories */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search bandages, syringes, forceps, gloves..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer border ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-200'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Items Checkbox Grid */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const qty = selectedItems[p.id] || 0;
              const isChecked = qty > 0;

              return (
                <div
                  key={p.id}
                  onClick={() => toggleItem(p.id)}
                  className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(p.id)}
                      className="mt-0.5 w-4 h-4 text-emerald-500 accent-emerald-500 rounded focus:ring-emerald-500 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-snug">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-bold text-emerald-600 font-mono">₱{p.price}</span>
                        <span>/ {p.unit}</span>
                        <span>•</span>
                        <span className="text-slate-400">{p.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity adjustment */}
                  {isChecked && (
                    <div
                      className="flex items-center gap-1 bg-white border border-emerald-300 rounded-lg p-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => updateQuantity(p.id, -1)}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-slate-900 font-mono">{qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(p.id, 1)}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
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

        {/* Right: Customer Information & Pickup Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide pb-2 border-b border-slate-200">
              Step 3: Student & Pickup Location
            </h3>

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name / Student Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Angela Santos"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-medium placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* School / Institution / Clinic */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                School, University, or Clinic
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. St. Paul University / CPU / West Visayas State Univ"
                  value={schoolOrClinic}
                  onChange={(e) => setSchoolOrClinic(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-medium placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="0917-xxx-xxxx"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-mono placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Pickup Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={targetPickupDate}
                    onChange={(e) => setTargetPickupDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Select Pickup Branch (Real Branches) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Pickup Branch Location:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPickupBranch(BRANCH_MAIN)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    pickupBranch === BRANCH_MAIN
                      ? 'border-emerald-500 bg-emerald-50 text-slate-900 font-bold ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Main Branch</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Casa Conching Bldg., Jalandoni St, Iloilo City Proper — in front of University of San Agustin Gate 5
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPickupBranch(BRANCH_DJABEZ)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    pickupBranch === BRANCH_DJABEZ
                      ? 'border-emerald-500 bg-emerald-50 text-slate-900 font-bold ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>D&apos;Jabez Branch</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    D&apos;Jabez Bldg., 21 Gen. Luna St., Iloilo City Proper — in front of the Jalandoni Flyover &amp; JD Bakeshop
                  </p>
                </button>
              </div>
            </div>

            {/* Payment Mode Selection: Pay Now vs Pay Later */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Payment Method:
                </label>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {paymentOption === 'Pay Later' ? 'Pay upon claiming in store' : 'Fast cashless priority lane'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentOption('Pay Later')}
                  className={`py-2.5 px-2 text-center rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                    paymentOption === 'Pay Later'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Pay Later</span>
                  <span className="text-[9px] font-normal opacity-80">(Cash on Pickup)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentOption('GCash')}
                  className={`py-2.5 px-2 text-center rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                    paymentOption === 'GCash'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pay Now (GCash)</span>
                  <span className="text-[9px] font-normal opacity-80">(0917-888-HENZ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentOption('Bank')}
                  className={`py-2.5 px-2 text-center rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                    paymentOption === 'Bank'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Pay Now (Bank)</span>
                  <span className="text-[9px] font-normal opacity-80">(BDO / BPI / UnionBank)</span>
                </button>
              </div>
            </div>

            {paymentOption !== 'Pay Later' && (
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                  <span>{paymentOption === 'GCash' ? 'GCash Merchant QR / Number' : 'Bank Transfer Details'}</span>
                  <span className="text-[10px] text-slate-500 font-normal">Account: HENZ HEALTH CARE</span>
                </div>
                <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  {paymentOption === 'GCash' ? (
                    <div>
                      <p className="font-mono font-bold text-emerald-600">GCash: 0917-555-4369 (HENZ Trading)</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">Please send the exact estimated total (₱{estimatedTotal.toLocaleString()}) and paste the Reference # below.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-mono font-bold text-emerald-600">BDO Unibank: 0021-8409-1822</p>
                      <p className="font-mono text-slate-600 text-[10px]">BPI: 3829-1002-84 | Account: HENZ Health Care</p>
                    </div>
                  )}
                </div>
                <label className="block text-[11px] font-bold text-slate-700">
                  {paymentOption} Reference No. / Transaction ID:
                </label>
                <input
                  type="text"
                  placeholder="e.g. GCASH-9821034912 or REF-48201"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-mono placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Special Instructions / Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Order Notes / Special Requests:
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please pack in individual student duty bag, specify glove sizes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Order Summary & Submit Button */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 rounded-2xl border border-emerald-500 shadow-lg space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-emerald-50">
                <span>Selected Items:</span>
                <span className="font-bold text-white">{selectedEntries.length} items ({totalItemCount} units)</span>
              </div>
              <div className="flex justify-between text-emerald-50">
                <span>Subtotal:</span>
                <span className="font-mono text-white">₱{rawSubtotal.toLocaleString()}</span>
              </div>
              {isBundleDiscount && (
                <div className="flex justify-between text-amber-200 font-semibold">
                  <span>Student Bundle Discount (5%):</span>
                  <span className="font-mono">-₱{discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-extrabold text-white pt-2 border-t border-white/20">
                <span>Estimated Total:</span>
                <span className="font-mono text-white">₱{estimatedTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={selectedEntries.length === 0}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                selectedEntries.length > 0
                  ? 'bg-white hover:bg-emerald-50 text-emerald-700 shadow-emerald-900/20'
                  : 'bg-white/20 text-white/60 border border-white/30 cursor-not-allowed'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Submit Clinical Checklist & Generate Pickup Slip</span>
            </button>
          </div>
        </div>
      </form>
        </>
      )}

      {/* Submitted Order QR Slip Modal (Option 1 Result) */}
      {submittedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white text-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:shadow-none print:border-none print:w-full print:max-w-none">
            {/* Header */}
            <div className="bg-slate-50 text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Pre-Order Received & Queued!</h3>
              </div>
              <button
                onClick={() => setSubmittedOrder(null)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Slip Content */}
            <div className="p-6 space-y-4 bg-white text-slate-800">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-teal-900 uppercase tracking-widest bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  HENZ Health Care Products Trading • Student Pickup Slip
                </span>
                <h3 className="text-2xl font-mono font-extrabold text-slate-950">
                  {submittedOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-600">
                  Present this QR code or Reference ID at the store counter for 1-second pickup
                </p>
              </div>

              {/* QR Code Presentation */}
              <div className="flex justify-center my-2">
                <QRCodeRenderer value={submittedOrder.qrCodeValue} size={180} />
              </div>

              {/* Order Meta Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student/Customer:</span>
                  <span className="font-bold text-slate-900">{submittedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Institution:</span>
                  <span>{submittedOrder.schoolOrClinic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pickup Counter:</span>
                  <span className="font-bold text-teal-800">{submittedOrder.pickupBranch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Date:</span>
                  <span>{submittedOrder.targetPickupDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-semibold text-slate-800">{submittedOrder.paymentStatus}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold">
                  <span className="text-slate-900">Total ({submittedOrder.totalItems} items):</span>
                  <span className="text-teal-800 font-mono">₱{submittedOrder.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Itemized List Preview */}
              <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-3 text-xs">
                <div className="font-bold text-slate-700 text-[11px] mb-1">Checklist Items Reserved:</div>
                {submittedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600 text-[11px]">
                    <span className="truncate pr-2">{item.quantity}x {item.productName}</span>
                    <span className="font-mono text-slate-800 shrink-0">₱{(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-teal-600" />
                  <span>Print Slip</span>
                </button>

                {submittedOrder.email && (
                  <button
                    type="button"
                    onClick={() => {
                      const subject = `[HENZ Health Care] Pre-Order Slip #${submittedOrder.orderNumber} Confirmation`;
                      const body = `Hi ${submittedOrder.customerName},\n\nYour clinical supplies pre-order #${submittedOrder.orderNumber} has been received!\n\nPickup Branch: ${submittedOrder.pickupBranch}\nTarget Date: ${submittedOrder.targetPickupDate}\nTotal Amount: PHP ${submittedOrder.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n\nPresent this email or your Order Reference Code #${submittedOrder.orderNumber} at the store counter.\n\nThank you,\nHENZ Health Care Products Trading`;
                      openGmailWeb(submittedOrder.email!, subject, body);
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-teal-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                    title="Send / Open confirmation in Gmail"
                  >
                    <Mail className="w-4 h-4 text-teal-600" />
                    <span>Email Confirmation</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setTrackedOrderNumber(submittedOrder.orderNumber);
                    setActivePortalTab('track');
                    setSubmittedOrder(null);
                  }}
                  className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-teal-200 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>Track Status Live →</span>
                </button>
              </div>

              {userRole === 'admin' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedOrder(null);
                    setActiveView('prep-queue');
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-200"
                >
                  <span>View in Prep Desk →</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedOrder(null);
                    setSelectedItems({});
                    setCustomerName('');
                    setContactNumber('');
                    setEmail('');
                    setNotes('');
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-200"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Done / Next Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preset Kit Create / Edit Modal */}
      <PresetKitModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        presetToEdit={editingPreset}
        initialItems={presetInitialItems}
        onSaved={(kit) => {
          showNotice(`Preset kit "${kit.name}" saved successfully.`);
        }}
      />

      {/* Delete Preset Confirmation Dialog */}
      {presetToDelete && (
        <div
          id="delete-preset-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-md w-full shadow-2xl text-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Starter Preset Kit?</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action will remove the preset from the quick-list.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{presetToDelete.name}</p>
              <p className="text-slate-500">{presetToDelete.targetAudience} • {presetToDelete.items.length} items</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPresetToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePreset}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 shadow-sm shadow-rose-200 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Preset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
