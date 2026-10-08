import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { API_URL } from '@/config/api';

interface TimeSlot {
  _id: string;
  time: string;
  type: string;
}

const PICKUP_DAYS = 4;

/**
 * Step two of checkout: which day and which window.
 *
 * Lifted out of the cart, where it lived inside a dialog. A dialog is not a
 * place you can go back to, so the hardware back button fell through to the
 * cart's own handler, which closed the app. As a screen, back simply returns
 * to the checklist.
 */
const PickupSlot = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const checkout = location.state as any;

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [dayIndex, setDayIndex] = useState(0);
  const [showSlotError, setShowSlotError] = useState(false);
  const [garmentConfirmed, setGarmentConfirmed] = useState(false);
  const [expressDeliveryFee, setExpressDeliveryFee] = useState(0);
  const [daySettings, setDaySettings] = useState({
    todaySlotsEnabled: true,
    tomorrowSlotsEnabled: true,
    expressCutoffHour: 18,
    expressLeadTimeMinutes: 90,
  });

  const pickupType: "now" | "later" = dayIndex === 0 ? "now" : "later";
  const isExpressSelected =
    typeof window !== 'undefined' && localStorage.getItem('selectedDeliveryType') === 'express';

  const items: any[] = checkout?.cartItems ?? [];
  const itemsTotal: number = Number(checkout?.totalAmount) || 0;
  const pieces = items.reduce((n, item) => n + (Number(item.quantity) || 0), 0);
  const orderTotal = itemsTotal + (isExpressSelected ? expressDeliveryFee : 0);

  useEffect(() => {
    if (!items.length) {
      navigate('/cart', { replace: true });
      return;
    }
    fetchDaySettings();
    fetchTimeSlots(0);
  }, []);

  const fetchDaySettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/order-charges`);
      const data = await res.json();
      if (data.success) {
        setDaySettings({
          todaySlotsEnabled: data.data.todaySlotsEnabled !== false,
          tomorrowSlotsEnabled: data.data.tomorrowSlotsEnabled !== false,
          expressCutoffHour: Number(data.data.expressCutoffHour ?? 18),
          expressLeadTimeMinutes: Number(data.data.expressLeadTimeMinutes ?? 90),
        });
        if (data.data?.expressDeliveryEnabled === false) setExpressDeliveryFee(0);
        else if (data.data?.expressDeliveryPrice) setExpressDeliveryFee(data.data.expressDeliveryPrice);
      }
    } catch {}
  };

  // If every slot today has already gone, open on the next date rather than
  // leaving the customer looking at a greyed-out list.
  const advanceIfDayIsOver = (slots: TimeSlot[], offset: number) => {
    if (offset !== 0 || slots.length === 0) return false;
    const anyLeft = slots.some((slot) => !isSlotPassed(slot.time));
    if (anyLeft) return false;
    setDayIndex(1);
    fetchTimeSlots(1);
    return true;
  };

  const fetchTimeSlots = async (offset: number) => {
    try {
      const serviceType = isExpressSelected ? 'express' : 'standard';
      const response = await fetch(
        `${API_URL}/api/time-slots?dayOffset=${offset}&serviceType=${serviceType}`
      );
      const data = await response.json();
      if (data.success) {
        if (advanceIfDayIsOver(data.data, offset)) return;
        setTimeSlots(data.data);
        const availableSlots = getAvailableSlots(data.data);
        setSelectedSlot(availableSlots.length > 0 ? availableSlots[0].time : '');
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
    }
  };

  const dayParts = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      top:
        offset === 0
          ? 'Today'
          : offset === 1
            ? 'Tomorrow'
            : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      bottom: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
  };

  const dayLabel = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const name =
      offset === 0
        ? 'Today'
        : offset === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-IN', { weekday: 'short' });
    return `${name}, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  // Slot labels are free text typed by the admin, so they turn up in several
  // shapes: "9:00 AM", "1-2pm", "10:00 AM - 12:00 PM". Returns minutes since
  // midnight, or null when nothing recognisable is in the string.
  const minutesFromLabel = (label: string, preferLast: boolean) => {
    const matches = [...String(label).matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)].filter(
      (m) => m[3] || m[2] || /\d/.test(m[1])
    );
    if (matches.length === 0) return null;

    const chosen = preferLast && matches.length > 1 ? matches[matches.length - 1] : matches[0];
    const period = (chosen[3] || matches[matches.length - 1][3] || '').toLowerCase();

    let hour = parseInt(chosen[1], 10);
    const minute = chosen[2] ? parseInt(chosen[2], 10) : 0;
    if (Number.isNaN(hour)) return null;

    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;

    return hour * 60 + minute;
  };

  // Same-day Express shuts at the cutoff hour, whatever slots remain on paper.
  const expressClosedForToday =
    isExpressSelected && new Date().getHours() >= daySettings.expressCutoffHour;

  const isSlotPassed = (slotTime: string) => {
    if (dayIndex > 0) return false;
    if (expressClosedForToday) return true;

    const isRange = /-/.test(slotTime);
    const slotMinutes = minutesFromLabel(slotTime, isRange);
    if (slotMinutes === null) return false;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const lead = isExpressSelected ? daySettings.expressLeadTimeMinutes : 0;
    return nowMinutes + lead >= slotMinutes;
  };

  const getAvailableSlots = (slots: TimeSlot[]) => slots.filter((slot) => !isSlotPassed(slot.time));

  const handleDayChange = (offset: number) => {
    setDayIndex(offset);
    setSelectedSlot('');
    fetchTimeSlots(offset);
  };

  const handleSlotSelection = (slotTime: string) => {
    if (isSlotPassed(slotTime) && pickupType === 'now') {
      setShowSlotError(true);
      setTimeout(() => setShowSlotError(false), 3000);
      return;
    }
    setSelectedSlot(slotTime);
  };

  const confirmOrder = () => {
    if (!selectedSlot || !garmentConfirmed) return;

    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + dayIndex);

    navigate('/continue-booking', {
      state: {
        cartItems: items,
        totalAmount: itemsTotal,
        pickupType,
        pickupDate: pickupDate.toISOString(),
        pickupDayLabel: dayLabel(dayIndex),
        selectedSlot,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    });
  };

  const dayClosed =
    (dayIndex === 0 && !daySettings.todaySlotsEnabled) ||
    (dayIndex === 1 && !daySettings.tomorrowSlotsEnabled);

  const canConfirm = Boolean(selectedSlot) && garmentConfirmed;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex items-center gap-3 border-b bg-white px-4 py-4 safe-top-header">
        <button onClick={() => navigate(-1)} className="text-black flex-shrink-0" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-black leading-tight">Select pickup slot</h1>
          <p className="text-[11px] text-gray-500">Step 2 of 2</p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={
            isExpressSelected
              ? { background: '#fef3c7', color: '#b45309' }
              : { background: '#ede9fe', color: '#452D9B' }
          }
        >
          {isExpressSelected ? 'EXPRESS' : 'STANDARD'}
        </span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-2">Pickup date</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
            {Array.from({ length: PICKUP_DAYS }, (_, offset) => {
              const parts = dayParts(offset);
              const selected = dayIndex === offset;
              const disabled =
                (offset === 0 && !daySettings.todaySlotsEnabled) ||
                (offset === 1 && !daySettings.tomorrowSlotsEnabled);
              return (
                <button
                  key={offset}
                  onClick={() => !disabled && handleDayChange(offset)}
                  disabled={disabled}
                  className={`flex-shrink-0 min-w-[78px] rounded-2xl py-2 px-3 text-center shadow-sm ${
                    disabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : selected
                        ? 'text-white'
                        : 'bg-white border border-gray-300'
                  }`}
                  style={
                    !disabled && selected
                      ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' }
                      : !disabled
                        ? { color: '#452D9B' }
                        : undefined
                  }
                >
                  <span className="block text-[11px] font-medium opacity-90">{parts.top}</span>
                  <span className="block text-sm font-bold">{parts.bottom}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-black mb-3">Slots for {dayLabel(dayIndex)}</h2>
          {dayClosed ? (
            <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-center">
              <p className="text-orange-600 font-semibold text-sm">
                Pickup on {dayLabel(dayIndex)} is currently unavailable.
              </p>
              <p className="text-orange-500 text-xs mt-1">Please pick another day.</p>
            </div>
          ) : timeSlots.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No slots for this day.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => {
                const gone = isSlotPassed(slot.time) && pickupType === 'now';
                const chosen = selectedSlot === slot.time;
                return (
                  <button
                    key={slot._id}
                    onClick={() => handleSlotSelection(slot.time)}
                    disabled={gone}
                    className={`h-10 rounded-2xl font-semibold text-xs w-full ${
                      gone
                        ? 'bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed'
                        : chosen
                          ? 'text-white shadow-md'
                          : 'bg-white border border-gray-300 text-black'
                    }`}
                    style={
                      chosen && !gone
                        ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' }
                        : {}
                    }
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
          {showSlotError && (
            <p className="mt-3 text-xs text-red-600 text-center">
              That slot has already passed. Please pick a later one.
            </p>
          )}
          {selectedSlot && (
            <p className="mt-3 text-xs font-semibold" style={{ color: '#452D9B' }}>
              Selected: {dayLabel(dayIndex)}, {selectedSlot}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-black mb-2">Order summary</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {pieces} garment{pieces === 1 ? '' : 's'}
              </span>
              <span className="text-black">&#8377;{itemsTotal}</span>
            </div>
            {isExpressSelected && expressDeliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Express delivery fee</span>
                <span className="text-black">+&#8377;{expressDeliveryFee}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t font-bold text-black">
              <span>Total</span>
              <span>&#8377;{orderTotal}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGarmentConfirmed(!garmentConfirmed)}
          className="w-full flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm text-left"
        >
          <span
            className="mt-0.5 w-5 h-5 flex-shrink-0 rounded flex items-center justify-center"
            style={{
              border: garmentConfirmed ? 'none' : '2px solid #9ca3af',
              background: garmentConfirmed
                ? 'linear-gradient(to right, #452D9B, #07C8D0)'
                : 'white',
            }}
          >
            {garmentConfirmed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
          </span>
          <span className="text-sm font-semibold text-black">
            I confirm I have added all my clothes for steam ironing.
          </span>
        </button>

        <p className="text-xs text-gray-500 leading-relaxed">
          Our captain will only pick up the clothes added to your cart and confirmed in this order.
          This helps us maintain transparency and ensures your order is processed correctly.
        </p>
      </div>

      <div className="sticky bottom-0 border-t bg-white px-4 pt-3 pb-5">
        <button
          onClick={confirmOrder}
          disabled={!canConfirm}
          className={`w-full py-3.5 rounded-2xl font-semibold shadow-lg ${
            canConfirm ? 'text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          style={canConfirm ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : {}}
        >
          Confirm Order - &#8377;{orderTotal}
        </button>
        {selectedSlot && !garmentConfirmed && (
          <p className="text-[11px] text-gray-500 text-center mt-2">
            Please tick the confirmation above to continue.
          </p>
        )}
      </div>
    </div>
  );
};

export default PickupSlot;
