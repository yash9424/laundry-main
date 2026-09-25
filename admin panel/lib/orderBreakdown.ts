export interface OrderBreakdown {
  subtotal: number;
  express: number;
  due: number;
  discount: number;
  total: number;
  wallet: number;
  paidOnline: number | null;
}

// Uses the breakdown saved on the order. Older orders have none, so the discount is
// derived from the total (items + due + Express - total) and wallet/online are unknown.
export function getOrderBreakdown(order: any): OrderBreakdown {
  const items: any[] = order?.items || [];
  const itemsSum = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  const total = Number(order?.totalAmount) || 0;
  const express = order?.expressDelivery ? Number(order?.expressDeliveryFee) || 0 : 0;
  const due = Number(order?.previousDuePaid) || 0;
  const saved = typeof order?.itemsSubtotal === 'number';

  const subtotal = saved ? order.itemsSubtotal : itemsSum;
  const discount = saved ? Number(order.discountAmount) || 0 : Math.max(0, subtotal + due + express - total);
  const wallet = saved ? Number(order.walletUsed) || 0 : 0;
  const paidOnline = saved ? Number(order.amountPaidOnline) || 0 : null;

  return { subtotal, express, due, discount, total, wallet, paidOnline };
}
