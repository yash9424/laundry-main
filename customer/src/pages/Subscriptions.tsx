import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/config/api";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Subscriptions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    loadRazorpay();
  }, []);

  const loadRazorpay = () => {
    if (document.getElementById("razorpay-script")) return;
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscription-plans`);
      const data = await res.json();
      if (data.success) setPlans(data.data.filter((p: any) => p.isActive));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (plan: any) => {
    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      navigate("/login");
      return;
    }
    setBuying(plan._id);
    try {
      const orderRes = await fetch(`${API_URL}/api/razorpay/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: plan.price, currency: "INR", receipt: `sub_${Date.now()}` }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error("Order creation failed");

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Urban Steam",
        description: `${plan.name} Plan`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API_URL}/api/razorpay/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) throw new Error("Verification failed");

            await fetch(`${API_URL}/api/subscriptions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId,
                planId: plan._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                status: "active",
              }),
            });

            toast({ title: `₹${plan.walletCredit} added to your wallet!`, description: `${plan.name} plan activated successfully.` });
          } catch (err) {
            toast({ title: "Payment error", description: "Please contact support.", variant: "destructive" });
          } finally {
            setBuying(null);
          }
        },
        modal: { ondismiss: () => setBuying(null) },
        prefill: { name: localStorage.getItem("userName") || "" },
        theme: { color: "#452D9B" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast({ title: "Failed to initiate payment", variant: "destructive" });
      setBuying(null);
    }
  };

  const imgUrl = (url: string) => (!url ? "" : url.startsWith("http") ? url : `${API_URL}${url}`);

  return (
    <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
      <Header title="Top-Up / Subscriptions" variant="gradient" />

      <div style={{ padding: "1.25rem" }}>
        <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1.25rem" }}>
          Recharge your wallet and save more on every order.
        </p>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div style={{ width: "36px", height: "36px", border: "3px solid #e2e8f0", borderTop: "3px solid #452D9B", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>💳</div>
            <p>No plans available right now.</p>
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "0.5rem", scrollSnapType: "x mandatory" }}>
          {plans.map((plan) => (
            <div
              key={plan._id}
              style={{
                minWidth: "280px",
                maxWidth: "300px",
                flexShrink: 0,
                background: "white",
                borderRadius: "20px",
                boxShadow: "0 4px 20px rgba(69,45,155,0.12)",
                overflow: "hidden",
                scrollSnapAlign: "start",
                border: "1px solid rgba(69,45,155,0.1)",
              }}
            >
              {plan.image ? (
                <img src={imgUrl(plan.image)} alt={plan.name} style={{ width: "100%", height: "160px", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "160px", background: "linear-gradient(135deg, #452D9B 0%, #07C8D0 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "3rem" }}>💳</span>
                </div>
              )}

              <div style={{ padding: "1.25rem" }}>
                <h3 style={{ fontWeight: "800", fontSize: "1.1rem", color: "#1e293b", marginBottom: "0.75rem" }}>{plan.name}</h3>

                <div style={{ background: "linear-gradient(to right, #452D9B, #07C8D0)", borderRadius: "12px", padding: "0.75rem 1rem", marginBottom: "1rem", textAlign: "center" }}>
                  <span style={{ color: "white", fontWeight: "800", fontSize: "1.05rem" }}>
                    Pay ₹{plan.price} → Get ₹{plan.walletCredit}
                  </span>
                </div>

                <ul style={{ marginBottom: "1.25rem", paddingLeft: 0 }}>
                  {plan.benefits.map((b: string, i: number) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", fontSize: "0.85rem", color: "#475569", marginBottom: "0.3rem" }}>
                      <span style={{ color: "#07C8D0", fontWeight: "800", flexShrink: 0 }}>✓</span>
                      {b}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleBuy(plan)}
                  disabled={buying === plan._id}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: buying === plan._id ? "#94a3b8" : "linear-gradient(to right, #452D9B, #07C8D0)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "700",
                    fontSize: "0.95rem",
                    cursor: buying === plan._id ? "not-allowed" : "pointer",
                    transition: "opacity 0.2s",
                  }}
                >
                  {buying === plan._id ? "Processing..." : "Buy Now"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {plans.length > 0 && (
          <button
            onClick={() => navigate("/my-subscription")}
            style={{ marginTop: "1.5rem", width: "100%", padding: "0.75rem", background: "white", color: "#452D9B", border: "2px solid #452D9B", borderRadius: "12px", fontWeight: "700", fontSize: "0.95rem", cursor: "pointer" }}
          >
            View My Subscriptions
          </button>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Subscriptions;
