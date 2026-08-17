import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Scan,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Layers,
  Sparkles,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { Product, SaleTransaction } from '../../types';
import { MultiCartTabs } from './MultiCartTabs';
import { QuickKitSelector } from './QuickKitSelector';
import { UnifiedScannerModal } from './UnifiedScannerModal';
import { PendingPreOrdersDrawer } from './PendingPreOrdersDrawer';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { soundEffects } from '../../utils/audio';

export const POSTerminal: React.FC = () => {
  const {
    products,
    preOrders,
    activeBranch,
    heldCarts,
    activeCartIndex,
    currentCartItems,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCurrentCart,
    loadPreOrderIntoCart,
    recentCompletedSale,
    setRecentCompletedSale,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showKits, setShowKits] = useState(false);

  // Modals & Drawers
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPreOrdersDrawerOpen, setIsPreOrdersDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [autoPrintTrigger, setAutoPrintTrigger] = useState(true);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const currentCart = heldCarts[activeCartIndex] || {
    id: 'default',
    name: 'Order #1',
    items: [],
    customerType: 'Student',
  };

  const pendingOrdersCount = preOrders.filter(
    (p) => p.orderStatus === 'Pending' || p.orderStatus === 'Preparing'
  ).length;

  const categories: string[] = [
    'All',
    'Diagnostic & Monitoring',
    'Consumables & Accessories',
    'PPE & Infection Control',
    'Syringes & Needles',
    'Laboratory Equipment & Glasswares',
    'Chemical & Reagents',
    'Medical Footwear & Apparel',
    'Wound Care & Dressings',
    'Sterilization & Antiseptics',
    'Hospital & Clinic Supplies',
  ];

  // Auto-focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Hardware USB/Bluetooth Barcode Scanner Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkey F9 to initiate checkout
      if (e.key === 'F9') {
        e.preventDefault();
        if (currentCartItems.length > 0) {
          setIsPaymentModalOpen(true);
        }
        return;
      }

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isBarcodeInput = target === barcodeInputRef.current;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const scannedCode = buffer.trim();
          
          // Check if pre-order ref
          const matchPO = preOrders.find(
            (po) => po.referenceCode.toLowerCase() === scannedCode.toLowerCase()
          );
          if (matchPO) {
            e.preventDefault();
            loadPreOrderIntoCart(matchPO.id);
            soundEffects.playSuccessPayment();
            buffer = '';
            return;
          }

          // Check product
          const match = products.find(
            (p) =>
              p.barcode === scannedCode ||
              p.sku.toLowerCase() === scannedCode.toLowerCase()
          );

          if (match) {
            e.preventDefault();
            addToCart(match, 1);
            setBarcodeInput('');
            buffer = '';
            return;
          }
        }
        buffer = '';
      } else if (e.key.length === 1) {
        if (timeDiff > 100 && !isBarcodeInput) {
          buffer = '';
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, preOrders, addToCart, loadPreOrderIntoCart, currentCartItems]);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Check if pre-order ref
    const matchPO = preOrders.find(
      (po) =>
        po.referenceCode.toLowerCase() === query.toLowerCase() ||
        po.id.toLowerCase() === query.toLowerCase()
    );
    if (matchPO) {
      loadPreOrderIntoCart(matchPO.id);
      soundEffects.playSuccessPayment();
      setBarcodeInput('');
      return;
    }

    const match = products.find(
      (p) =>
        p.barcode === query ||
        p.sku.toLowerCase() === query.toLowerCase() ||
        p.name.toLowerCase().includes(query.toLowerCase())
    );

    if (match) {
      addToCart(match, 1);
      setBarcodeInput('');
    } else {
      soundEffects.playErrorBeep();
    }
  };

  const isMainBranch = activeBranch.includes('Main Branch');

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      (p.genericName && p.genericName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const cartSubtotal = currentCartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItemUnits = currentCartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Top Action Bar: Search, Unified Scanner, Pre-Order Drawer & Student Kits */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2.5 items-center justify-between">
        {/* Quick Barcode & Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <Scan className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode or Type SKU (e.g. 480651234001)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono placeholder:text-slate-400"
            />
          </form>

          {/* Quick Search */}
          <div className="relative hidden md:block w-48 lg:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Smart Unified Scanner */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <Scan className="w-4 h-4 text-emerald-600" />
            <span>Camera Scanner</span>
          </button>

          {/* Student Pre-Orders Drawer Button */}
          <button
            onClick={() => setIsPreOrdersDrawerOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-emerald-200 shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Student Pre-Orders</span>
            {pendingOrdersCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          {/* Toggle Quick Student Kits */}
          <button
            onClick={() => setShowKits((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              showKits
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Duty Kits</span>
          </button>
        </div>
      </div>

      {/* Quick Kit Drawer if toggled */}
      {showKits && <QuickKitSelector />}

      {/* Main Cashier Register Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Product Catalog & Category Filter (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Category Filter Pills */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Clean Medical Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const currentStock = isMainBranch ? p.stockMainBranch : p.stockUsaBranch;
              const isLowStock = currentStock <= p.minStockLevel;

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p, 1)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition flex flex-col justify-between cursor-pointer group select-none"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        {p.barcode}
                      </span>
                      {p.isFastMoving && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          Popular
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 line-clamp-2 leading-snug">
                      {p.name}
                    </h4>

                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {p.category}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <div className="text-base font-extrabold text-emerald-700 font-mono">
                        ₱{p.price.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">per {p.unit}</span>
                    </div>

                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          currentStock === 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isLowStock
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {currentStock} in stock
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Multi-Cart & Active Register Summary (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
          {/* Multi-Cart Tabs (Hold / Resume tickets) */}
          <MultiCartTabs />

          {/* Cart Header Info */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {currentCart.name}
              </span>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                {currentCart.customerType || 'Student'}
              </span>
            </div>

            {currentCartItems.length > 0 && (
              <button
                onClick={clearCurrentCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Cart Line Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
            {currentCartItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <Package className="w-12 h-12 text-slate-300 stroke-1" />
                <p className="text-xs font-bold text-slate-700">Cashier Register is Ready</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Scan an item barcode, pick a student kit, or click products to ring up items.
                </p>
              </div>
            ) : (
              currentCartItems.map((item) => (
                <div key={item.product.id} className="pt-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.product.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>₱{item.unitPrice} / {item.product.unit}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">{item.product.sku}</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5 shrink-0">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-700 hover:bg-white rounded cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-extrabold font-mono text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-700 hover:bg-white rounded cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal & Delete */}
                  <div className="text-right shrink-0 min-w-[70px]">
                    <div className="text-xs font-extrabold text-slate-900 font-mono">
                      ₱{item.subtotal.toLocaleString()}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-[10px] font-medium text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer & Payment Trigger */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Quantity Count:</span>
                <span className="font-bold text-slate-900">{totalItemUnits} units ({currentCartItems.length} items)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Subtotal (VAT inclusive):</span>
                <span className="font-bold text-slate-900 font-mono">₱{cartSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-xs uppercase font-extrabold text-slate-700 tracking-wider">Total Amount Due</span>
                <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">₱{cartSubtotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={currentCartItems.length === 0}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                currentCartItems.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Charge & Print Receipt (F9) • ₱{cartSubtotal.toLocaleString()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Scanner Modal */}
      <UnifiedScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      {/* Student Pre-Orders Drawer */}
      <PendingPreOrdersDrawer
        isOpen={isPreOrdersDrawerOpen}
        onClose={() => setIsPreOrdersDrawerOpen(false)}
      />

      {/* Payment & Checkout Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={(tx, autoPrint) => {
          setRecentCompletedSale(tx);
          setAutoPrintTrigger(autoPrint);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Thermal Receipt & Printable Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        transaction={recentCompletedSale}
        autoPrint={autoPrintTrigger}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
};
