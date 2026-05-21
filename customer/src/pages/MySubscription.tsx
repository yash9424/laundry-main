import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/config/api";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { generateSubscriptionInvoice } from "@/utils/generateSubscriptionInvoice";

const MySubscription = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [downloading, setDownloading] = useState(false);
  const customerName = localStorage.getItem("userName") || "Customer";
  const customerMobile = localStorage.getItem("userMobile") || "";

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    const customerId = localStorage.getItem("customerId");
    if (!customerId) { navigate("/login"); return; }
    try {
      const res = await fetch(`${API_URL}/api/subscriptions?customerId=${customerId}`);
      const data = await res.json();
      if (data.success) setSubscriptions(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const statusColor = (s: string) => s === "active" ? { bg: "#dcfce7", text: "#16a34a" } : s === "pending" ? { bg: "#fef3c7", text: "#d97706" } : { bg: "#fee2e2", text: "#dc2626" };

  return (
    <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
      <Header title="My Subscriptions" variant="gradient" />

      <div style={{ padding: "1.25rem" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div style={{ width: "36px", height: "36px", border: "3px solid #e2e8f0", borderTop: "3px solid #452D9B", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!loading && subscriptions.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📋</div>
            <p style={{ color: "#64748b", marginBottom: "1rem" }}>No subscriptions yet.</p>
            <button onClick={() => navigate("/subscriptions")} style={{ padding: "0.75rem 1.5rem", background: "linear-gradient(to right, #452D9B, #07C8D0)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" }}>
              Browse Plans
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {subscriptions.map((sub) => {
            const sc = statusColor(sub.status);
            return (
              <div key={sub._id} style={{ background: "white", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <h3 style={{ fontWeight: "700", fontSize: "1rem", color: "#1e293b", marginBottom: "0.2rem" }}>{sub.planName}</h3>
                    <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{formatDate(sub.purchasedAt)}</p>
                  </div>
                  <span style={{ background: sc.bg, color: sc.text, padding: "3px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", textTransform: "capitalize" }}>{sub.status}</span>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.875rem" }}>
                  <div style={{ flex: 1, background: "#f8fafc", borderRadius: "10px", padding: "0.625rem", textAlign: "center" }}>
                    <p style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "0.2rem" }}>Amount Paid</p>
                    <p style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>₹{sub.price}</p>
                  </div>
                  <div style={{ flex: 1, background: "#f0fdf4", borderRadius: "10px", padding: "0.625rem", textAlign: "center" }}>
                    <p style={{ fontSize: "0.7rem", color: "#86efac", marginBottom: "0.2rem" }}>Wallet Credited</p>
                    <p style={{ fontWeight: "700", color: "#16a34a", fontSize: "0.95rem" }}>₹{sub.walletCredited}</p>
                  </div>
                </div>

                <button onClick={() => setReceipt(sub)} style={{ width: "100%", padding: "0.5rem", background: "linear-gradient(to right, #452D9B, #07C8D0)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}>
                  View Receipt
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNavigation />

      {receipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "360px" }}>
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: "800", background: "linear-gradient(to right, #452D9B, #07C8D0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Urban Steam</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>Invoice / Receipt</div>
            </div>

            <div style={{ borderTop: "1px dashed #e2e8f0", borderBottom: "1px dashed #e2e8f0", padding: "1rem 0", marginBottom: "1.25rem" }}>
              {[
                ["Order #", receipt._id.slice(-8).toUpperCase()],
                ["Plan", receipt.planName],
                ["Date", formatDate(receipt.purchasedAt)],
                ["Amount Paid", `₹${receipt.price}`],
                ["Wallet Credited", `₹${receipt.walletCredited}`],
                ["Status", receipt.status],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{label}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: label === "Wallet Credited" ? "#16a34a" : "#1e293b", textTransform: "capitalize" }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={async () => {
                  setDownloading(true);
                  await generateSubscriptionInvoice(receipt, customerName, customerMobile);
                  setDownloading(false);
                }}
                disabled={downloading}
                style={{ flex: 1, padding: "0.75rem", background: downloading ? "#9ca3af" : "linear-gradient(to right, #452D9B, #07C8D0)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: downloading ? "not-allowed" : "pointer", fontSize: "0.9rem" }}
              >
                {downloading ? "Generating..." : "⬇ Download PDF"}
              </button>
              <button onClick={() => setReceipt(null)} style={{ flex: 1, padding: "0.75rem", background: "white", color: "#452D9B", border: "2px solid #452D9B", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "0.9rem" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySubscription;
