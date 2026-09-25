const formatDeadline = (d: Date) =>
  d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

interface ExpectedDeliveryInput {
  expectedDeliveryAt?: string | null;
  slotDate?: Date | string | null;
  slotText?: string | null;
  express?: boolean;
}

// Real deadline (fixed by the server at pickup) when available; otherwise an estimate
// from the END of the booked pickup slot + 12h (Express) / 24h (Standard).
export function getExpectedDeliveryText({ expectedDeliveryAt, slotDate, slotText, express }: ExpectedDeliveryInput): string {
  if (expectedDeliveryAt) return formatDeadline(new Date(expectedDeliveryAt));

  // Slot names are admin-typed ("9", "9-10", "9 AM - 10 AM", "9:30 AM - 10:30 AM"): the LAST time is the slot end
  const parts = String(slotText || '').match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM)?/gi) || [];
  const last = parts.length > 0 ? parts[parts.length - 1].match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i) : null;

  if (slotDate && last) {
    let endHour = parseInt(last[1], 10);
    const endMin = last[2] ? parseInt(last[2], 10) : 0;
    const period = last[3]?.toUpperCase();
    if (period === 'PM' && endHour !== 12) endHour += 12;
    else if (period === 'AM' && endHour === 12) endHour = 0;
    else if (!period && endHour >= 1 && endHour <= 6) endHour += 12; // no AM/PM: 1-6 means afternoon, 7-12 morning/noon

    const slotEnd = new Date(slotDate);
    slotEnd.setHours(endHour, endMin, 0, 0);
    return `${formatDeadline(new Date(slotEnd.getTime() + (express ? 12 : 24) * 60 * 60 * 1000))} (est.)`;
  }

  return `Within ${express ? 12 : 24} hours of pickup`;
}
