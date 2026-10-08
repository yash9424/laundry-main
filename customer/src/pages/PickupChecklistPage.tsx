import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PickupChecklist from "@/components/PickupChecklist";

/**
 * Step one of checkout: what to have ready before the captain arrives.
 *
 * This used to be half of a dialog stacked over the cart. A dialog has no
 * address of its own, so the hardware back button had nothing to go back to and
 * fell through to whatever the page behind it did -- which on the cart was to
 * close the app. As a screen it behaves like every other screen.
 */
const PickupChecklistPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const checkout = location.state;

  // Reached directly, with nothing picked: there is nothing to confirm
  if (!checkout?.cartItems?.length) {
    navigate('/cart', { replace: true });
    return null;
  }

  const pieces = checkout.cartItems.reduce(
    (n: number, item: any) => n + (Number(item.quantity) || 0), 0
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex items-center gap-3 border-b bg-white px-4 py-4 safe-top-header">
        <button onClick={() => navigate('/cart')} className="text-black flex-shrink-0" aria-label="Back to cart">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-black leading-tight">Before your pickup</h1>
          <p className="text-[11px] text-gray-500">Step 1 of 2</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        {/* plain: the screen's own header already carries the title, so the
            component should not print it a second time */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <PickupChecklist variant="plain" />
        </div>
      </div>

      <div className="sticky bottom-0 border-t bg-white px-4 pt-3 pb-5">
        <div className="flex items-center justify-between mb-2.5 text-sm">
          <span className="text-gray-600">{pieces} garment{pieces === 1 ? '' : 's'}</span>
          <span className="font-bold text-black">&#8377;{checkout.totalAmount}</span>
        </div>
        <button
          onClick={() => navigate('/pickup-slot', { state: checkout })}
          className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-lg"
          style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PickupChecklistPage;
