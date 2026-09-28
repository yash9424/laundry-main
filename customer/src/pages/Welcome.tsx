import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import laundryAppIllustration from "@/assets/get started app icon.png";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-white flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden safe-top">
      <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center text-center">
        <img 
          src={laundryAppIllustration} 
          alt="LaundryMate App" 
          className="w-64 h-64 sm:w-80 sm:h-80 mb-4 sm:mb-6 object-contain"
        />
        
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Urban Steam
        </h1>
        
        <p className="text-base sm:text-lg font-normal mb-6 sm:mb-8 leading-relaxed" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Reimagining Ironing for the modern India
        </p>
        
        <Button 
          onClick={() => navigate("/check-availability")}
          className="w-full bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white py-4 sm:py-6 rounded-xl text-sm sm:text-base font-medium shadow-lg"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Welcome;