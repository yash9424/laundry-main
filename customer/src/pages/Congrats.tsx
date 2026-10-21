import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import congratsImg from "@/assets/Congrats we are available.png";

const Congrats = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background px-4 sm:px-6 overflow-hidden safe-top">
      <div className="flex w-full max-w-sm sm:max-w-md flex-col items-center text-center">
        <img 
          src={congratsImg}
          alt="Congrats" 
          className="mb-6 sm:mb-8 w-72 h-72 sm:w-96 sm:h-96 object-contain"
        />
        
        <h1 className="mb-4 sm:mb-6 text-3xl sm:text-4xl font-bold text-primary">
          Congrats!
        </h1>
        
        <h2 className="mb-3 text-base sm:text-lg font-semibold text-foreground">
          You're in our service area.
        </h2>

        <p className="mb-6 sm:mb-8 text-sm sm:text-base text-foreground px-2 sm:px-4">
          Exceptional garment care, delivered to your doorstep. Your Urban Steam experience starts here.
        </p>
        
        <div className="w-full">
          <Button 
            onClick={() => navigate("/login")}
            className="w-full bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white rounded-2xl py-4 sm:py-6 text-base sm:text-lg font-semibold shadow-lg"
            size="lg"
          >
            Continue to Signup
          </Button>
        </div>
        
        <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-muted-foreground">
          Not your location?
          <button 
            onClick={() => navigate("/check-availability")}
            className="ml-1 font-semibold text-primary hover:underline"
          >
            Change Pincode
          </button>
        </p>
      </div>
    </div>
  );
};

export default Congrats;
