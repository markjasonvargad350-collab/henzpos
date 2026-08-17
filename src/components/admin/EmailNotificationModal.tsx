import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  RefreshCw,
  Copy,
  ExternalLink,
  Sliders,
  Inbox,
  AtSign,
  FileText,
} from 'lucide-react';
import {
  EmailSettings,
  EmailLogEntry,
  getEmailSettings,
  saveEmailSettings,
  getEmailLogs,
  sendEmailNotification,
  openClientEmail,
  openGmailWeb,
  generatePickupEmailContent,
} from '../../utils/emailNotifier';
import { soundEffects } from '../../utils/audio';

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailNotificationModal: React.FC<EmailNotificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'test' | 'logs'>('settings');
  const [settings, setSettings] = useState<EmailSettings>(getEmailSettings);
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test Email State
  const [testEmail, setTestEmail] = useState('student.nurse@usa.edu.ph');
  const [testName, setTestName] = useState('Maria Santos (BSN Level 2)');
  const [testOrderNum, setTestOrderNum] = useState('HENZ-ORD-2026-TEST');
  const [testSubject, setTestSubject] = useState(
    '[HENZ Health Care] Ready for Pickup: Order #HENZ-ORD-2026-TEST'
  );
  const [testBody, setTestBody] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getEmailSettings());
      setLogs(getEmailLogs());
      const sample = generatePickupEmailContent(
        testOrderNum,
        testName,
        'USA Branch - In front of University of San Agustin Gate 5 (USA Gym)',
        1850,
        [
          { productName: 'Aneroid Sphygmomanometer with Cuff', quantity: 1 },
          { productName: 'Dual-Head Clinical Stethoscope', quantity: 1 },
          { productName: 'Bandage Scissor 5.5" Stainless', quantity: 1 },
        ]
      );
      setTestSubject(sample.subject);
      setTestBody(sample.body);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveEmailSettings(settings);
    soundEffects.playBeepSuccess();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    setIsSending(true);
    setTestStatus('Dispatching email notification...');

    const res = await sendEmailNotification(
      testEmail,
      testName,
      testOrderNum,
      testSubject,
      testBody,
      'Ready for Pickup'
    );

    setIsSending(false);
    setTestStatus(res.message);
    setLogs(getEmailLogs());
    soundEffects.playQRScanChime();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Customer Email Notifications & Digital Invoices
                <span className="text-[10px] bg-teal-500/20 text-teal-300 font-mono px-2 py-0.5 rounded-full">
                  Automated Alerts
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Send pre-order ready alerts, electronic receipts, & university pickup notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'settings'
                ? 'border-teal-400 text-teal-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Email Settings
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'test'
                ? 'border-teal-400 text-teal-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Live Dispatch & Webmail
          </button>
          <button
            onClick={() => {
              setActiveTab('logs');
              setLogs(getEmailLogs());
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'logs'
                ? 'border-teal-400 text-teal-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Email Audit Logs ({logs.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Enable Automated Email Notifications</h4>
                    <p className="text-xs text-slate-400">
                      Dispatches email notices when staff marks a pre-order as "Ready for Pickup".
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Store / Organization Sender Name
                  </label>
                  <input
                    type="text"
                    value={settings.senderName}
                    onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Sender Outgoing Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.senderEmail}
                    onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Customer Reply-To Email
                </label>
                <input
                  type="email"
                  value={settings.replyToEmail}
                  onChange={(e) => setSettings({ ...settings, replyToEmail: e.target.value })}
                  placeholder="support@henzhealthcare.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5" /> Direct Web & Mail Client Integration
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The system enables 1-tap dispatch through default desktop and mobile mail clients (Apple Mail, Outlook, Thunderbird, iOS Mail, Android Gmail) as well as direct Gmail Web integration with formatted clinical pickup summaries.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Settings Saved!
                  </span>
                ) : (
                  <span></span>
                )}

                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-teal-500/20"
                >
                  Save Email Configuration
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LIVE TEST */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Recipient Customer Email
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="student.nurse@usa.edu.ph"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Recipient Customer / Student Name
                  </label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Email Body Content
                </label>
                <textarea
                  rows={8}
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-teal-500"
                />
              </div>

              {testStatus && (
                <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{testStatus}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={isSending}
                  className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-teal-500/20"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? 'Dispatching...' : 'Dispatch Test Email'}
                </button>

                <button
                  type="button"
                  onClick={() => openGmailWeb(testEmail, testSubject, testBody)}
                  className="bg-red-600/90 hover:bg-red-600 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                  title="Open Gmail in New Tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Gmail
                </button>

                <button
                  type="button"
                  onClick={() => openClientEmail(testEmail, testSubject, testBody)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-3.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                  title="Open Default Mail App"
                >
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  Default Mail Client
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2">
                <span className="text-xs text-slate-400">Total Email Notifications: {logs.length}</span>
                <button
                  onClick={() => setLogs(getEmailLogs())}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Logs
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                  <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No email notifications dispatched yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 hover:border-slate-700 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-teal-400">{log.recipientEmail}</span>
                          <span className="text-slate-400 font-medium">({log.recipientName})</span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                            {log.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                            {log.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-white">{log.subject}</p>
                      <p className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800/60 leading-relaxed">
                        {log.bodySnippet}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        <span>Order: <strong className="text-slate-400">{log.orderNumber}</strong></span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(log.bodySnippet);
                            soundEffects.playClick();
                          }}
                          className="hover:text-teal-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copy Content
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
