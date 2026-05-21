import { useState, useEffect } from "react";

const ReferAndEarn = () => {
  const navigate = useNavigate();
  const [referralPoints, setReferralPoints] = useState(50);

  useEffect(() => {
    fetchReferralPoints();
  }, []);

  const fetchReferralPoints = async () => {
    try {
      const response = await fetch(`${API_URL}/api/wallet-settings`);
      const data = await response.json();
      if (data.success) {
        setReferralPoints(data.data.referralPoints);
      }
    } catch (error) {
      console.error('Failed to fetch referral points:', error);
    }
  };

  return (
    <div>
      <h2 className="text-base sm:text-lg font-bold mb-3" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Refer and Earn</h2>
      <button 
        onClick={() => navigate("/refer-earn")}
        className="w-full bg-white rounded-2xl p-3 sm:p-4 shadow-lg flex items-center gap-2 sm:gap-3 hover:shadow-xl transition-shadow"
      >
        <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
        <span className="font-medium text-black text-sm sm:text-base">Earn {referralPoints} points for every referral</span>
      </button>
    </div>
  );
};
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, MapPin, Edit, Trash2, CreditCard, Wallet, Gift, HelpCircle, Mail, Bell, FileText, LogOut, Home as HomeIcon, Tag, ShoppingCart, RotateCcw, User, CheckCircle2, Banknote, Smartphone, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { API_URL } from '@/config/api';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";


const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ 
    type: 'UPI', 
    upiId: '',
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
    accountNumber: '',
    ifscCode: '',
    bankName: ''
  });

  useEffect(() => {
    if (location.state?.newAddress) {
      const newAddress = {
        id: Date.now(),
        title: location.state.newAddress.title,
        subtitle: location.state.newAddress.subtitle || "Address",
        isDefault: location.state.newAddress.isDefault || false
      };
      setAddresses(prev => [...prev, newAddress]);
      navigate("/profile", { replace: true });
    } else if (location.state?.editedAddress) {
      const editedAddress = location.state.editedAddress;
      setAddresses(prev => prev.map(addr => 
        addr.id === editedAddress.id 
          ? { ...addr, title: editedAddress.title, subtitle: editedAddress.subtitle, isDefault: editedAddress.isDefault }
          : addr
      ));
      navigate("/profile", { replace: true });
    }

    // Handle hardware back button
    if (Capacitor.isNativePlatform()) {
      const handleBackButton = App.addListener('backButton', () => {
        navigate('/home');
      });
      
      return () => {
        handleBackButton.remove();
      };
    }
  }, [location.state, navigate]);

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(() => {
    const cached = localStorage.getItem('cachedProfile');
    if (cached) {
      try {
        return JSON.parse(cached).userProfile;
      } catch (e) {}
    }
    return {
      name: "User",
      phone: "+91 XXXXXXXX",
      email: "example@gmail.com",
      avatar: "U",
      profileImage: null,
      pincode: "Not provided",
      city: "Not provided",
      state: "Not provided"
    };
  });

  useEffect(() => {
    const cachedProfile = localStorage.getItem('cachedProfile');
    if (cachedProfile) {
      try {
        const cached = JSON.parse(cachedProfile);
        if (cached.addresses) setAddresses(cached.addresses);
        if (cached.paymentOptions) setPaymentOptions(cached.paymentOptions);
      } catch (e) {}
    }
    setLoading(false);
    fetchCustomerProfile();
  }, []);

  const fetchCustomerProfile = async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId)
      const data = await response.json();
      
      if (data.success && data.data) {
        const customer = data.data;
        const profileData = {
          name: customer.name || "User",
          phone: customer.mobile || "+91 XXXXXXXX",
          email: customer.email || "Not provided",
          avatar: (customer.name || "User").charAt(0).toUpperCase(),
          profileImage: customer.profileImage || null,
          pincode: customer.address?.[0]?.pincode || "Not provided",
          city: customer.address?.[0]?.city || "Not provided",
          state: customer.address?.[0]?.state || "Not provided"
        };
        setUserProfile(profileData);
        const balance = `₹${customer.walletBalance || 0}`;
        setWalletBalance(balance);
        localStorage.setItem('cachedWalletBalance', balance);
        
        let dbAddresses = [];
        if (customer.address && customer.address.length > 0) {
          dbAddresses = customer.address.map((addr, index) => ({
            id: index + 1,
            _id: addr._id,
            title: addr.street || "Address",
            subtitle: `${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`.replace(/^, |, $/, ''),
            isDefault: addr.isDefault || false
          }));
          setAddresses(dbAddresses);
        }
        
        let payments = [];
        if (customer.paymentMethods && customer.paymentMethods.length > 0) {
          payments = customer.paymentMethods;
          setPaymentOptions(payments);
        }
        
        localStorage.setItem('cachedProfile', JSON.stringify({
          userProfile: profileData,
          addresses: dbAddresses,
          paymentOptions: payments
        }));
        setLoading(false);
      }
    } catch (error) {
      clearTimeout(timeoutId)
      setLoading(false);
    }
  };





  const [walletBalance, setWalletBalance] = useState(() => {
    const cached = localStorage.getItem('cachedWalletBalance');
    return cached || "₹0";
  });

  const handleSupportClick = () => {
    window.location.href = 'mailto:support@urbansteam.in';
  };

  const legalOptions = [
    { id: 1, title: "Privacy Policy" },
    { id: 2, title: "Terms & Conditions" }
  ];

  const handleDeleteAddress = async (addressId) => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;
      
      // Remove address from local state first
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      setAddresses(updatedAddresses);
      
      // Convert back to database format
      const dbAddresses = updatedAddresses.map(addr => {
        const [street, ...rest] = addr.title.split(',');
        const [city, statePin] = addr.subtitle.split(', ');
        const [state, pincode] = statePin ? statePin.split(' - ') : ['', ''];
        
        return {
          street: street || addr.title,
          city: city || '',
          state: state || '',
          pincode: pincode || '',
          isDefault: addr.isDefault || false
        };
      });
      
      // Update database
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: dbAddresses })
      });
      
      if (!response.ok) {
        console.error('Failed to delete address from database');
        // Revert local state if database update failed
        fetchCustomerProfile();
      }
    } catch (error) {
      console.error('Failed to delete address:', error);
      // Revert local state if error occurred
      fetchCustomerProfile();
    }
  };

  const handleEditAddress = (addressId) => {
    const addressToEdit = addresses.find(addr => addr.id === addressId);
    navigate("/add-address", { state: { editAddress: addressToEdit } });
  };

  const handleAddPayment = async () => {
    if (isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) {
        console.error('No customer ID found');
        return;
      }
      
      let paymentMethod: any = {
        type: newPayment.type,
        addedAt: new Date().toISOString()
      };
      
      // Validate and add type-specific fields
      if (newPayment.type === 'UPI') {
        if (!newPayment.upiId.trim()) {
          console.error('UPI ID is required');
          return;
        }
        paymentMethod.upiId = newPayment.upiId;
      } else if (newPayment.type === 'Card') {
        if (!newPayment.cardNumber.trim() || !newPayment.cardHolder.trim() || !newPayment.cvv.trim()) {
          console.error('Card details are incomplete');
          return;
        }
        paymentMethod.cardNumber = newPayment.cardNumber;
        paymentMethod.cardHolder = newPayment.cardHolder;
        paymentMethod.expiryDate = newPayment.expiryDate;
        paymentMethod.cvv = newPayment.cvv;
      } else if (newPayment.type === 'Bank Transfer') {
        if (!newPayment.accountNumber.trim() || !newPayment.ifscCode.trim()) {
          console.error('Bank details are incomplete');
          return;
        }
        paymentMethod.accountNumber = newPayment.accountNumber;
        paymentMethod.ifscCode = newPayment.ifscCode;
        paymentMethod.bankName = newPayment.bankName;
      }
      
      let updatedPayments;
      if (editingPaymentIndex !== null) {
        updatedPayments = [...paymentOptions];
        updatedPayments[editingPaymentIndex] = paymentMethod;
      } else {
        updatedPayments = [...paymentOptions, paymentMethod];
      }
      
      console.log('Sending payment data:', { paymentMethods: updatedPayments });
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethods: updatedPayments })
      });
      
      const result = await response.json();
      console.log('API response:', result);
      
      if (response.ok) {
        setPaymentOptions(updatedPayments);
        setNewPayment({ type: 'UPI', upiId: '', cardNumber: '', cardHolder: '', expiryDate: '', cvv: '', accountNumber: '', ifscCode: '', bankName: '' });
        setEditingPaymentIndex(null);
        setShowPaymentModal(false);
        console.log('Payment method saved successfully');
        setTimeout(() => {
          fetchCustomerProfile();
        }, 500);
      } else {
        console.error('Failed to save payment method:', result);
      }
    } catch (error) {
      console.error('Failed to add payment method:', error);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleEditPayment = (index: number) => {
    const payment = paymentOptions[index];
    setNewPayment({
      type: payment.type,
      upiId: payment.upiId || '',
      cardNumber: payment.cardNumber || '',
      cardHolder: payment.cardHolder || '',
      expiryDate: payment.expiryDate || '',
      cvv: payment.cvv || '',
      accountNumber: payment.accountNumber || '',
      ifscCode: payment.ifscCode || '',
      bankName: payment.bankName || ''
    });
    setEditingPaymentIndex(index);
    setShowPaymentModal(true);
  };

  const handleDeletePayment = async (index) => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;
      
      const updatedPayments = paymentOptions.filter((_, i) => i !== index);
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethods: updatedPayments })
      });
      
      if (response.ok) {
        setPaymentOptions(updatedPayments);
      }
    } catch (error) {
      console.error('Failed to delete payment method:', error);
    }
  };

  const handleSetPrimaryPayment = async (index) => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;
      
      const updatedPayments = paymentOptions.map((payment, i) => ({
        ...payment,
        isPrimary: i === index
      }));
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethods: updatedPayments })
      });
      
      if (response.ok) {
        setPaymentOptions(updatedPayments);
      }
    } catch (error) {
      console.error('Failed to set primary payment method:', error);
    }
  };

  const hasAllPaymentTypes = () => {
    const existingTypes = paymentOptions.map(option => option.type);
    const allTypes = ['UPI', 'Card', 'Bank Transfer'];
    return allTypes.every(type => existingTypes.includes(type));
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#452D9B' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
      <Header 
        title="Profile" 
        variant="gradient"
        rightAction={
          <Bell 
            className="w-5 h-5 sm:w-6 sm:h-6 text-white cursor-pointer" 
            onClick={() => navigate("/notifications")}
          />
        }
      />

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            {userProfile.profileImage ? (
              <img 
                src={userProfile.profileImage} 
                alt="Profile" 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0 shadow-md" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-lg sm:text-2xl font-bold flex-shrink-0 shadow-md ${userProfile.profileImage ? 'hidden' : ''}`} style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
              {userProfile.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-black truncate">{userProfile.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{userProfile.phone}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{userProfile.email}</p>
              <p className="text-xs sm:text-sm text-blue-500 truncate">{userProfile.city}, {userProfile.state} - {userProfile.pincode}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate("/edit-profile")}
            className="font-semibold text-xs sm:text-sm"
            style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            Edit Profile
          </button>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>My Addresses</h2>
          {addresses.map((address) => (
            <div key={address.id} className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg mb-3 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-black text-sm sm:text-base truncate">{address.title}</p>
                    <p className="text-xs sm:text-sm text-gray-500 break-words">{address.subtitle}</p>
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                  <button 
                    onClick={() => handleEditAddress(address.id)}
                    className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                  >
                    <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteAddress(address.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => navigate("/add-address")}
            className="font-semibold text-xs sm:text-sm"
            style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            + Add New
          </button>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Payment Options</h2>
          {paymentOptions.map((option, index) => {
            const getPaymentIcon = (type) => {
              switch (type) {
                case 'Cash': return Banknote;
                case 'UPI': return Smartphone;
                case 'Card': return CreditCard;
                case 'Bank Transfer': return Building2;
                default: return CreditCard;
              }
            };
            const PaymentIcon = getPaymentIcon(option.type);
            
            return (
            <div key={index} className={`bg-white rounded-2xl p-3 sm:p-4 shadow-lg mb-3 flex items-center justify-between gap-2 sm:gap-3 hover:shadow-xl transition-shadow ${option.isPrimary ? 'border-2 border-blue-500' : ''}`}>
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <PaymentIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-black text-sm sm:text-base">{option.type}</p>
                    {option.isPrimary && <span className="text-blue-500 text-xs font-medium">Primary</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {option.type === 'UPI' && option.upiId}
                    {option.type === 'Card' && `${option.cardHolder} - ****${option.cardNumber?.slice(-4)}`}
                    {option.type === 'Bank Transfer' && `${option.bankName} - ****${option.accountNumber?.slice(-4)}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                {!option.isPrimary ? (
                  <button 
                    onClick={() => handleSetPrimaryPayment(index)}
                    className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                    title="Set as Primary Payment Method"
                  >
                    Set Primary
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-50 text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="font-medium">Primary</span>
                  </div>
                )}
                <button 
                  onClick={() => handleEditPayment(index)}
                  className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                >
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button 
                  onClick={() => handleDeletePayment(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
            );
          })}
          {!hasAllPaymentTypes() && (
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="font-semibold text-xs sm:text-sm"
              style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              + Add Payment
            </button>
          )}
          {hasAllPaymentTypes() && (
            <p className="text-gray-500 text-xs sm:text-sm">All payment methods added</p>
          )}
        </div>

        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20" onClick={() => setShowPaymentModal(false)}>
            <div className="bg-white rounded-3xl w-full sm:max-w-md p-4 sm:p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base sm:text-lg font-bold text-black mb-3 sm:mb-4">{editingPaymentIndex !== null ? 'Edit' : 'Add'} Payment Method</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-black mb-1.5 sm:mb-2 block">Payment Type</label>
                  <div className="relative">
                    <select
                      value={newPayment.type}
                      onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value })}
                      className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm sm:text-base appearance-none pr-10"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {newPayment.type === 'UPI' && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-black mb-1.5 sm:mb-2 block">UPI ID</label>
                    <input
                      type="text"
                      placeholder="example@upi"
                      value={newPayment.upiId}
                      onChange={(e) => setNewPayment({ ...newPayment, upiId: e.target.value })}
                      className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                )}
                
                {newPayment.type === 'Card' && (
                  <>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-black mb-1.5 sm:mb-2 block">Card Number</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={newPayment.cardNumber}
                        onChange={(e) => setNewPayment({ ...newPayment, cardNumber: e.target.value })}
                        className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                        style={{ fontSize: '16px' }}
                        maxLength={16}
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-black mb-1.5 sm:mb-2 block">Card Holder Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={newPayment.cardHolder}
                        onChange={(e) => setNewPayment({ ...newPayment, cardHolder: e.target.value })}
                        className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-black mb-1.5 sm:mb-2 block">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={newPayment.expiryDate}
                          onChange={(e) => setNewPayment({ ...newPayment, expiryDate: e.target.value })}
                          className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                          style={{ fontSize: '16px' }}
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-black mb-1.5 sm:mb-2 block">CVV</label>
                        <input
                          type="password"
                          placeholder="123"
                          value={newPayment.cvv}
                          onChange={(e) => setNewPayment({ ...newPayment, cvv: e.target.value })}
                          className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                          style={{ fontSize: '16px' }}
                          maxLength={3}
                        />
                      </div>
                    </div>
                  </>
                )}
                
                {newPayment.type === 'Bank Transfer' && (
                  <>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-black mb-1.5 sm:mb-2 block">Account Number</label>
                      <input
                        type="text"
                        placeholder="1234567890"
                        value={newPayment.accountNumber}
                        onChange={(e) => setNewPayment({ ...newPayment, accountNumber: e.target.value })}
                        className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-black mb-1.5 sm:mb-2 block">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="ABCD0123456"
                        value={newPayment.ifscCode}
                        onChange={(e) => setNewPayment({ ...newPayment, ifscCode: e.target.value.toUpperCase() })}
                        className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                        style={{ fontSize: '16px' }}
                        maxLength={11}
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-black mb-1.5 sm:mb-2 block">Bank Name</label>
                      <input
                        type="text"
                        placeholder="Bank Name"
                        value={newPayment.bankName}
                        onChange={(e) => setNewPayment({ ...newPayment, bankName: e.target.value })}
                        className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2 sm:gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setNewPayment({ type: 'UPI', upiId: '', cardNumber: '', cardHolder: '', expiryDate: '', cvv: '', accountNumber: '', ifscCode: '', bankName: '' });
                      setEditingPaymentIndex(null);
                    }}
                    className="flex-1 py-2.5 sm:py-3 rounded-xl font-semibold text-gray-600 border border-gray-300 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPayment}
                    disabled={isSubmittingPayment}
                    className="flex-1 py-2.5 sm:py-3 rounded-xl font-semibold text-white text-sm sm:text-base shadow-lg"
                    style={isSubmittingPayment ? { background: '#9ca3af' } : { background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                  >
                    {isSubmittingPayment ? 'Saving...' : (editingPaymentIndex !== null ? 'Update' : 'Add')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Wallet</h2>
          <button 
            onClick={() => navigate("/wallet")}
            className="w-full bg-white rounded-2xl p-3 sm:p-4 shadow-lg flex items-center gap-2 sm:gap-3 hover:shadow-xl transition-shadow"
          >
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
            <span className="font-semibold text-sm sm:text-base" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Balance: {walletBalance}</span>
          </button>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>My Subscriptions</h2>
          <button
            onClick={() => navigate('/my-subscription')}
            className="w-full bg-white rounded-2xl p-3 sm:p-4 shadow-lg flex items-center gap-2 sm:gap-3 hover:shadow-xl transition-shadow"
          >
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
            <span className="font-medium text-black text-sm sm:text-base">View My Subscriptions</span>
          </button>
        </div>

        <ReferAndEarn />

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Support</h2>
          <div 
            onClick={handleSupportClick}
            className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg mb-3 flex items-center gap-2 sm:gap-3 cursor-pointer hover:shadow-xl transition-shadow"
          >
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
            <span className="font-medium text-black text-sm sm:text-base">Mail</span>
          </div>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>App Settings / Legal</h2>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg mb-3 flex items-center justify-between gap-3 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              <span className="font-medium text-black text-sm sm:text-base truncate">Notification</span>
            </div>
            <Switch checked={notificationEnabled} onCheckedChange={setNotificationEnabled} className="flex-shrink-0" />
          </div>
          {legalOptions.map((option) => (
            <div 
              key={option.id} 
              onClick={() => {
                if (option.title === "Terms & Conditions") navigate("/terms-conditions");
                if (option.title === "Privacy Policy") navigate("/privacy-policy");
              }}
              className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg mb-3 flex items-center gap-2 sm:gap-3 cursor-pointer hover:shadow-xl transition-shadow"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              <span className="font-medium text-black text-sm sm:text-base">{option.title}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full h-10 sm:h-12 rounded-2xl bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-semibold flex items-center justify-center gap-2 transition-all text-sm sm:text-base shadow-lg"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          Logout
        </button>
      </div>



      <BottomNavigation />
    </div>
  );
};

export default Profile;