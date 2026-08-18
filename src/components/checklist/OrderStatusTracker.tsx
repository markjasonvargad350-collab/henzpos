import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  PackageCheck,
  Building2,
  Calendar,
  Phone,
  User,
  AlertCircle,
  Sparkles,
  QrCode,
  Printer,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { CustomerPreOrder } from '../../types';
import { QRCodeRenderer } from '../common/QRCodeRenderer';

interface OrderStatusTrackerProps {
  initialOrderNumber?: string;
  onNewOrderClick?: () => void;
}

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  initialOrderNumber = '',
  onNewOrderClick,
}) => {
  const { preOrders } = usePOS();
  const [searchQuery, setSearchQuery] = useState(initialOrderNumber);
  const [searched, setSearched] = useState(Boolean(initialOrderNumber));

  // Only show orders submitted by this specific customer / device
  const [mySavedOrderNumbers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('henz_my_orders_v1') || '[]');
    } catch {
      return [];
    }
  });

  const myOrders = preOrders.filter((o) => mySavedOrderNumbers.includes(o.orderNumber));

  const [selectedOrder, setSelectedOrder] = useState<CustomerPreOrder | null>(() => {
    if (initialOrderNumber) {
      return (
        preOrders.find(
          (o) => o.orderNumber.toLowerCase() === initialOrderNumber.toLowerCase()
        ) || null
      );
    }
    // Default to the user's most recent order if available on this device
    const initialMyOrders = preOrders.filter((o) => {
      try {
        const saved = JSON.parse(localStorage.getItem('henz_my_orders_v1') || '[]');
        return saved.includes(o.orderNumber);
      } catch {
        return false;
      }
    });
    return initialMyOrders.length > 0 ? initialMyOrders[0] : null;
  });

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // Search specifically by exact order number, customer name, or phone number
    const match = preOrders.find(
      (o) =>
        o.orderNumber.toLowerCase() === query ||
        o.customerName.toLowerCase() === query ||
        o.contactNumber === query ||
        o.contactNumber.replace(/[^0-9]/g, '') === query.replace(/[^0-9]/g, '')
    );

    setSelectedOrder(match || null);
    setSearched(true);
  };

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case 'Pending':
        return 1;
      case 'Preparing':
        return 2;
      case 'Ready for Pickup':
        return 3;
      case 'Claimed':
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = selectedOrder ? getStatusStepIndex(selectedOrder.orderStatus) : 0;

  const steps = [
    {
      step: 1,
      title: 'Order Placed',
      desc: 'Received by HENZ Store Counter',
      icon: Clock,
    },
    {
      step: 2,
      title: 'Packing Supplies',
      desc: 'Pharmacist assembling clinical kit',
      icon: PackageCheck,
    },
    {
      step: 3,
      title: 'Ready for Pickup',
      desc: 'Awaiting student claim at counter',
      icon: CheckCircle2,
    },
    {
      step: 4,
      title: 'Claimed & Released',
      desc: 'Items verified & released with receipt',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-teal-900/60 via-slate-900 to-slate-900 border border-teal-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Clinical Order Tracker</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Track Your Pre-Order Status
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Check live preparation and counter-pickup readiness for your medical supplies.
            </p>
          </div>

          {/* Quick Search Form */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 text-teal-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Order #, Name, or Phone..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/80 text-white border border-teal-500/40 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 placeholder:text-slate-500 font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-lg shadow-teal-950/40 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Track</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Recent Pre-orders Quick Picker for this customer's own device */}
        {!selectedOrder && myOrders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <span className="text-[11px] text-teal-300 font-semibold uppercase tracking-wider block mb-2">
              Your Pre-Orders Placed on this Device:
            </span>
            <div className="flex flex-wrap gap-2">
              {myOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSearchQuery(order.orderNumber);
                    setSelectedOrder(order);
                    setSearched(true);
                  }}
                  className="text-xs bg-slate-950/80 hover:bg-teal-950/80 border border-teal-500/40 text-slate-200 hover:text-teal-200 px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-2"
                >
                  <span className="font-mono font-bold text-teal-400">{order.orderNumber}</span>
                  <span>•</span>
                  <span className="truncate max-w-[140px]">{order.pickupBranch}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      order.orderStatus === 'Ready for Pickup'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : order.orderStatus === 'Preparing'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : order.orderStatus === 'Claimed'
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {order.orderStatus}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Order Details and Live Tracker */}
      {selectedOrder ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Status Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-xl border ${
                  selectedOrder.orderStatus === 'Ready for Pickup'
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-600'
                    : selectedOrder.orderStatus === 'Preparing'
                    ? 'bg-sky-100 border-sky-200 text-sky-600'
                    : selectedOrder.orderStatus === 'Claimed'
                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-amber-100 border-amber-200 text-amber-600'
                }`}
              >
                {selectedOrder.orderStatus === 'Ready for Pickup' ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : selectedOrder.orderStatus === 'Preparing' ? (
                  <PackageCheck className="w-7 h-7 animate-pulse" />
                ) : selectedOrder.orderStatus === 'Claimed' ? (
                  <ShieldCheck className="w-7 h-7" />
                ) : (
                  <Clock className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-teal-600">
                    {selectedOrder.orderNumber}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      selectedOrder.orderStatus === 'Ready for Pickup'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse'
                        : selectedOrder.orderStatus === 'Preparing'
                        ? 'bg-sky-100 text-sky-700 border-sky-200'
                        : selectedOrder.orderStatus === 'Claimed'
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}
                  >
                    ● {selectedOrder.orderStatus}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedOrder.customerName}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{selectedOrder.schoolOrClinic}</span>
                  <span>•</span>
                  <span>Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                </p>
              </div>
            </div>

            {/* Pickup Branch & Target Date Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 md:text-right">
              <div className="flex items-center md:justify-end gap-1.5 text-teal-600 font-semibold">
                <Building2 className="w-4 h-4" />
                <span>Pickup Counter:</span>
              </div>
              <p className="text-slate-900 font-medium text-sm">{selectedOrder.pickupBranch}</p>
              <p className="text-slate-500 text-[11px] flex items-center md:justify-end gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Target Date: {selectedOrder.targetPickupDate || 'Today / Next Day'}</span>
              </p>
            </div>
          </div>

          {/* 4-Step Visual Progress Bar */}
          <div className="py-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Live Order Progress
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
              {steps.map((s) => {
                const isCompleted = currentStep >= s.step;
                const isCurrent = currentStep === s.step;
                const StepIcon = s.icon;

                return (
                  <div
                    key={s.step}
                    className={`rounded-xl p-3.5 border transition relative ${
                      isCurrent
                        ? 'bg-teal-50 border-teal-300 shadow-lg shadow-teal-100'
                        : isCompleted
                        ? 'bg-slate-50 border-emerald-200 text-slate-600'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isCompleted ? '✓' : s.step}
                      </span>
                      <StepIcon
                        className={`w-4 h-4 ${
                          isCurrent ? 'text-teal-600' : isCompleted ? 'text-emerald-500' : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <p
                      className={`text-xs font-bold ${
                        isCurrent ? 'text-teal-700' : isCompleted ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {s.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Notification Guidance */}
          {selectedOrder.orderStatus === 'Ready for Pickup' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-emerald-700 text-sm">
                  Your supplies are packed and ready for pickup!
                </p>
                <p className="text-emerald-700">
                  Please proceed to the counter at <strong>{selectedOrder.pickupBranch}</strong>. Show your digital order QR code or reference number <strong>{selectedOrder.orderNumber}</strong> to the cashier.
                </p>
              </div>
            </div>
          )}

          {selectedOrder.orderStatus === 'Preparing' && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3 text-sky-700">
              <PackageCheck className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5 animate-bounce" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sky-700 text-sm">
                  Your medical kit is currently being assembled & packed.
                </p>
                <p className="text-sky-700">
                  Our clinical team is boxing your requested items. The status will update to "Ready for Pickup" shortly.
                </p>
              </div>
            </div>
          )}

          {/* Item Checklist & QR Code Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* Items Ordered List */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-teal-600" />
                  <span>Items in Pre-Order ({selectedOrder.items.length})</span>
                </h4>
                <span className="text-xs font-bold text-emerald-600">
                  Total: ₱{selectedOrder.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto pr-1 text-xs">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="text-[11px] text-slate-500">
                        ₱{item.unitPrice.toFixed(2)} × {item.quantity} {item.unit || 'pcs'}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-700">
                      ₱{(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Digital Pickup QR Code */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-slate-500 font-semibold mb-2">
                Fast Counter QR Pass
              </span>
              <div className="p-2 bg-white rounded-xl shadow-md inline-block">
                <QRCodeRenderer
                  value={`HENZ-ORD:${selectedOrder.orderNumber}|${selectedOrder.customerName}|${selectedOrder.totalAmount}`}
                  size={120}
                />
              </div>
              <p className="font-mono text-xs font-bold text-teal-600 mt-2">
                {selectedOrder.orderNumber}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Show this QR at the counter to ring up your order in 1 second.
              </p>

              <button
                onClick={() => window.print()}
                className="mt-3 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-teal-600" />
                <span>Print Stub</span>
              </button>
            </div>
          </div>

          {/* Footer Back Button */}
          {onNewOrderClick && (
            <div className="pt-2 flex justify-between items-center text-xs">
              <button
                onClick={onNewOrderClick}
                className="text-teal-600 hover:text-teal-700 font-medium transition flex items-center gap-1 cursor-pointer"
              >
                ← Place Another Order / Edit Kit
              </button>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setSearchQuery('');
                  setSearched(false);
                }}
                className="text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                Search Different Order
              </button>
            </div>
          )}
        </div>
      ) : searched ? (
        /* Not found notice */
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Order Not Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            We couldn't find an active order matching "<span className="text-slate-900 font-semibold">{searchQuery}</span>". Please verify your order number (e.g. HENZ-ORD-2026-XXXX) or try searching with your full name.
          </p>
          {onNewOrderClick && (
            <button
              onClick={onNewOrderClick}
              className="mt-2 px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow transition cursor-pointer"
            >
              Start New Medical Supplies Order
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};
