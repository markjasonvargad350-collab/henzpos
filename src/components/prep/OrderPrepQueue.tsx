import React, { useState } from 'react';
import {
  PackageCheck,
  Clock,
  CheckCircle,
  QrCode,
  Search,
  Building2,
  Phone,
  User,
  ShoppingBag,
  ArrowRight,
  Printer,
  CheckSquare,
  Square,
  AlertCircle,
  Mail,
  Send,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { CustomerPreOrder, PreOrderStatus } from '../../types';
import { QRCodeRenderer } from '../common/QRCodeRenderer';
import {
  sendEmailNotification,
  openClientEmail,
  openGmailWeb,
  generatePickupEmailContent,
  getEmailSettings,
} from '../../utils/emailNotifier';
import { soundEffects } from '../../utils/audio';

export const OrderPrepQueue: React.FC = () => {
  const { preOrders, updatePreOrderStatus, loadPreOrderIntoCart, setActiveView } = usePOS();
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForPacking, setSelectedOrderForPacking] = useState<CustomerPreOrder | null>(null);
  const [activeQRModalOrder, setActiveQRModalOrder] = useState<CustomerPreOrder | null>(null);
  const [emailAlertStatus, setEmailAlertStatus] = useState<{ [orderId: string]: string }>({});

  const filteredOrders = preOrders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.email && order.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      order.schoolOrClinic.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch =
      selectedBranchFilter === 'All' ||
      (selectedBranchFilter === 'Main' && order.pickupBranch.includes('Main Branch')) ||
      (selectedBranchFilter === 'USA' && order.pickupBranch.includes('USA Branch'));

    return matchesSearch && matchesBranch;
  });

  const pendingOrders = filteredOrders.filter((o) => o.orderStatus === 'Pending');
  const preparingOrders = filteredOrders.filter((o) => o.orderStatus === 'Preparing');
  const readyOrders = filteredOrders.filter((o) => o.orderStatus === 'Ready for Pickup');
  const claimedOrders = filteredOrders.filter((o) => o.orderStatus === 'Claimed');

  const handleStartPreparing = (order: CustomerPreOrder) => {
    updatePreOrderStatus(order.id, 'Preparing');
    setSelectedOrderForPacking({ ...order, orderStatus: 'Preparing' });
  };

  const handleTogglePackItem = (order: CustomerPreOrder, productId: string) => {
    const currentPacked = order.packedItemIds || [];
    const isPacked = currentPacked.includes(productId);
    const updated = isPacked
      ? currentPacked.filter((id) => id !== productId)
      : [...currentPacked, productId];

    updatePreOrderStatus(order.id, order.orderStatus, updated);
    if (selectedOrderForPacking && selectedOrderForPacking.id === order.id) {
      setSelectedOrderForPacking({ ...selectedOrderForPacking, packedItemIds: updated });
    }
  };

  const handleMarkReady = async (order: CustomerPreOrder) => {
    updatePreOrderStatus(order.id, 'Ready for Pickup');
    setSelectedOrderForPacking(null);
    soundEffects.playBeepSuccess();

    // Auto-send email notification if email exists and auto-send is enabled
    const emailSettings = getEmailSettings();
    if (order.email && emailSettings.enabled && emailSettings.autoSendOnReady) {
      const emailContent = generatePickupEmailContent(
        order.orderNumber,
        order.customerName,
        order.pickupBranch,
        order.totalAmount,
        order.items
      );

      const res = await sendEmailNotification(
        order.email,
        order.customerName,
        order.orderNumber,
        emailContent.subject,
        emailContent.body,
        'Ready for Pickup'
      );

      setEmailAlertStatus((prev) => ({
        ...prev,
        [order.id]: res.success ? 'Email Alert Dispatched' : 'Email Ready',
      }));
    }
  };

  const handleSendEmailNotice = (order: CustomerPreOrder) => {
    const targetEmail = order.email || '';
    if (!targetEmail) {
      alert('No email address was provided with this order.');
      return;
    }

    const emailContent = generatePickupEmailContent(
      order.orderNumber,
      order.customerName,
      order.pickupBranch,
      order.totalAmount,
      order.items
    );

    openGmailWeb(targetEmail, emailContent.subject, emailContent.body);
    setEmailAlertStatus((prev) => ({ ...prev, [order.id]: 'Opened in Webmail' }));
  };

  const handleDirectPOSCheckout = (order: CustomerPreOrder) => {
    loadPreOrderIntoCart(order.id);
    setActiveView('pos');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 text-[#c9d1d9]">
      {/* Header */}
      <div className="bg-[#161b22] p-5 rounded-2xl border border-[#30363d] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Pre-Order Packing & Pickup Preparation Desk
            </h2>
            <p className="text-xs text-gray-400">
              Staff staging desk: Pre-pack student 50+ item checklists ahead of pickup (Option 1)
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student / order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500 w-56 placeholder:text-gray-600 font-medium"
            />
          </div>

          <div className="flex items-center bg-[#0d1117] p-0.5 rounded-lg border border-[#30363d]">
            <button
              onClick={() => setSelectedBranchFilter('All')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                selectedBranchFilter === 'All'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All Hubs
            </button>
            <button
              onClick={() => setSelectedBranchFilter('Main')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                selectedBranchFilter === 'Main'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Main Branch
            </button>
            <button
              onClick={() => setSelectedBranchFilter('USA')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                selectedBranchFilter === 'USA'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              USA Branch (Gym)
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stage 1: Pending Orders */}
        <div className="bg-[#161b22] p-4 rounded-2xl border border-[#30363d] space-y-3 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>1. Pending ({pendingOrders.length})</span>
            </div>
            <span className="text-[11px] text-gray-400">Awaiting Packing</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#0d1117] p-3.5 rounded-xl border border-[#30363d] shadow-sm space-y-2 hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      {order.orderNumber}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-1.5">{order.customerName}</h4>
                    <p className="text-[10px] text-gray-400">{order.schoolOrClinic}</p>
                  </div>
                  <button
                    onClick={() => setActiveQRModalOrder(order)}
                    className="p-1 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition cursor-pointer"
                    title="View QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-[#30363d]">
                  <span>{order.totalItems} items</span>
                  <span className="font-bold text-white font-mono">₱{order.totalAmount.toLocaleString()}</span>
                </div>

                <button
                  onClick={() => handleStartPreparing(order)}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-amber-950/40"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Start Pre-Packing</span>
                </button>
              </div>
            ))}
            {pendingOrders.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">No pending orders in queue</p>
            )}
          </div>
        </div>

        {/* Stage 2: Preparing / Packing Desk */}
        <div className="bg-[#161b22] p-4 rounded-2xl border border-amber-500/40 space-y-3 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>2. Packing ({preparingOrders.length})</span>
            </div>
            <span className="text-[11px] text-amber-400">Staff Bagging</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {preparingOrders.map((order) => {
              const packedCount = (order.packedItemIds || []).length;
              const allPacked = packedCount >= order.items.length;

              return (
                <div
                  key={order.id}
                  className="bg-[#0d1117] p-3.5 rounded-xl border border-amber-500/50 shadow-sm space-y-2.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">
                        {order.orderNumber}
                      </span>
                      <h4 className="text-xs font-bold text-white mt-1.5">{order.customerName}</h4>
                      <p className="text-[10px] text-gray-400">{order.pickupBranch}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      {packedCount}/{order.items.length} packed
                    </span>
                  </div>

                  {/* Checklist items ticking mini list */}
                  <div className="space-y-1 bg-[#0a0b0d] p-2 rounded-lg border border-[#30363d] max-h-32 overflow-y-auto">
                    {order.items.map((item) => {
                      const isPacked = (order.packedItemIds || []).includes(item.productId);
                      return (
                        <div
                          key={item.productId}
                          onClick={() => handleTogglePackItem(order, item.productId)}
                          className="flex items-center gap-1.5 text-[10px] text-gray-300 cursor-pointer hover:text-emerald-400"
                        >
                          {isPacked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                          )}
                          <span className={isPacked ? 'line-through text-gray-500' : 'font-medium'}>
                            {item.quantity}x {item.productName}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleMarkReady(order)}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-emerald-950/40"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Packed & Ready for Pickup</span>
                  </button>
                </div>
              );
            })}
            {preparingOrders.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">No orders currently packing</p>
            )}
          </div>
        </div>

        {/* Stage 3: Ready for Pickup (Customer Arrives & Scans QR) */}
        <div className="bg-[#161b22] p-4 rounded-2xl border border-emerald-500/40 space-y-3 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>3. Ready for Pickup ({readyOrders.length})</span>
            </div>
            <span className="text-[11px] text-emerald-400">Box/Bag Staged</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#0d1117] p-3.5 rounded-xl border border-emerald-500/50 shadow-sm space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-white bg-emerald-700 px-1.5 py-0.5 rounded">
                      {order.orderNumber}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-1.5">{order.customerName}</h4>
                    {order.email ? (
                      <p className="text-[10px] text-teal-400 font-mono flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-teal-400" />
                        <span className="truncate max-w-[140px]">{order.email}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400">{order.contactNumber}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveQRModalOrder(order)}
                    className="p-1 text-emerald-400 hover:bg-[#21262d] rounded transition cursor-pointer"
                    title="View QR Slip"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] bg-[#0a0b0d] p-2 rounded-lg border border-[#30363d] text-emerald-300 flex justify-between items-center">
                  <span>{order.totalItems} items ready in bag</span>
                  <span className="font-bold font-mono">₱{order.totalAmount.toLocaleString()}</span>
                </div>

                {/* Email Alert Action Bar */}
                {order.email && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSendEmailNotice(order)}
                      className="flex-1 py-1 px-2 bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 text-teal-300 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                      title="Open Webmail / Gmail with ready-for-pickup notice"
                    >
                      <Mail className="w-3 h-3 text-teal-400" />
                      <span>{emailAlertStatus[order.id] || 'Email Customer'}</span>
                    </button>
                  </div>
                )}

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleDirectPOSCheckout(order)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-emerald-950/40"
                  >
                    <span>Load to POS (1-Sec)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {readyOrders.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">No orders awaiting pickup</p>
            )}
          </div>
        </div>

        {/* Stage 4: Claimed & Completed */}
        <div className="bg-[#161b22] p-4 rounded-2xl border border-[#30363d] space-y-3 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-400 uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5 text-gray-500" />
              <span>4. Claimed ({claimedOrders.length})</span>
            </div>
            <span className="text-[11px] text-gray-500">Completed</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {claimedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#0d1117] p-3 rounded-xl border border-[#30363d] text-gray-300 space-y-1"
              >
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>{order.customerName}</span>
                  <span className="font-mono text-[10px] text-gray-500">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{order.schoolOrClinic}</span>
                  <span className="font-bold text-emerald-400 font-mono">₱{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {claimedOrders.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">No claimed orders yet</p>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Slip Viewer Modal */}
      {activeQRModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-sm rounded-2xl shadow-2xl border border-[#30363d] p-6 text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#30363d]">
              <span className="text-xs font-bold text-white">Pickup QR Slip</span>
              <button
                onClick={() => setActiveQRModalOrder(null)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="font-mono font-bold text-base text-white">{activeQRModalOrder.orderNumber}</h3>
              <p className="text-xs text-gray-400">{activeQRModalOrder.customerName}</p>
            </div>

            <div className="flex justify-center bg-white p-4 rounded-xl border border-gray-200">
              <QRCodeRenderer value={activeQRModalOrder.qrCodeValue} size={150} />
            </div>

            <p className="text-[11px] text-gray-400">
              Scan this code in POS to load all {activeQRModalOrder.totalItems} items in 1 second.
            </p>

            <button
              onClick={() => {
                handleDirectPOSCheckout(activeQRModalOrder);
                setActiveQRModalOrder(null);
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-950/40"
            >
              Load Directly in POS Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
