import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShoppingCart, Wallet, Share2, Copy, Home as HomeIcon, Tag, RotateCcw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from '@/config/api';
import { Share } from '@capacitor/share';
import Header from "@/components/Header";

const ReferEarn = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const [referralData, setReferralData] = useState({
    userCode: "Loading...",
    pendingRewards: 0
  });

  const [rewards, setRewards] = useState({ referrer: 50, friend: 25 });

  useEffect(() => {
    fetch(`${API_URL}/api/wallet-settings`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setRewards({
          referrer: Number(d.data.referralRewardAmount ?? 50),
          friend: Number(d.data.referredUserRewardAmount ?? 25),
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCustomerReferralCode();
    fetchPastReferrals();
  }, []);

  const fetchCustomerReferralCode = async () => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        let codes = data.data.referralCodes || [];
        
        // Find active (unused) code
        let activeCode = codes.find((c: any) => !c.used);
        
        // Generate new code if no active code exists
        if (!activeCode) {
          const newCode = generateReferralCode(data.data.name, codes.length);
          codes.push({ code: newCode, used: false, createdAt: new Date() });
          
          await fetch(`${API_URL}/api/customers/${customerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referralCodes: codes })
          });
          
          activeCode = { code: newCode };
        }
        
        setReferralData(prev => ({ ...prev, userCode: activeCode.code }));
      }
    } catch (error) {
      console.error('Failed to fetch referral code:', error);
      setReferralData(prev => ({ ...prev, userCode: 'ERROR' }));
    }
  };

  const generateReferralCode = (name: string, count: number) => {
    const prefix = name.substring(0, 3).toUpperCase();
    const suffix = (count + 1).toString().padStart(4, '0');
    return `${prefix}${suffix}`;
  };

  const [pastReferrals, setPastReferrals] = useState([]);

  useEffect(() => {
    fetchPastReferrals();
  }, []);

  const fetchPastReferrals = async () => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const codes = data.data.referralCodes || [];
        const usedCodes = codes.filter((c: any) => c.used);
        
        const referrals = usedCodes.map((code: any) => ({
          id: code._id,
          name: code.usedBy || 'Unknown',
          status: 'completed',
          joinedDate: code.usedAt ? new Date(code.usedAt).toLocaleDateString() : 'N/A'
        }));
        
        setPastReferrals(referrals);
        setReferralData(prev => ({
          ...prev,
          pendingRewards: codes.filter((c: any) => !c.used).length
        }));
      }
    } catch (error) {
      console.error('Failed to fetch past referrals:', error);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralData.userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareCode = async () => {
    const shareText = `🎁 Join Urban Steam and get ₹${rewards.friend} in your wallet on your first order!\n\nUse my referral code: ${referralData.userCode}\n\nSign up now: ${window.location.origin}\n\nDon't miss out on this exclusive offer! 🚀`;
    
    try {
      await Share.share({
        title: 'Urban Steam - Refer a friend',
        text: shareText,
        dialogTitle: 'Share your referral code'
      });
    } catch (error) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header 
        title="Refer & Earn" 
        variant="gradient"
        onBack={() => navigate(-1)}
      />

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden min-h-[140px] sm:min-h-[160px]">
          <div className="relative z-10 max-w-[60%] sm:max-w-[70%]">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 leading-tight">Invite friends, earn rewards!</h2>
            <p className="text-blue-100 text-xs sm:text-sm lg:text-base leading-relaxed">{`Get ₹${rewards.referrer} in your wallet when a friend places their first order. They get ₹${rewards.friend} too.`}</p>
          </div>
          
          {/* Background illustration */}
          <div className="absolute right-2 sm:right-4 top-4 bottom-4 w-24 sm:w-32 lg:w-40 opacity-20">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              {/* Person 1 */}
              <circle cx="30" cy="25" r="8" fill="white" />
              <rect x="22" y="33" width="16" height="20" rx="8" fill="white" />
              <rect x="26" y="53" width="3" height="15" fill="white" />
              <rect x="31" y="53" width="3" height="15" fill="white" />
              
              {/* Person 2 */}
              <circle cx="90" cy="25" r="8" fill="white" />
              <rect x="82" y="33" width="16" height="20" rx="8" fill="white" />
              <rect x="86" y="53" width="3" height="15" fill="white" />
              <rect x="91" y="53" width="3" height="15" fill="white" />
              
              {/* Connection line */}
              <line x1="38" y1="35" x2="82" y2="35" stroke="white" strokeWidth="2" strokeDasharray="3,3" />
              
              {/* Gift box */}
              <rect x="55" y="75" width="12" height="10" fill="white" />
              <rect x="55" y="75" width="12" height="3" fill="white" opacity="0.7" />
              <line x1="61" y1="75" x2="61" y2="85" stroke="white" strokeWidth="2" />
              <line x1="55" y1="78" x2="67" y2="78" stroke="white" strokeWidth="2" />
              
              {/* Money symbols */}
              <text x="45" y="100" fill="white" fontSize="12" fontWeight="bold">₹</text>
              <text x="70" y="95" fill="white" fontSize="10" fontWeight="bold">₹</text>
            </svg>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute right-0 top-0 w-20 sm:w-32 h-20 sm:h-32 bg-white bg-opacity-5 rounded-full -mr-10 sm:-mr-16 -mt-10 sm:-mt-16"></div>
          <div className="absolute right-4 sm:right-8 bottom-0 w-12 sm:w-20 h-12 sm:h-20 bg-white bg-opacity-5 rounded-full -mb-6 sm:-mb-10"></div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg text-center hover:shadow-xl transition-shadow">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent mb-4">Your Code: {referralData.userCode}</h3>
          <div className="flex gap-2 sm:gap-3">
            <Button 
              onClick={handleCopyCode}
              variant="outline"
              className={`flex-1 h-10 sm:h-12 rounded-2xl font-semibold border-2 text-sm sm:text-base shadow-md ${
                copied 
                  ? 'border-green-500 text-green-500 bg-green-50' 
                  : 'border-blue-500 text-blue-500 hover:bg-blue-50'
              }`}
            >
              <Copy className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </Button>
            <Button 
              onClick={handleShareCode}
              className="flex-1 h-10 sm:h-12 rounded-2xl font-semibold text-white text-sm sm:text-base shadow-lg"
              style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Share Code</span>
              <span className="xs:hidden">Share</span>
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-xl transition-shadow">
          <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent mb-4 sm:mb-6">How it works</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center mb-2 shadow-md">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-black leading-tight">Invite Friends</p>
            </div>
            <div className="w-4 sm:w-8 h-0.5 bg-gradient-to-r from-blue-500 to-blue-700 mx-1 sm:mx-2"></div>
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center mb-2 shadow-md">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-black leading-tight">Friend Orders</p>
            </div>
            <div className="w-4 sm:w-8 h-0.5 bg-gradient-to-r from-blue-500 to-blue-700 mx-1 sm:mx-2"></div>
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center mb-2 shadow-md">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-black leading-tight">You Earn</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border-2 border-green-200 hover:shadow-xl transition-shadow">
          <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent mb-4">Your Rewards</h3>
          <div className="space-y-2 sm:space-y-3">
            <div>
              <p className="text-gray-700 text-sm sm:text-base font-medium">{referralData.pendingRewards} invite{referralData.pendingRewards === 1 ? '' : 's'} not yet used — worth ₹{referralData.pendingRewards * rewards.referrer} once those friends place their first order.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-xl transition-shadow">
          <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent mb-4">Past Referrals</h3>
          <div className="space-y-3 sm:space-y-4">
            {pastReferrals.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No referrals yet</p>
            ) : pastReferrals.map((referral) => (
              <div key={referral.id} className="flex items-start sm:items-center justify-between py-2 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-black text-sm sm:text-base truncate">{referral.name}</p>
                  {referral.status === 'completed' && (
                    <p className="text-xs sm:text-sm text-blue-500">Joined</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {referral.status === 'completed' ? (
                    <span className="text-blue-500 font-semibold text-xs sm:text-sm">Completed</span>
                  ) : (
                    <span className="text-gray-500 font-semibold text-xs sm:text-sm">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white px-4 sm:px-6 py-4 flex items-center justify-around shadow-2xl max-w-4xl mx-auto border-t">
        <button onClick={() => navigate("/home")} className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
          <HomeIcon className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <button onClick={() => navigate("/prices")} className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
          <Tag className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <button onClick={() => navigate("/booking")} className="flex flex-col items-center gap-1 text-gray-400">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center border-2 border-white shadow-lg hover:shadow-xl transition-shadow">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        </button>
        <button onClick={() => navigate("/booking-history")} className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
          <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <button onClick={() => navigate("/profile")} className="flex flex-col items-center gap-1">
          <User className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
        </button>
      </nav>
    </div>
  );
};

export default ReferEarn;