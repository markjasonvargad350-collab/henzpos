/**
 * Philippine Mobile Phone Number Validation & Telco Network Identifier
 * Supports Globe, TM, Smart, TNT, DITO, and Sun Cellular prefixes
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formattedNumber: string;
  carrier: 'Globe/TM' | 'Smart/TNT' | 'DITO' | 'Sun Cellular' | 'Unknown PH Telco' | 'Invalid';
  error?: string;
}

// Common Philippine Mobile Prefixes
const GLOBE_TM_PREFIXES = [
  '0905', '0906', '0915', '0916', '0917', '0926', '0927', '0935', '0936', '0937',
  '0945', '0955', '0956', '0965', '0966', '0967', '0975', '0977', '0995', '0997',
  '0953', '0954', '0976', '0978'
];

const SMART_TNT_PREFIXES = [
  '0907', '0908', '0909', '0910', '0912', '0918', '0919', '0920', '0921', '0928',
  '0929', '0930', '0938', '0939', '0946', '0947', '0948', '0949', '0950', '0951',
  '0961', '0963', '0968', '0969', '0970', '0971', '0981', '0989', '0998', '0999'
];

const DITO_PREFIXES = [
  '0991', '0992', '0993', '0994', '0895', '0896', '0897', '0898'
];

const SUN_PREFIXES = [
  '0922', '0923', '0924', '0925', '0931', '0932', '0933', '0934', '0940', '0941',
  '0942', '0943', '0944', '0973', '0974'
];

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove all spaces, hyphens, parentheses, and plus signs
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

  // Convert international +63 to local 0
  if (cleaned.startsWith('63')) {
    cleaned = '0' + cleaned.substring(2);
  }

  return cleaned;
}

export function validatePhilippineNumber(rawPhone: string): PhoneValidationResult {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      isValid: false,
      formattedNumber: '',
      carrier: 'Invalid',
      error: 'Phone number is required for SMS notification updates.',
    };
  }

  const cleaned = cleanPhoneNumber(rawPhone);

  // Must be 11 digits starting with 09 or 08
  if (!/^0[89]\d{9}$/.test(cleaned)) {
    return {
      isValid: false,
      formattedNumber: cleaned,
      carrier: 'Invalid',
      error: 'Must be an 11-digit Philippine mobile number (e.g. 09171234567).',
    };
  }

  const prefix4 = cleaned.substring(0, 4);

  let carrier: PhoneValidationResult['carrier'] = 'Unknown PH Telco';

  if (GLOBE_TM_PREFIXES.includes(prefix4)) {
    carrier = 'Globe/TM';
  } else if (SMART_TNT_PREFIXES.includes(prefix4)) {
    carrier = 'Smart/TNT';
  } else if (DITO_PREFIXES.includes(prefix4)) {
    carrier = 'DITO';
  } else if (SUN_PREFIXES.includes(prefix4)) {
    carrier = 'Sun Cellular';
  }

  // Format as 09XX-XXX-XXXX
  const formatted = `${cleaned.substring(0, 4)}-${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;

  return {
    isValid: true,
    formattedNumber: formatted,
    carrier,
  };
}
