import React, { useState } from 'react';
import { X, Search, ShoppingBag, Clock, CheckCircle2, User, Building, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { CustomerPreOrder } from '../../types';
import { soundEffects } from '../../utils/audio';

interface PendingPreOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PendingPreOrdersDrawer: React.FC<PendingPreOrdersDrawerProps> = ({ isOpen, onClose }) => {
  const { preOrders, products, loadPreOrderIntoCart, activeBranch } = usePOS();
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  if (!isOpen) return null;

  const filteredOrders = preOrders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      order.referenceCode.toLowerCase().includes(filterQuery.toLowerCase()) ||
      order.schoolOrClinic.toLowerCase().includes(filterQuery.toLowerCase()) ||
      order.contactNumber.includes(filterQuery);

    const matchesStatus =
      selectedStatus === 'All' || order.orderStatus === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleLoad = (order: CustomerPreOrder) => {
    const success = loadPreOrderIntoCart(order.id);
    if (success) {
      soundEffects.playSuccessPayment();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white text-slate-800 w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Student Pre-Orders & Checklists</h3>
              <p className="text-[11px] text-slate-400">
                1-Click Load into Cashier Register
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by student name, Ref #, school..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['All', 'Pending', 'Preparing', 'Ready for Pickup'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Order List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-300 stroke-1" />
              <p className="text-sm font-medium text-slate-600">No pre-orders found</p>
              <p className="text-xs text-slate-400">
                Try clearing your search query or check back once students submit checklists.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isMatchBranch = order.pickupBranch === activeBranch;
              return (
                <div
                  key={order.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {order.customerName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            order.orderStatus === 'Ready for Pickup'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.orderStatus === 'Preparing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{order.schoolOrClinic}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-600 font-bold">#{order.referenceCode}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900 font-mono block">
                        ₱{order.totalAmount.toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          order.paymentStatus === 'Paid'
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {order.paymentStatus === 'Paid' ? 'Paid in advance' : 'Pay at Counter'}
                      </span>
                    </div>
                  </div>

                  {/* Summary of Items */}
                  <div className="bg-slate-50 p-2 rounded-lg text-xs space-y-1 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Ordered Items ({order.items.length}):
                    </span>
                    <div className="space-y-0.5">
                      {order.items.slice(0, 3).map((item, idx) => {
                        const prod = products.find((p) => p.id === item.productId);
                        return (
                          <div key={idx} className="flex justify-between text-slate-700 text-[11px]">
                            <span className="truncate max-w-[240px]">
                              {item.quantity}x {prod ? prod.name : item.productId}
                            </span>
                            <span className="font-mono text-slate-500">
                              ₱{(item.quantity * item.unitPrice).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                      {order.items.length > 3 && (
                        <p className="text-[10px] text-slate-400 font-medium italic">
                          +{order.items.length - 3} more items...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      Target: {order.targetPickupDate}
                    </span>

                    <button
                      onClick={() => handleLoad(order)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Load into Register</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>{filteredOrders.length} pre-orders in queue</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
