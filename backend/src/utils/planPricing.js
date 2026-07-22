// Shared pricing rules for turning a PricingPlan into invoice line items.
//
// Kept in one place because three code paths build invoices (invoiceGenerator for schools,
// computeInvoiceForSchool, and the individual/student generator). They previously each
// re-implemented the rules and drifted apart, which is how internal rows ended up billed.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Split a plan's line items into what a customer is billed vs the internal planning inputs.
 *
 * 'expense' rows are our own infrastructure costs and 'profit' is the per-school margin target;
 * neither is a chargeable line. The profit target is instead folded into the billable rates by
 * applyProfitTarget below, so the customer sees one inclusive price.
 */
function splitPlanItems(planLineItems = []) {
  const items = Array.isArray(planLineItems) ? planLineItems : [];
  const billableItems = items.filter((i) => !['expense', 'profit'].includes(i.metric));
  const profitRow = items.find((i) => i.metric === 'profit');
  return { billableItems, profitTarget: Number(profitRow?.unit_rate) || 0 };
}

/**
 * Fold the profit target into the billable line items so it is charged but never shown.
 *
 * The target is spread across items in proportion to what each already contributes, then baked
 * into the unit rate. Example — profit 1, one line of 2 buses at 1/bus:
 *   rate 1.00 -> 1.50/bus, quantity 2, amount 3.00
 * The rate is rounded first and the amount derived from it, so quantity × rate === amount always
 * reads correctly on the invoice; the trade-off is the total can differ from the target by a few
 * paise, which is fine for what is a planning figure.
 *
 * Effective (post-min_value) rates are used as the base so a min_value floor is preserved.
 *
 * @param {Array} lineItemsCalc computed items: { unit_rate, quantity, charge, ... }
 * @param {number} profitTarget total amount to distribute
 * @returns {Array} items with unit_rate/charge adjusted
 */
function applyProfitTarget(lineItemsCalc = [], profitTarget = 0) {
  const profit = Number(profitTarget) || 0;
  if (profit <= 0 || lineItemsCalc.length === 0) return lineItemsCalc;

  const subtotal = lineItemsCalc.reduce((s, i) => s + (Number(i.charge) || 0), 0);

  return lineItemsCalc.map((item) => {
    const charge = Number(item.charge) || 0;
    const quantity = Number(item.quantity) || 0;

    // Weight by contribution; if nothing is chargeable yet, split the target evenly.
    const share = subtotal > 0 ? charge / subtotal : 1 / lineItemsCalc.length;
    const itemProfit = profit * share;
    if (itemProfit <= 0) return item;

    // Derive from the effective rate so a min_value floor already applied is not undone.
    if (quantity > 0) {
      const effectiveRate = charge / quantity;
      const unit_rate = round2(effectiveRate + itemProfit / quantity);
      return { ...item, unit_rate, charge: round2(unit_rate * quantity) };
    }
    // Quantity 0 (e.g. a min_value-only row): nothing to divide by, so adjust the amount alone.
    return { ...item, charge: round2(charge + itemProfit) };
  });
}

module.exports = { splitPlanItems, applyProfitTarget, round2 };
