import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Download,
  Calendar,
  DollarSign,
  Smartphone,
  Building,
  GraduationCap,
  Flame,
  Search,
  Filter,
  CheckCircle2,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { PaymentMethod, SaleTransaction } from '../../types';
import { ReceiptModal } from '../pos/ReceiptModal';

export const ReportsView: React.FC = () => {
  const { transactions } = usePOS();
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReceiptTransaction, setActiveReceiptTransaction] = useState<SaleTransaction | null>(null);

  // Aggregations
  const totalSalesRevenue = transactions.reduce((acc, t) => acc + t.grandTotal, 0);
  const totalDiscountsGiven = transactions.reduce((acc, t) => acc + t.discountAmount, 0);
  const totalItemsSold = transactions.reduce((acc, t) => acc + t.totalItemCount, 0);

  const cashSales = transactions
    .filter((t) => t.paymentMethod === 'Cash')
    .reduce((acc, t) => acc + t.grandTotal, 0);

  const gcashSales = transactions
    .filter((t) => t.paymentMethod === 'GCash')
    .reduce((acc, t) => acc + t.grandTotal, 0);

  const bankSales = transactions
    .filter((t) => t.paymentMethod === 'Bank Payment')
    .reduce((acc, t) => acc + t.grandTotal, 0);

  // Top selling products count
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      if (!productSalesMap[item.product.id]) {
        productSalesMap[item.product.id] = { name: item.product.name, qty: 0, revenue: 0 };
      }
      productSalesMap[item.product.id].qty += item.quantity;
      productSalesMap[item.product.id].revenue += item.subtotal;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.referenceNumber && t.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPayment =
      selectedPaymentFilter === 'All' || t.paymentMethod === selectedPaymentFilter;

    return matchesSearch && matchesPayment;
  });

  const handleExportTransactionsCSV = () => {
    const headers = 'Receipt No,Date Time,Branch,Cashier,Customer Name,Customer Type,Payment Method,Ref Number,Total Items,Subtotal,Discount,Tax (12%),Grand Total\n';
    const rows = transactions
      .map(
        (t) =>
          `"${t.receiptNumber}","${t.timestamp}","${t.branch}","${t.cashierName}","${t.customerName.replace(/"/g, '""')}","${t.customerType}","${t.paymentMethod}","${t.referenceNumber || ''}",${t.totalItemCount},${t.subtotal},${t.discountAmount},${t.taxAmount},${t.grandTotal}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `HENZ_Sales_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 text-slate-800">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Medical Sales Analytics & BIR Audit Logs
            </h2>
            <p className="text-xs text-slate-500">
              HENZ Health Care Products Trading • Daily sales revenue, mode breakdown, and transaction receipts
            </p>
          </div>
        </div>

        <button
          onClick={handleExportTransactionsCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
          <span>Export Sales Audit CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Gross Revenue (VAT Incl)</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            ₱{totalSalesRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">{transactions.length} Transactions Completed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Cash Collections</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1 font-mono">
            ₱{cashSales.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">
            {totalSalesRevenue > 0 ? Math.round((cashSales / totalSalesRevenue) * 100) : 0}% of Total Volume
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">GCash QR Payments</span>
            <Smartphone className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-600 mt-1 font-mono">
            ₱{gcashSales.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">
            {totalSalesRevenue > 0 ? Math.round((gcashSales / totalSalesRevenue) * 100) : 0}% of Total Volume
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Bank Transfers</span>
            <Building className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-600 mt-1 font-mono">
            ₱{bankSales.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">
            {totalSalesRevenue > 0 ? Math.round((bankSales / totalSalesRevenue) * 100) : 0}% of Total Volume
          </span>
        </div>
      </div>

      {/* Top Fast-Moving Products Ranking */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Top Fast-Moving Medical Supplies Sold
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Ranked by unit volume</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topProducts.map((prod, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0 font-mono">
                  #{idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-900 truncate">{prod.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-extrabold text-emerald-600 block">{prod.qty} units</span>
                <span className="text-[10px] text-slate-500 font-mono">₱{prod.revenue.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between pb-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Sales Transactions Audit Trail ({filteredTransactions.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search receipt # / customer / ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-white text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 w-60 font-medium"
              />
            </div>

            <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-200">
              {['All', 'Cash', 'GCash', 'Bank Payment'].map((method) => (
                <button
                  key={method}
                  onClick={() => setSelectedPaymentFilter(method)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    selectedPaymentFilter === method
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Receipt No</th>
                <th className="py-2.5 px-3">Date / Time</th>
                <th className="py-2.5 px-3">Customer / Branch</th>
                <th className="py-2.5 px-3">Payment Mode & Ref</th>
                <th className="py-2.5 px-3 text-center">Items Qty</th>
                <th className="py-2.5 px-3 text-right">Grand Total</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-100 transition">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {tx.receiptNumber}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px]">
                    {tx.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{tx.customerName}</div>
                    <div className="text-[10px] text-slate-500">
                      {tx.customerType} • {tx.branch}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                        tx.paymentMethod === 'Cash'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : tx.paymentMethod === 'GCash'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {tx.paymentMethod}
                    </span>
                    {tx.referenceNumber && (
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Ref: {tx.referenceNumber}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                    {tx.totalItemCount} pcs ({tx.items.length} lines)
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 text-xs">
                    ₱{tx.grandTotal.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setActiveReceiptTransaction(tx)}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="View Full Sales Invoice Receipt"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal for Re-Printing */}
      <ReceiptModal
        isOpen={Boolean(activeReceiptTransaction)}
        transaction={activeReceiptTransaction}
        onClose={() => setActiveReceiptTransaction(null)}
      />
    </div>
  );
};
