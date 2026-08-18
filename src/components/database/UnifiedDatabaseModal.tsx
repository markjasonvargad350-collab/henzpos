import React, { useState, useRef } from 'react';
import { usePOS, BRANCH_MAIN, BRANCH_USA } from '../../context/POSContext';
import {
  Database,
  X,
  Server,
  Building2,
  ArrowLeftRight,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  Activity,
  Layers,
  ShoppingBag,
  FileSpreadsheet,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const UnifiedDatabaseModal: React.FC = () => {
  const {
    isDatabaseModalOpen,
    setIsDatabaseModalOpen,
    databaseMeta,
    products,
    transactions,
    preOrders,
    stockTransfers,
    exportDatabaseJSON,
    importDatabaseJSON,
    resetDatabaseToDefaults,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'architecture' | 'transfers' | 'backup'>('architecture');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isDatabaseModalOpen) return null;

  // Calculate live database metrics
  const mainStockTotal = products.reduce((acc, p) => acc + p.stockMainBranch, 0);
  const usaStockTotal = products.reduce((acc, p) => acc + p.stockUsaBranch, 0);
  const networkStockTotal = mainStockTotal + usaStockTotal;
  const inventoryValuePHP = products.reduce(
    (acc, p) => acc + (p.stockMainBranch + p.stockUsaBranch) * p.price,
    0
  );

  const mainTransactions = transactions.filter((t) => t.branch === BRANCH_MAIN);
  const usaTransactions = transactions.filter((t) => t.branch === BRANCH_USA);

  const mainPreOrders = preOrders.filter((po) => po.pickupBranch === BRANCH_MAIN);
  const usaPreOrders = preOrders.filter((po) => po.pickupBranch === BRANCH_USA);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          setImportStatus('Database successfully restored and synchronized across both branches.');
        } else {
          setImportStatus('Failed to parse database backup file. Please check file format.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      id="unified-database-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Unified Central Database Engine</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  1 DB • 2 Live Branches
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Single unified relational state powering both Main Branch (Casa Conching) and USA Branch (Gate 5)
              </p>
            </div>
          </div>

          <button
            id="close-db-modal-btn"
            onClick={() => setIsDatabaseModalOpen(false)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            id="db-tab-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'architecture'
                ? 'border-teal-600 text-teal-700 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            2-Branch Architecture & Metrics
          </button>

          <button
            id="db-tab-transfers"
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'transfers'
                ? 'border-teal-600 text-teal-700 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Inter-Branch Transfer Ledger ({stockTransfers.length})
          </button>

          <button
            id="db-tab-backup"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'backup'
                ? 'border-teal-600 text-teal-700 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Backup, Restore & Sync
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              {/* Architecture Diagram Card */}
              <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                      Real-Time Single-Database Topology
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Database ID: {databaseMeta.databaseId}</span>
                  </div>
                </div>

                {/* Visual Branch Nodes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* Branch 1 Node */}
                  <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        BRANCH 01 (MAIN)
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>
                    <h4 className="font-bold text-sm text-white">Casa Conching Bldg.</h4>
                    <p className="text-xs text-slate-400 mb-3">Jalandoni St, Iloilo City Proper</p>
                    <div className="space-y-1 text-xs border-t border-slate-700/60 pt-2 text-slate-300">
                      <div className="flex justify-between">
                        <span>Branch Stock:</span>
                        <span className="font-bold text-emerald-400">{mainStockTotal.toLocaleString()} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sales Completed:</span>
                        <span className="font-semibold text-white">{mainTransactions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Assigned Pre-Orders:</span>
                        <span className="font-semibold text-white">{mainPreOrders.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Central Database Core */}
                  <div className="bg-gradient-to-b from-teal-950 to-slate-900 border-2 border-teal-500/50 rounded-xl p-4 text-center shadow-lg relative">
                    <div className="w-10 h-10 mx-auto rounded-full bg-teal-500/20 border border-teal-400 flex items-center justify-center text-teal-300 mb-2">
                      <Database className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-teal-300">1 Centralized DB</h4>
                    <p className="text-[11px] text-slate-400">Single Source of Truth</p>
                    <div className="my-2 py-1 px-2 bg-slate-950/60 rounded border border-teal-500/30 text-xs font-mono text-teal-300">
                      {products.length} Unified SKUs
                    </div>
                    <p className="text-[10px] text-slate-400">Atomic Stock Transfers & Real-Time Sync</p>
                  </div>

                  {/* Branch 2 Node */}
                  <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        BRANCH 02 (USA)
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>
                    <h4 className="font-bold text-sm text-white">University of San Agustin</h4>
                    <p className="text-xs text-slate-400 mb-3">In front of Gate 5 (USA Gym)</p>
                    <div className="space-y-1 text-xs border-t border-slate-700/60 pt-2 text-slate-300">
                      <div className="flex justify-between">
                        <span>Branch Stock:</span>
                        <span className="font-bold text-emerald-400">{usaStockTotal.toLocaleString()} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sales Completed:</span>
                        <span className="font-semibold text-white">{usaTransactions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Assigned Pre-Orders:</span>
                        <span className="font-semibold text-white">{usaPreOrders.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium uppercase">Catalog Items</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">{products.length} SKUs</div>
                  <div className="text-xs text-slate-500 mt-0.5">Medical & Clinical grades</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium uppercase">Total Stock (2 Branches)</span>
                  </div>
                  <div className="text-xl font-bold text-emerald-700">{networkStockTotal.toLocaleString()} units</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {mainStockTotal} Main / {usaStockTotal} USA
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <ShoppingBag className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-medium uppercase">Total Sales Recorded</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">{transactions.length} receipts</div>
                  <div className="text-xs text-slate-500 mt-0.5">Across both counters</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-medium uppercase">Inventory Value</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">₱{inventoryValuePHP.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Total retail asset value</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Inter-Branch Stock Movement Ledger</h3>
                  <p className="text-xs text-slate-500">
                    Audit log of stock transfers between Casa Conching (Main) and San Agustin (USA Gate 5)
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {stockTransfers.length} Recorded Transfers
                </span>
              </div>

              {stockTransfers.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
                  No inter-branch transfers recorded yet. Transfers initiated in the Inventory tab will appear here.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Transfer Ref #</th>
                        <th className="p-3">Item & SKU</th>
                        <th className="p-3">Origin & Destination</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3">Authorized By</th>
                        <th className="p-3">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {stockTransfers.map((tr) => (
                        <tr key={tr.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-800">{tr.transferNumber}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{tr.productName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{tr.sku}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-medium text-slate-700 truncate max-w-[130px]">
                                {tr.fromBranch.includes('USA') ? 'USA Gate 5' : 'Main Branch'}
                              </span>
                              <ArrowLeftRight className="w-3 h-3 text-teal-600 shrink-0" />
                              <span className="font-medium text-slate-900 truncate max-w-[130px]">
                                {tr.toBranch.includes('USA') ? 'USA Gate 5' : 'Main Branch'}
                              </span>
                            </div>
                            {tr.notes && <div className="text-[10px] text-slate-400 italic mt-0.5">{tr.notes}</div>}
                          </td>
                          <td className="p-3 text-right font-bold text-teal-700 text-sm">
                            +{tr.quantity}
                          </td>
                          <td className="p-3 text-slate-600">{tr.transferredBy}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{tr.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-5">
              {importStatus && (
                <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center justify-between">
                  <span>{importStatus}</span>
                  <button
                    onClick={() => setImportStatus(null)}
                    className="text-teal-600 hover:text-teal-900 font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Export Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Download className="w-4 h-4 text-teal-600" />
                    Export Full Unified Database Backup (.JSON)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-lg">
                    Downloads an instant, complete snapshot of all products, stock levels for both branches, transactions, pre-orders, and transfer logs in standard JSON format.
                  </p>
                </div>
                <button
                  id="btn-export-db-json"
                  onClick={exportDatabaseJSON}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Download Backup
                </button>
              </div>

              {/* Import Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Import & Restore Unified Database
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-lg">
                    Upload a previously exported JSON backup file to overwrite and restore the entire dual-branch system state.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    id="btn-import-db-json"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all shrink-0"
                  >
                    <Upload className="w-4 h-4" />
                    Select JSON File
                  </button>
                </div>
              </div>

              {/* Reset to Standard Defaults Card */}
              <div className="bg-red-50/60 border border-red-200 rounded-xl p-5 flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-red-900 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Reset Dual-Branch Database to Initial Setup
                  </h4>
                  <p className="text-xs text-red-700 mt-1 max-w-lg">
                    Restores the catalog to the default 60 standard medical items with clean stock distribution between Casa Conching and San Agustin branches.
                  </p>
                </div>

                {isResetConfirmOpen ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        resetDatabaseToDefaults();
                        setIsResetConfirmOpen(false);
                        setImportStatus('Database successfully reset to initial clean dual-branch defaults.');
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={() => setIsResetConfirmOpen(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-reset-db-defaults"
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0"
                  >
                    <RefreshCw className="w-4 h-4 text-red-600" />
                    Reset Database
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 px-6 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Branch 1: Casa Conching (Jalandoni)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Branch 2: USA Gate 5 (Gym)
            </span>
          </div>

          <button
            onClick={() => setIsDatabaseModalOpen(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-all"
          >
            Close Monitor
          </button>
        </div>
      </div>
    </div>
  );
};
