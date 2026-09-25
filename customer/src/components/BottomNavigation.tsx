import { useNavigate, useLocation } from "react-router-dom";
import { Home as HomeIcon, Tag, ShoppingCart, RotateCcw, User } from "lucide-react";

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white px-0 py-3 sm:py-4 flex items-center justify-around shadow-2xl border-t z-50 fixed-bottom-nav">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#452D9B', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#07C8D0', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>
      
      <button onClick={() => navigate("/home")} className="flex flex-col items-center gap-0.5 sm:gap-1 p-1">
        <HomeIcon className={`w-5 h-5 sm:w-7 sm:h-7 ${isActive('/home') ? '' : 'text-gray-400'}`} style={isActive('/home') ? { stroke: 'url(#gradient)' } : {}} />
      </button>
      
      <button onClick={() => navigate("/prices")} className="flex flex-col items-center gap-0.5 sm:gap-1 p-1">
        <Tag className={`w-5 h-5 sm:w-7 sm:h-7 ${isActive('/prices') ? '' : 'text-gray-400'}`} style={isActive('/prices') ? { stroke: 'url(#gradient)' } : {}} />
      </button>
      
      <button onClick={() => navigate("/cart")} className="flex flex-col items-center gap-0.5 sm:gap-1 p-1">
        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 border-white shadow-lg" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
          <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </div>
        <span className="text-[10px] sm:text-xs font-semibold" style={{ color: '#452D9B' }}>Your Cart</span>
      </button>
      
      <button onClick={() => navigate("/booking-history")} className="flex flex-col items-center gap-0.5 sm:gap-1 p-1">
        <RotateCcw className={`w-5 h-5 sm:w-7 sm:h-7 ${isActive('/booking-history') ? '' : 'text-gray-400'}`} style={isActive('/booking-history') ? { stroke: 'url(#gradient)' } : {}} />
      </button>
      
      <button onClick={() => navigate("/profile")} className="flex flex-col items-center gap-0.5 sm:gap-1 p-1">
        <User className={`w-5 h-5 sm:w-7 sm:h-7 ${isActive('/profile') ? '' : 'text-gray-400'}`} style={isActive('/profile') ? { stroke: 'url(#gradient)' } : {}} />
      </button>
    </nav>
  );
};

export default BottomNavigation;