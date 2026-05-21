import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/config/api";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window { Razorpay: any; }
}

const Subscriptions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    loadRazorpay();
  }, []);

  const loadRazorpay = () => {
    if (document.getElementById("razorpay-script")) return;
    const s = document.createElement("script");
    s.id = "razorpay-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(s);
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscription-plans`);
      const data = await res.json();
      if (data.success) {
        const active = data.data.filter((p: any) => p.isActive);
        setPlans(active);
        if (active.length > 0) setSelected(active[0]._id);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleBuy = async (plan: any) => {
    const customerId = localStorage.getItem("customerId");
    if (!customerId) { navigate("/login"); return; }
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
        key: orderData.keyId, amount: orderData.amount, currency: orderData.currency,
        name: "Urban Steam", description: `${plan.name} Plan`, order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API_URL}/api/razorpay/verify-payment`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }),
            });
            if (!(await verifyRes.json()).success) throw new Error();
            await fetch(`${API_URL}/api/subscriptions`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ customerId, planId: plan._id, razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, status: "active" }),
            });
            toast({ title: `₹${plan.walletCredit} added to wallet!`, description: `${plan.name} activated.` });
            navigate("/my-subscription");
          } catch { toast({ title: "Payment error", description: "Contact support.", variant: "destructive" }); }
          finally { setBuying(null); }
        },
        modal: { ondismiss: () => setBuying(null) },
        prefill: { name: localStorage.getItem("userName") || "" },
        theme: { color: "#452D9B" },
      };
      new window.Razorpay(options).open();
    } catch {
      toast({ title: "Failed to initiate payment", variant: "destructive" });
      setBuying(null);
    }
  };

  const imgUrl = (url: string) => (!url ? "" : url.startsWith("http") ? url : `${API_URL}${url}`);
  const selectedPlan = plans.find(p => p._id === selected);

  return (
    <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
      <Header title="Top-Up Wallet" variant="gradient" />

      <div style={{ padding: "1.25rem 1.25rem 2rem" }}>

        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg, #452D9B 0%, #07C8D0 100%)", borderRadius: "20px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", bottom: -30, right: 40, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 0.3rem 0" }}>Wallet Top-Up</p>
          <h2 style={{ color: "white", fontSize: "1.3rem", fontWeight: "800", margin: "0 0 0.25rem 0" }}>Pay Less, Get More</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", margin: 0 }}>Recharge & save on every order</p>
        </div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #452D9B", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>💳</div>
            <p>No plans available right now.</p>
          </div>
        )}

        {/* Plan chips */}
        {plans.length > 0 && (
          <div style={{ display: "flex", gap: "0.6rem", overflowX: "auto", paddingBottom: "0.5rem", marginBottom: "1.25rem", scrollbarWidth: "none" }}>
            {plans.map(plan => (
              <button
                key={plan._id}
                onClick={() => setSelected(plan._id)}
                style={{
                  flexShrink: 0, padding: "0.5rem 1.1rem", borderRadius: "50px",
                  border: selected === plan._id ? "2px solid #452D9B" : "2px solid #e2e8f0",
                  background: selected === plan._id ? "linear-gradient(to right, #452D9B, #07C8D0)" : "white",
                  color: selected === plan._id ? "white" : "#64748b",
                  fontWeight: "700", fontSize: "0.82rem", cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all .2s",
                  boxShadow: selected === plan._id ? "0 4px 12px rgba(69,45,155,0.25)" : "none",
                }}
              >
                {plan.name}
              </button>
            ))}
          </div>
        )}

        {/* Selected plan card */}
        {selectedPlan && (
          <div style={{ background: "white", borderRadius: "24px", overflow: "hidden", boxShadow: "0 8px 32px rgba(69,45,155,0.12)", border: "1px solid rgba(69,45,155,0.08)", marginBottom: "1.25rem" }}>

            {/* Image / banner */}
            {selectedPlan.image ? (
              <img src={imgUrl(selectedPlan.image)} alt={selectedPlan.name} style={{ width: "100%", height: "170px", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ height: "170px", background: "linear-gradient(135deg, #452D9B 0%, #07C8D0 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.2)", borderRadius: "50px", padding: "3px 12px", fontSize: "0.72rem", color: "white", fontWeight: "700" }}>BEST VALUE</div>
                <div style={{ fontSize: "3rem" }}>💳</div>
                <p style={{ color: "white", fontWeight: "700", marginTop: "0.4rem" }}>{selectedPlan.name}</p>
              </div>
            )}

            <div style={{ padding: "1.25rem" }}>

              {/* Value pill */}
              <div style={{ background: "linear-gradient(to right, #f5f3ff, #ecfeff)", border: "1px solid rgba(69,45,155,0.12)", borderRadius: "14px", padding: "0.875rem 1rem", marginBottom: "1.1rem", textAlign: "center" }}>
                <p style={{ color: "#94a3b8", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.3rem" }}>You Pay → You Get</p>
                <p style={{ fontWeight: "900", fontSize: "1.4rem", color: "#1e293b", margin: 0 }}>
                  ₹{selectedPlan.price} <span style={{ color: "#cbd5e1" }}>→</span> <span style={{ background: "linear-gradient(to right, #452D9B, #07C8D0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>₹{selectedPlan.walletCredit}</span>
                </p>
                {selectedPlan.walletCredit > selectedPlan.price && (
                  <div style={{ marginTop: "0.4rem", display: "inline-block", background: "#dcfce7", borderRadius: "20px", padding: "2px 12px" }}>
                    <span style={{ color: "#16a34a", fontSize: "0.75rem", fontWeight: "700" }}>+₹{selectedPlan.walletCredit - selectedPlan.price} bonus free!</span>
                  </div>
                )}
              </div>

              {/* Benefits */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.25rem 0" }}>
                {selectedPlan.benefits.map((b: string, i: number) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ color: "#07C8D0", fontWeight: "800", flexShrink: 0 }}>✓</span>
                    <span style={{ color: "#475569", fontSize: "0.85rem" }}>{b}</span>
                  </li>
                ))}
              </ul>

              {/* Buy button */}
              <button
                onClick={() => handleBuy(selectedPlan)}
                disabled={buying === selectedPlan._id}
                style={{
                  width: "100%", padding: "0.9rem",
                  background: buying === selectedPlan._id ? "#9ca3af" : "linear-gradient(to right, #452D9B, #07C8D0)",
                  color: "white", border: "none", borderRadius: "14px",
                  fontWeight: "800", fontSize: "1rem", cursor: buying === selectedPlan._id ? "not-allowed" : "pointer",
                  boxShadow: buying === selectedPlan._id ? "none" : "0 8px 20px rgba(69,45,155,0.3)",
                }}
              >
                {buying === selectedPlan._id ? "Processing..." : `Recharge ₹${selectedPlan.price} →`}
              </button>
            </div>
          </div>
        )}

        {plans.length > 0 && (
          <button
            onClick={() => navigate("/my-subscription")}
            style={{ width: "100%", padding: "0.75rem", background: "white", color: "#452D9B", border: "2px solid #452D9B", borderRadius: "14px", fontWeight: "700", fontSize: "0.9rem", cursor: "pointer" }}
          >
            View My Subscriptions →
          </button>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Subscriptions;
