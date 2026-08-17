import React from 'react';
import { Plus, X, ShoppingCart } from 'lucide-react';
import { usePOS } from '../../context/POSContext';

export const MultiCartTabs: React.FC = () => {
  const { heldCarts, activeCartIndex, setActiveCartIndex, addNewCart, closeCart } = usePOS();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 bg-slate-50 p-2 rounded-t-2xl">
      {heldCarts.map((cart, idx) => {
        const isActive = idx === activeCartIndex;
        const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

        return (
          <div
            key={cart.id}
            onClick={() => setActiveCartIndex(idx)}
            className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border shrink-0 ${
              isActive
                ? 'bg-white text-slate-900 border-emerald-600 shadow-xs ring-1 ring-emerald-500/20'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShoppingCart className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="max-w-[110px] truncate">{cart.name}</span>
            </div>

            <div className="flex items-center gap-1">
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {itemCount}
              </span>

              {subtotal > 0 && (
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline font-semibold">
                  ₱{subtotal.toLocaleString()}
                </span>
              )}

              {/* Close Tab Button */}
              {heldCarts.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeCart(cart.id);
                  }}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-slate-200 transition ml-0.5 cursor-pointer"
                  title="Close and park this cart"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add New Order Tab Button */}
      <button
        type="button"
        onClick={() => addNewCart()}
        className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 bg-white rounded-xl transition border border-dashed border-slate-300 shrink-0 cursor-pointer"
        title="Hold current cart & serve another customer"
      >
        <Plus className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">New Cart</span>
      </button>
    </div>
  );
};
