// Fee Helper Functions
// Centralized functions for fetching and displaying fees dynamically

import { insforge } from './insforge';

interface FeeCache {
  membership_application?: number;
  bible_school_with_acrp?: number;
  bible_school_without_acrp?: number;
  timestamp?: number;
}

// Cache fees for 5 minutes to reduce database calls
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let feeCache: FeeCache = {};

/**
 * Fetch application fee for membership
 */
export async function getMembershipApplicationFee(): Promise<number> {
  // Check cache first
  if (feeCache.membership_application && feeCache.timestamp && Date.now() - feeCache.timestamp < CACHE_DURATION) {
    return feeCache.membership_application;
  }

  try {
    const { data, error } = await insforge.database
      .from('fee_settings')
      .select('amount')
      .eq('fee_type', 'membership_application')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching membership application fee:', error);
      return feeCache.membership_application || 0;
    }

    const fee = parseFloat(data?.amount || '0') || 0;
    feeCache.membership_application = fee;
    feeCache.timestamp = Date.now();
    return fee;
  } catch (err) {
    console.error('Error fetching membership application fee:', err);
    return feeCache.membership_application || 0;
  }
}

/**
 * Fetch registration fees for Bible School
 */
export async function getBibleSchoolRegistrationFees(): Promise<{ withACRP: number; withoutACRP: number }> {
  // Check cache first
  if (feeCache.bible_school_with_acrp !== undefined && 
      feeCache.bible_school_without_acrp !== undefined && 
      feeCache.timestamp && 
      Date.now() - feeCache.timestamp < CACHE_DURATION) {
    return {
      withACRP: feeCache.bible_school_with_acrp,
      withoutACRP: feeCache.bible_school_without_acrp
    };
  }

  try {
    const { data, error } = await insforge.database
      .from('fee_settings')
      .select('fee_type, amount')
      .in('fee_type', ['bible_school_with_acrp', 'bible_school_without_acrp'])
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching Bible School registration fees:', error);
      return {
        withACRP: feeCache.bible_school_with_acrp || 0,
        withoutACRP: feeCache.bible_school_without_acrp || 0
      };
    }

    const fees = { withACRP: 0, withoutACRP: 0 };
    data?.forEach((fee: any) => {
      if (fee.fee_type === 'bible_school_with_acrp') {
        fees.withACRP = parseFloat(fee.amount) || 0;
        feeCache.bible_school_with_acrp = fees.withACRP;
      } else if (fee.fee_type === 'bible_school_without_acrp') {
        fees.withoutACRP = parseFloat(fee.amount) || 0;
        feeCache.bible_school_without_acrp = fees.withoutACRP;
      }
    });

    feeCache.timestamp = Date.now();
    return fees;
  } catch (err) {
    console.error('Error fetching Bible School registration fees:', err);
    return {
      withACRP: feeCache.bible_school_with_acrp || 0,
      withoutACRP: feeCache.bible_school_without_acrp || 0
    };
  }
}

/**
 * Format fee amount for display
 */
export function formatFee(amount: number): string {
  return `R ${amount.toFixed(2)}`;
}

/**
 * Clear fee cache (call this when admin updates fees)
 */
export function clearFeeCache(): void {
  feeCache = {};
}

/**
 * Get fee description text with dynamic amount
 */
export async function getMembershipFeeMessage(): Promise<string> {
  const fee = await getMembershipApplicationFee();
  if (fee > 0) {
    return `Please pay your application fee of ${formatFee(fee)} to complete your membership application.`;
  }
  return 'No application fee is required for membership.';
}

/**
 * Get Bible School fee message with dynamic amount
 */
export async function getBibleSchoolFeeMessage(option: 'with_acrp' | 'without_acrp'): Promise<string> {
  const fees = await getBibleSchoolRegistrationFees();
  const fee = option === 'with_acrp' ? fees.withACRP : fees.withoutACRP;
  if (fee > 0) {
    return `Registration fee required: ${formatFee(fee)}`;
  }
  return 'No registration fee is required.';
}

