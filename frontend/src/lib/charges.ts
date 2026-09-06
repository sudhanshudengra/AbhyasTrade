import { ChargeBreakdown, RoundtripEstimate, ProductType, OrderSide } from './types';

/**
 * Deterministic standard discount brokerage & regulatory charges for Indian Equity (NSE).
 * Replicates the standard Indian discount broker model (₹0 Delivery, min(0.03%, ₹20) Intraday)
 * along with official NSE, SEBI, Stamp Duty, and GST statutory rules.
 */
export function calculateSingleLegCharges(
  symbol: string,
  side: OrderSide,
  productType: ProductType,
  quantity: number,
  price: number
): ChargeBreakdown {
  const safeQty = Math.max(0, quantity);
  const safePrice = Math.max(0, price);
  const turnover = safeQty * safePrice;

  // 1. Brokerage
  let brokerage = 0.0;
  if (productType === 'MIS') {
    // 0.03% or Rs. 20 per executed order, whichever is lower
    brokerage = Math.min(0.0003 * turnover, 20.0);
  } else {
    // Zero brokerage on Delivery (CNC)
    brokerage = 0.0;
  }

  // 2. STT / CTT (Securities Transaction Tax)
  let stt = 0.0;
  if (productType === 'MIS') {
    // 0.025% on Sell side only for Intraday
    stt = side === 'SELL' ? 0.00025 * turnover : 0.0;
  } else {
    // 0.1% on both Buy and Sell side for Equity Delivery
    stt = 0.001 * turnover;
  }

  // 3. Exchange Turnover Charge (NSE: 0.00297%)
  const exchangeCharges = 0.0000297 * turnover;

  // 4. SEBI Charges (Rs 10 per crore = 0.0001%)
  const sebiCharges = 0.000001 * turnover;

  // 5. Stamp Duty (State Stamp Duty - Buy side only)
  let stampDuty = 0.0;
  if (side === 'BUY') {
    if (productType === 'MIS') {
      // 0.003% or Rs 300 / crore on buy side
      stampDuty = 0.00003 * turnover;
    } else {
      // 0.015% or Rs 1500 / crore on buy side
      stampDuty = 0.00015 * turnover;
    }
  }

  // 6. GST (18% on Brokerage + Exchange Turnover Charges + SEBI Charges)
  const gst = 0.18 * (brokerage + exchangeCharges + sebiCharges);

  // 7. Total Charges
  const totalCharges = Number((brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst).toFixed(2));
  const breakevenPnl = safeQty > 0 ? Number((totalCharges / safeQty).toFixed(2)) : 0.0;

  return {
    turnover: Number(turnover.toFixed(2)),
    brokerage: Number(brokerage.toFixed(2)),
    stt: Number(stt.toFixed(2)),
    exchange_charges: Number(exchangeCharges.toFixed(2)),
    sebi_charges: Number(sebiCharges.toFixed(2)),
    stamp_duty: Number(stampDuty.toFixed(2)),
    gst: Number(gst.toFixed(2)),
    total_charges: totalCharges,
    breakeven_pnl: breakevenPnl,
  };
}

export function calculateRoundtripCharges(
  symbol: string,
  productType: ProductType,
  quantity: number,
  buyPrice: number,
  sellPrice: number
): RoundtripEstimate {
  const safeQty = Math.max(0, quantity);
  const safeBuyPrice = Math.max(0, buyPrice);
  const safeSellPrice = Math.max(0, sellPrice);

  const buyLeg = calculateSingleLegCharges(symbol, 'BUY', productType, safeQty, safeBuyPrice);
  const sellLeg = calculateSingleLegCharges(symbol, 'SELL', productType, safeQty, safeSellPrice);

  const totalTurnover = Number((buyLeg.turnover + sellLeg.turnover).toFixed(2));
  const totalBrokerage = Number((buyLeg.brokerage + sellLeg.brokerage).toFixed(2));
  const totalStt = Number((buyLeg.stt + sellLeg.stt).toFixed(2));
  const totalExchange = Number((buyLeg.exchange_charges + sellLeg.exchange_charges).toFixed(2));
  const totalSebi = Number((buyLeg.sebi_charges + sellLeg.sebi_charges).toFixed(2));
  const totalStamp = Number((buyLeg.stamp_duty + sellLeg.stamp_duty).toFixed(2));
  const totalGst = Number((buyLeg.gst + sellLeg.gst).toFixed(2));
  const totalCharges = Number((buyLeg.total_charges + sellLeg.total_charges).toFixed(2));

  const grossPnl = Number(((safeSellPrice - safeBuyPrice) * safeQty).toFixed(2));
  const netPnl = Number((grossPnl - totalCharges).toFixed(2));
  const breakevenPoints = safeQty > 0 ? Number((totalCharges / safeQty).toFixed(2)) : 0.0;

  return {
    buy_turnover: buyLeg.turnover,
    sell_turnover: sellLeg.turnover,
    total_turnover: totalTurnover,
    brokerage: totalBrokerage,
    stt: totalStt,
    exchange_charges: totalExchange,
    sebi_charges: totalSebi,
    stamp_duty: totalStamp,
    gst: totalGst,
    total_charges: totalCharges,
    breakeven_points: breakevenPoints,
    net_pnl: netPnl,
    gross_pnl: grossPnl,
  };
}
