"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { API_URL } from '@/config/api';

function Icon({ src, active, showCheck }: { src: string; active: boolean; showCheck?: boolean }) {
  if (src === 'profile') {
    return (
      <div className="relative">
        {active ? (
          // Gradient profile icon when active
          <div
            className="h-6 w-6 rounded-lg p-1"
            style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
          >
            <svg className="h-full w-full" fill="white" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        ) : (
          // Regular profile icon
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#6b7280' }}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        )}
      </div>
    );
  }
  
  return (
    <div className="relative">
      {active ? (
        // Gradient icon when active
        <div
          className="h-6 w-6 rounded-lg p-1"
          style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
        >
          <div
            className="h-full w-full"
            style={{
              backgroundColor: 'white',
              WebkitMaskImage: `url(${src})`,
              maskImage: `url(${src})`,
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          />
        </div>
      ) : (
        // Regular icon
        <div
          className="h-6 w-6"
          style={{
            backgroundColor: '#6b7280',
            WebkitMaskImage: `url(${src})`,
            maskImage: `url(${src})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      )}
      {active && showCheck && (
        <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full text-white text-[10px] leading-4 flex items-center justify-center" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>✓</span>
      )}
    </div>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [kycApproved, setKycApproved] = useState(false);

  useEffect(() => {
    const partnerId = localStorage.getItem("partnerId");
    if (partnerId) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      fetch(`${API_URL}/api/mobile/partners/${partnerId}`, {
        signal: controller.signal
      })
        .then(res => {
          clearTimeout(timeoutId);
          if (res.ok) {
            return res.json();
          }
          throw new Error(`HTTP ${res.status}`);
        })
        .then(result => {
          if (result.success) {
            setKycApproved(result.data.kycStatus === 'approved');
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error("Failed to fetch partner:", err);
          }
        });
    }
  }, []);

  // Always show bottom nav
  // if (!kycApproved) {
  //   return null;
  // }

  const isPickup = pathname.startsWith('/pickups');
  const isHub = pathname.startsWith('/hub');
  const isPickForDelivery = pathname.startsWith('/delivery/pick');
  const isDelivery = pathname.startsWith('/delivery') && !isPickForDelivery;
  const isProfile = pathname.startsWith('/profile');

  const items = [
    { href: "/pickups", label: "Pickup", icon: "/PickupIcon.svg", active: isPickup, check: false },
    { href: "/hub/drop", label: "Reached Hub", icon: "/ReachedHubIcon.svg", active: isHub, check: false },
    { href: "/delivery/pick", label: "Pick for Delivery", icon: "/PickforDeliveryIcon.svg", active: isPickForDelivery, check: false },
    { href: "/delivery/history", label: "Delivery", icon: "/DeliveryIcon.svg", active: isDelivery, check: true },
    { href: "/profile", label: "Profile", icon: "profile", active: isProfile, check: false },
  ] as const;

  return (
    <>
    {/* The bar is fixed, so it floats over whatever is underneath. Without this
        spacer the last thing on a page -- "Drop to Hub", "Start Pickup" -- sat
        behind it and could not be reached. */}
    <div aria-hidden className="bottom-nav-spacer" />
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t border-gray-200 bottom-nav-safe" style={{ zIndex: 50 }}>
      <div className="mx-auto max-w-md px-4 py-3">
        <ul className="grid grid-cols-5 items-center gap-1">
          {items.map((it) => (
            <li key={it.href} className="flex flex-col items-center text-center">
              <Link href={it.href} className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl hover:bg-gray-50 transition-colors">
                <Icon src={it.icon} active={it.active} showCheck={it.check} />
                <span className="text-[10px]" style={{ color: it.active ? '#452D9B' : '#6b7280', fontWeight: it.active ? 'bold' : 'normal' }}>{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
    </>
  );
}