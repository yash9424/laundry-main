"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from '@/config/api';

export default function Verify() {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const router = useRouter();
  const nextEmptyIndex = otp.findIndex((d) => d === "");

  useEffect(() => {
    const partnerMobile = localStorage.getItem("partnerMobile");
    if (partnerMobile) {
      setMobile(partnerMobile);
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const addDigit = (d: string) => {
    setOtp((prev) => {
      const idx = prev.findIndex((x) => x === "");
      if (idx === -1) return prev; // full
      const copy = [...prev];
      copy[idx] = d;
      return copy;
    });
  };

  const backspace = () => {
    setOtp((prev) => {
      const idx = prev.findLastIndex((x) => x !== "");
      if (idx < 0) return prev;
      const copy = [...prev];
      copy[idx] = "";
      return copy;
    });
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      alert("Please enter complete OTP");
      return;
    }

    setLoading(true);
    const phone = `+91${mobile}`;
    
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpString, role: 'partner' })
      });
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem("authToken", data.token);
        
        const partnerResponse = await fetch(`${API_URL}/api/mobile/partners`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile, name: "Partner" })
        });
        const partnerData = await partnerResponse.json();
        
        if (partnerData.success) {
          localStorage.setItem("partnerId", partnerData.data.partnerId || partnerData.data._id);
          
          if (partnerData.data.isExistingUser && partnerData.data.partner?.email) {
            router.push("/pickups");
          } else {
            router.push("/profile/create");
          }
        }
      } else {
        alert(data.error || "Invalid OTP. Please try again.");
        setOtp(Array(6).fill(""));
      }
    } catch (error) {
      alert("Verification failed. Please try again.");
      setOtp(Array(6).fill(""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-6">
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/login" className="text-2xl leading-none text-black">←</Link>
          <h2 className="text-lg font-semibold text-black">Verify Mobile</h2>
          <span className="w-6" />
        </div>
      </header>

      <div className="px-4 pt-6">
        <p className="text-center text-gray-500">We’ve sent an OTP to</p>
        <p className="mt-1 text-center text-black font-semibold">+91 {mobile.replace(/(\d{5})(\d{5})/, '$1XXXXX')}</p>
        <p className="mt-1 text-center" style={{ color: '#452D9B' }}>Change number</p>

        <div className="mt-4 flex items-center justify-center gap-3">
          {otp.map((val, i) => (
            <div
              key={i}
              className="h-14 w-14 rounded-2xl border-2 flex items-center justify-center text-lg font-bold text-black border-gray-300"
              style={i === nextEmptyIndex ? { borderColor: '#452D9B' } : {}}
            >
              {val}
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-gray-500">Didn’t get OTP?</p>
        <p className="text-center" style={{ color: '#452D9B' }}>
          {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
        </p>

        <button 
          onClick={handleVerify}
          disabled={loading || otp.join("").length !== 6}
          className="mt-4 w-full text-white rounded-xl py-3 text-base font-semibold"
          style={!loading && otp.join("").length === 6 ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : { background: '#9ca3af' }}
        >
          {loading ? "Verifying..." : "Verify & Continue"}
        </button>
      </div>

      {/* Keypad */}
      <div className="mt-6 px-4">
        <div className="grid grid-cols-5 gap-4">
          {["1","2","3","4","5"].map((n) => (
            <button key={n} className="rounded-xl bg-gray-100 text-black py-3 text-base font-semibold" onClick={() => addDigit(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-5 gap-4">
          {["6","7","8","9","0"].map((n) => (
            <button key={n} className="rounded-xl bg-gray-100 text-black py-3 text-base font-semibold" onClick={() => addDigit(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center">
          <button className="rounded-xl bg-gray-200 text-black py-4 px-8 text-base font-semibold" onClick={backspace}>
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}