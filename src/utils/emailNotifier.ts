/**
 * HENZ Health Care Products Trading - Customer Email Dispatch Engine
 * Supports Order Confirmations, "Ready for Pickup" Notifications, and Official Digital Receipts.
 */
import { BRANCH_DJABEZ, normalizeBranch } from '../lib/branches';

export interface EmailSettings {
  enabled: boolean;
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  smtpHost?: string;
  smtpPort?: number;
  apiKey?: string; // Resend / SendGrid / Custom provider API key
  provider: 'Direct Mailto / Web Client' | 'Custom API / Resend' | 'Internal Mailer';
  autoSendOnReady: boolean;
}

export interface EmailLogEntry {
  id: string;
  orderNumber: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  bodySnippet: string;
  timestamp: string;
  status: 'Sent' | 'Dispatched' | 'Opened in Mail Client' | 'Pending';
  type: 'Order Confirmation' | 'Ready for Pickup' | 'Receipt / Invoice' | 'Custom Notice';
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: true,
  senderName: 'HENZ Health Care Products Trading',
  senderEmail: 'orders@henzhealthcare.com',
  replyToEmail: 'support@henzhealthcare.com',
  provider: 'Direct Mailto / Web Client',
  autoSendOnReady: true,
};

const EMAIL_SETTINGS_KEY = 'henz_email_settings_v1';
const EMAIL_LOGS_KEY = 'henz_email_logs_v1';

export function getEmailSettings(): EmailSettings {
  try {
    const raw = localStorage.getItem(EMAIL_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load email settings:', e);
  }
  return DEFAULT_EMAIL_SETTINGS;
}

export function saveEmailSettings(settings: EmailSettings): void {
  try {
    localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save email settings:', e);
  }
}

export function getEmailLogs(): EmailLogEntry[] {
  try {
    const raw = localStorage.getItem(EMAIL_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load email logs:', e);
  }
  return [];
}

export function addEmailLog(entry: Omit<EmailLogEntry, 'id' | 'timestamp'>): void {
  try {
    const logs = getEmailLogs();
    const newEntry: EmailLogEntry = {
      ...entry,
      id: 'EML-' + Date.now().toString(36).toUpperCase(),
      timestamp: new Date().toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };
    const updated = [newEntry, ...logs.slice(0, 49)];
    localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to append email log:', e);
  }
}

/**
 * Generates an email subject & content for "Ready for Pickup" alert
 */
export function generatePickupEmailContent(
  orderNumber: string,
  customerName: string,
  pickupBranch: string,
  totalAmount: number,
  items?: { productName: string; quantity: number; unit?: string }[]
): { subject: string; body: string; htmlBody: string } {
  // Exact match, not a substring sniff. This used to test for "usa", which the
  // Main branch's own address now contains (it faces University of San Agustin
  // Gate 5) — that would have emailed customers the wrong pickup address and the
  // wrong hotline. `normalizeBranch` also folds the retired second-branch label
  // forward, so orders placed before the rename still address correctly.
  const isDjabez = normalizeBranch(pickupBranch) === BRANCH_DJABEZ;
  const branchName = isDjabez
    ? "D'Jabez Branch (D'Jabez Bldg., 21 Gen. Luna St.)"
    : 'Main Branch (Casa Conching Bldg.)';
  const branchAddress = isDjabez
    ? "D'Jabez Bldg., 21 Gen. Luna St., Iloilo City Proper — in front of the Jalandoni Flyover & JD Bakeshop"
    : 'Casa Conching Bldg., Jalandoni St., Iloilo City Proper — in front of University of San Agustin Gate 5';
  const branchHours = 'Mon - Sat: 8:00 AM - 6:00 PM';
  const hotline = isDjabez ? '(033) 330-4589 / 0917-882-4369' : '(033) 320-1928 / 0917-554-1290';

  const itemsListText = items && items.length > 0
    ? items.map(i => `  • ${i.quantity}x ${i.productName}`).join('\n')
    : '  • Medical & Clinical Kit Checklist Items';

  const subject = `[HENZ Health Care] Ready for Pickup: Order #${orderNumber} (${customerName})`;

  const body = `Dear ${customerName},

Good day! We are pleased to inform you that your medical supplies pre-order #${orderNumber} is now PACKED and READY FOR PICKUP.

============================================================
ORDER SUMMARY
============================================================
Order Number: ${orderNumber}
Customer: ${customerName}
Total Amount: PHP ${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}

Packed Items:
${itemsListText}

============================================================
PICKUP BRANCH & INSTRUCTIONS
============================================================
Designated Branch: ${branchName}
Address: ${branchAddress}
Store Hours: ${branchHours}
Branch Contact: ${hotline}

To claim your order:
1. Proceed to the cashier counter at the branch above.
2. Present this email or your Order Reference Code (${orderNumber}).
3. Settle any remaining balance (Cash or GCash accepted at counter).

Thank you for choosing HENZ Health Care Products Trading!

HENZ Health Care Team
Iloilo City, Philippines
Email: orders@henzhealthcare.com`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #14b8a6; margin: 0; font-size: 20px;">HENZ HEALTH CARE PRODUCTS TRADING</h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Medical Supplies • Clinical Kits • Hospital Essentials</p>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
        <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
          <h2 style="color: #166534; margin: 0; font-size: 16px;">✓ Your Order is Ready for Pickup!</h2>
          <p style="color: #15803d; margin: 4px 0 0 0; font-size: 13px;">Hi <strong>${customerName}</strong>, your clinical supplies have been inspected and prepared.</p>
        </div>

        <h3 style="font-size: 14px; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
          <tr><td style="padding: 6px 0; color: #64748b;">Order Reference:</td><td style="padding: 6px 0; font-weight: bold; font-family: monospace;">${orderNumber}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Total Amount:</td><td style="padding: 6px 0; font-weight: bold; color: #0f766e;">PHP ${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Pickup Branch:</td><td style="padding: 6px 0; font-weight: bold;">${branchName}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Branch Address:</td><td style="padding: 6px 0;">${branchAddress}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Operating Hours:</td><td style="padding: 6px 0;">${branchHours}</td></tr>
        </table>

        <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 12px; margin-top: 16px; font-size: 12px; color: #475569;">
          <strong>Pickup Reminder:</strong> Present your Order Number <code>${orderNumber}</code> at the counter. For queries, contact ${hotline}.
        </div>
      </div>
    </div>
  `;

  return { subject, body, htmlBody };
}

/**
 * Dispatches an email to the customer. Supports server-side API proxy or web mail client fallback.
 */
export async function sendEmailNotification(
  recipientEmail: string,
  recipientName: string,
  orderNumber: string,
  subject: string,
  body: string,
  type: EmailLogEntry['type'] = 'Ready for Pickup'
): Promise<{ success: boolean; message: string; method: string }> {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return {
      success: false,
      message: 'No valid recipient email address provided.',
      method: 'None',
    };
  }

  const settings = getEmailSettings();

  // Try server proxy first
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipientEmail,
        recipientName,
        orderNumber,
        subject,
        body,
        fromEmail: settings.senderEmail,
        fromName: settings.senderName,
        apiKey: settings.apiKey,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        addEmailLog({
          orderNumber,
          recipientName,
          recipientEmail,
          subject,
          bodySnippet: body.substring(0, 140) + '...',
          status: 'Sent',
          type,
        });
        return {
          success: true,
          message: `Email notification sent successfully to ${recipientEmail}.`,
          method: 'Server API',
        };
      }
    }
  } catch (err) {
    console.warn('Server email dispatch failed, recording log:', err);
  }

  // No server mailer is configured — the /api/send-email proxy above does not
  // exist in this deployment — so NOTHING was actually emailed. Record the intent
  // as Pending and report failure HONESTLY. The caller falls back to opening the
  // staff mail client ("Email Customer") so a real person sends it. Returning
  // success:true here used to make the app claim it had emailed the customer when
  // it never did.
  addEmailLog({
    orderNumber,
    recipientName,
    recipientEmail,
    subject,
    bodySnippet: body.substring(0, 140) + '...',
    status: 'Pending',
    type,
  });

  return {
    success: false,
    message: `No automatic mail server is set up, so nothing was sent yet. Use "Email Customer" to send this from your own mail app.`,
    method: 'None',
  };
}

/**
 * Opens the device's native or web mail client pre-filled with subject and body
 */
export function openClientEmail(to: string, subject: string, body: string): void {
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_blank');
}

/**
 * Opens Gmail Web pre-filled in a new tab
 */
export function openGmailWeb(to: string, subject: string, body: string): void {
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank');
}
