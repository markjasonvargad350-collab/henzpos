/**
 * Branch identity — the single source of truth for which store is which.
 *
 * This lives in `lib/` rather than in POSContext so that plain utilities (receipt
 * printing, the email notifier) can resolve a branch without importing a React
 * context module. POSContext re-exports everything here, so existing
 * `import { BRANCH_MAIN } from '../context/POSContext'` call sites keep working.
 */
import { BranchName, BranchKey } from '../types';

export const BRANCH_MAIN: BranchName =
  'Main Branch - Casa Conching Bldg., Jalandoni St, Iloilo City Proper';
export const BRANCH_DJABEZ: BranchName =
  "D'Jabez Branch - D'Jabez Bldg., 21 Gen. Luna St., Iloilo City Proper";

/**
 * The retired label for the second branch. It exists only so documents written
 * before the correction still resolve to a real branch — nothing writes it.
 *
 * It was wrong twice over: the store is on Gen. Luna St., and the University of
 * San Agustin Gate 5 landmark it claimed actually belongs to Main, which faces it
 * from across Jalandoni St.
 */
const LEGACY_BRANCH_SECOND = 'USA Branch - In front of University of San Agustin Gate 5 (USA Gym)';

/** Human-readable street address, for receipts, emails and branch pickers. */
export const BRANCH_ADDRESS: Record<BranchKey, string> = {
  main: 'Casa Conching Bldg., Jalandoni St., Iloilo City Proper',
  djabez: "D'Jabez Bldg., 21 Gen. Luna St., Iloilo City Proper",
};

/** The landmark customers actually navigate by. */
export const BRANCH_LANDMARK: Record<BranchKey, string> = {
  main: 'in front of University of San Agustin Gate 5',
  djabez: 'in front of the Jalandoni Flyover & JD Bakeshop',
};

/**
 * Coerce a stored branch string into a current `BranchName`.
 *
 * Pre-orders and stock transfers already in Firestore may carry the retired
 * second-branch label, and a register may have it saved in localStorage. Mapping
 * on read means every filter and comparison keeps matching without rewriting
 * historical documents; each one migrates naturally the next time it is saved.
 * Anything unrecognised falls back to Main, which is where a walk-in sale belongs
 * if the label is missing or corrupt.
 */
export const normalizeBranch = (raw: string | null | undefined): BranchName =>
  raw === BRANCH_DJABEZ || raw === LEGACY_BRANCH_SECOND ? BRANCH_DJABEZ : BRANCH_MAIN;

/**
 * The product field holding a branch's stock — the ONLY place branch → field is
 * decided.
 *
 * This used to be inferred at each call site with
 * `activeBranch.includes('USA Branch') || activeBranch.includes('San Agustin')`.
 * Substring matching on a display label is fragile by construction, and the
 * branch correction proved it: Main's address names University of San Agustin
 * Gate 5, so that test matched MAIN and every Main-branch sale would have
 * deducted the other branch's stock. Exact equality cannot drift with wording.
 *
 * Note the field name still says "Usa" — that is the live Firestore field name on
 * every product document, kept because renaming it would mean rewriting the whole
 * catalogue. The name is legacy; the meaning is D'Jabez.
 */
export const branchStockField = (
  branch: BranchName
): 'stockMainBranch' | 'stockUsaBranch' =>
  branch === BRANCH_DJABEZ ? 'stockUsaBranch' : 'stockMainBranch';

/** `BranchKey` → full label. */
export const branchNameForKey = (key: BranchKey): BranchName =>
  key === 'djabez' ? BRANCH_DJABEZ : BRANCH_MAIN;

/** `BranchName` → short handle. */
export const branchKeyFor = (branch: BranchName): BranchKey =>
  branch === BRANCH_DJABEZ ? 'djabez' : 'main';

/** Short label for tables, chips and column headers. */
export const branchShortLabel: Record<BranchKey, string> = {
  main: 'Main Branch',
  djabez: "D'Jabez Branch",
};
