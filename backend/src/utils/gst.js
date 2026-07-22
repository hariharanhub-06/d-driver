// GST for OnLIVE PLATFORM charges (school platform invoices + individual/Super-Admin charges).
//
// School transport fees collected from parents are the SCHOOL's revenue under the school's own
// GSTIN — they are deliberately not taxed here.
//
// Supplier is registered in Tamil Nadu (GSTIN prefix 33), so intra-state supply is split
// CGST 9% + SGST 9%. Both halves are derived from one stored tax_amount so they can never
// disagree with the total.

const DEFAULT_GSTIN = '33KYIPS6905N1ZK';
const DEFAULT_GST_RATE = 18;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Read the GSTIN / rate, preferring what the super admin saved over the built-in defaults.
 * Never throws — a config read failure falls back to the defaults so billing continues.
 */
async function getGstConfig(prisma) {
  try {
    const cfg = await prisma.platformConfig.findUnique({
      where: { id: 'singleton' },
      select: { gstin: true, gst_rate: true },
    });
    return {
      gstin: cfg?.gstin || DEFAULT_GSTIN,
      rate: cfg?.gst_rate != null ? Number(cfg.gst_rate) : DEFAULT_GST_RATE,
    };
  } catch {
    return { gstin: DEFAULT_GSTIN, rate: DEFAULT_GST_RATE };
  }
}

/**
 * GST on the taxable value.
 *
 * Applied to the subtotal (the service value) only — a late-payment penalty is a charge for
 * delayed payment, not a supply of service, so it is not taxed.
 *
 * @param {number} taxableValue subtotal, before any overdue penalty
 * @param {number} rate percent (18)
 * @returns {{rate:number, amount:number, cgst:number, sgst:number}}
 */
function computeGst(taxableValue, rate = DEFAULT_GST_RATE) {
  const base = Number(taxableValue) || 0;
  const pct = Number(rate) || 0;
  if (base <= 0 || pct <= 0) return { rate: pct, amount: 0, cgst: 0, sgst: 0 };

  const amount = round2((base * pct) / 100);
  // Halve the rounded total so cgst + sgst === amount exactly, even when it is an odd number
  // of paise (the remainder goes to CGST).
  const sgst = round2(amount / 2);
  const cgst = round2(amount - sgst);
  return { rate: pct, amount, cgst, sgst };
}

/** Split an already-stored tax_amount for display. Keeps PDF and UI consistent with the DB. */
function splitGst(taxAmount) {
  const amount = Number(taxAmount) || 0;
  const sgst = round2(amount / 2);
  return { amount, cgst: round2(amount - sgst), sgst };
}

module.exports = { getGstConfig, computeGst, splitGst, DEFAULT_GSTIN, DEFAULT_GST_RATE };
