import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Mail, Phone, Plus, X, Camera } from "lucide-react";
import { API_URL } from '@/config/api';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const CreateProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const customerId = location.state?.customerId;
  const mobileNumber = location.state?.mobileNumber;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    referralCode: ''
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [termsError, setTermsError] = useState(false);

  useEffect(() => {
    const storedCustomerId = localStorage.getItem('customerId')
    
    if (!customerId && !storedCustomerId) {
      navigate('/login')
      return
    }
    
    const actualCustomerId = customerId || storedCustomerId
    
    const fetchCustomerData = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      try {
        const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${actualCustomerId}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        const data = await response.json()
        
        if (data.success && data.data) {
          const customer = data.data
          setFormData({
            fullName: '',
            email: '',
            phone: customer.mobile?.startsWith('google_') ? '' : customer.mobile || '',
            referralCode: ''
          })

          if (customer.name) {
            // Don't automatically set agreedToTerms to true
            // User must manually agree to terms
          }
        }
      } catch (error) {
        clearTimeout(timeoutId)
      }
    }
    
    if (actualCustomerId) {
      fetchCustomerData()
    }
  }, [customerId, mobileNumber, navigate]);



  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectImage = async (source: CameraSource) => {
    try {
      // Request permissions first
      if (source === CameraSource.Camera) {
        const permissions = await CapCamera.requestPermissions({ permissions: ['camera'] });
        if (permissions.camera === 'denied') {
          alert('Camera permission denied. Please enable camera access in settings.');
          setShowImageOptions(false);
          return;
        }
      }
      // For gallery (CameraSource.Photos), we rely on the plugin's automatic behavior.
      // On Android 13+, it uses the Photo Picker (no permissions needed).
      // On older Android, it handles the legacy picker permissions automatically.
      
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source,
        width: 300,
        height: 300
      });
      
      if (image.dataUrl) {
        setProfileImage(image.dataUrl);
      }
      setShowImageOptions(false);
    } catch (error) {
      console.error('Error selecting image:', error);
      setShowImageOptions(false);
    }
  };

  const handleImageUpload = () => {
    if (Capacitor.isNativePlatform()) {
      setShowImageOptions(true);
    } else {
      // Web fallback
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setProfileImage(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return
    
    // Reset error states
    setTermsError(false)
    
    // Validate required fields including terms agreement
    if (!formData.fullName.trim()) {
      alert('Please enter your full name.')
      return
    }
    
    if (!formData.email.trim()) {
      alert('Please enter your email address.')
      return
    }
    
    if (!formData.phone.trim()) {
      alert('Please enter your mobile number.')
      return
    }
    
    // MANDATORY: Check terms agreement - this is the most important validation
    if (!agreedToTerms) {
      setTermsError(true)
      alert('You must agree to the Terms and Conditions to create your profile.')
      return
    }
    
    setIsLoading(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    try {
      const actualCustomerId = customerId || localStorage.getItem('customerId')
      
      const updateData: any = {
        name: formData.fullName,
        email: formData.email,
        mobile: formData.phone
      }
      
      if (profileImage) {
        updateData.profileImage = profileImage
      }
      

      
      if (formData.referralCode) {
        updateData.referredBy = formData.referralCode
      }
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${actualCustomerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const data = await response.json()
      
      if (data.success) {
        localStorage.setItem('customerId', actualCustomerId)
        localStorage.setItem('userName', formData.fullName)
        window.dispatchEvent(new Event('userNameChanged'))
        navigate("/home")
      } else {
        setIsLoading(false)
        alert('Failed to save profile: ' + (data.error || 'Unknown error'))
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      setIsLoading(false)
      if (error.name === 'AbortError') {
        alert('Request timeout. Please check your connection.')
      } else {
        alert('Failed to save profile: ' + (error.message || 'Network error'))
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white flex items-center border-b px-4 sm:px-6 py-4 z-10 safe-top-header">
        <button onClick={() => navigate(-1)} className="mr-3 sm:mr-4 flex-shrink-0">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-black">Create Profile</h1>
      </header>

      <div className="px-4 sm:px-6 py-4 sm:py-6 page-bottom-content">
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="relative">
            <div 
              onClick={handleImageUpload}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              )}
            </div>
            <button
              onClick={handleImageUpload}
              className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
          <p className="mt-2 sm:mt-3 text-gray-600 text-xs sm:text-sm">Tap to add photo</p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <Input
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="pl-10 sm:pl-12 h-10 sm:h-12 rounded-xl border-2 border-blue-500 text-sm sm:text-base"
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <Input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="pl-10 sm:pl-12 h-10 sm:h-12 rounded-xl border-2 border-blue-500 text-sm sm:text-base"
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <Input
              type="tel"
              placeholder="Mobile Number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              inputMode="numeric"
              className="pl-10 sm:pl-12 h-10 sm:h-12 rounded-xl border-2 border-blue-500 text-sm sm:text-base"
            />
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="Referral Code (Optional)"
              value={formData.referralCode}
              onChange={(e) => handleInputChange('referralCode', e.target.value.toUpperCase())}
              className="h-10 sm:h-12 rounded-xl border-2 border-gray-300 text-sm sm:text-base"
            />
          </div>
        </div>

        <div className={`mt-4 sm:mt-6 flex items-start gap-3 p-3 rounded-lg ${termsError ? 'bg-red-50 border border-red-200' : ''}`}>
          <div 
            onClick={() => {
              setAgreedToTerms(!agreedToTerms)
              setTermsError(false) // Clear error when user checks the box
            }}
            className={`mt-1 w-5 h-5 flex-shrink-0 cursor-pointer rounded border-2 flex items-center justify-center transition-all ${
              agreedToTerms 
                ? 'bg-blue-500 border-blue-500 text-white' 
                : termsError 
                  ? 'bg-white border-red-500' 
                  : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            {agreedToTerms && (
              <span className="text-white text-sm font-bold">✓</span>
            )}
          </div>
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={() => {}}
            className="hidden"
          />
          <label htmlFor="terms" className={`text-sm sm:text-base cursor-pointer ${termsError ? 'text-red-700' : 'text-gray-700'}`}>
            I agree with all{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-blue-500 underline hover:text-blue-600 font-medium"
            >
              terms and conditions
            </button>
            {termsError && (
              <div className="text-red-600 text-xs mt-1 font-medium">
                ⚠️ You must agree to the terms and conditions
              </div>
            )}
          </label>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!formData.fullName || !formData.email || !formData.phone || !agreedToTerms || isLoading}
          className="w-full h-10 sm:h-12 rounded-xl text-white text-sm sm:text-base font-semibold mt-4 disabled:cursor-not-allowed"
          style={!formData.fullName || !formData.email || !formData.phone || !agreedToTerms || isLoading ? { background: '#9ca3af' } : { background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
        >
          {isLoading ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>

      {/* Image Selection Modal */}
      {showImageOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-[60]">
          <div className="max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl w-full p-6 pb-8 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Photo</h3>
              <button onClick={() => setShowImageOptions(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => selectImage(CameraSource.Camera)}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Camera className="w-5 h-5 text-blue-500" />
                <span className="text-left">Take Photo</span>
              </button>
              <button
                onClick={() => selectImage(CameraSource.Photos)}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <User className="w-5 h-5 text-blue-500" />
                <span className="text-left">Choose from Gallery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg sm:text-xl font-bold">Terms and Conditions</h2>
              <button onClick={() => setShowTermsModal(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6 text-xs sm:text-sm space-y-4">
              <section>
                <h3 className="font-bold mb-2">1. Acceptance of Terms</h3>
                <p>Welcome to Urban Steam, a unit of ACS Group. These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Urban Steam ("we," "us," or "our") governing your use of the Urban Steam mobile application (the "App") and our steam ironing, pickup, and delivery services (collectively, the "Services"). By creating an account, accessing the App, or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you may not use our Services.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">2. Service Description</h3>
                <p>Urban Steam provides on-demand steam ironing services. Our Services include the pickup of your garments from your specified location, processing them at our facility, and delivering them back to you. The specific services available are listed within the App.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">3. User Accounts and Orders</h3>
                <p>a) To use our Services, you must register for an account and provide accurate, current, and complete information.</p>
                <p>b) You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                <p>c) All orders for Services must be placed exclusively through the App.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">4. Pricing and Payments</h3>
                <p>a) All prices for our Services are listed in Indian Rupees (Rs.) within the App and are subject to change without prior notice.</p>
                <p>b) Prices are inclusive of all applicable taxes, including Goods and Services Tax (GST).</p>
                <p>c) Payments must be made in full at the time of placing an order through our designated payment gateway, Razorpay, or other methods specified in the App.</p>
                <p>d) We do not store your complete payment card details. All payment transactions are processed securely by our third-party payment processors.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">5. Garment Care and Processing</h3>
                <p>a) Urban Steam will exercise professional care and diligence in the processing of all garments.</p>
                <p>b) We are not responsible for any damage resulting from inherent weaknesses, defects, or colour loss in materials that were not apparent prior to processing.</p>
                <p>c) We follow the care labels on each garment. In the absence of a care label, we will process the garment using our professional judgment.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">6. Limitation of Liability for Damaged or Lost Items</h3>
                <p>a) In the rare event of damage or loss of an item that is directly attributable to our handling, you must notify our customer support team in writing within twenty-four (24) hours of delivery.</p>
                <p>b) Our total liability for any single damaged or lost item is limited to a maximum of ten (10) times the charge for processing that specific item, as indicated on your invoice.</p>
                <p>c) We are not liable for any loss of or damage to personal belongings (such as cash, jewellery, accessories, or other valuables) left in the garments. You agree to check all pockets and garments for such items before handing them over for pickup.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">7. User Responsibilities</h3>
                <p>You agree to:</p>
                <p>a) Inspect all garments for personal belongings before pickup.</p>
                <p>b) Not submit any hazardous, dangerous, or illegal materials with your garments.</p>
                <p>c) Provide accurate and complete address and contact information.</p>
                <p>d) Ensure that you or an authorized representative is available at the specified address during the scheduled pickup and delivery time slots.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">8. Pickup and Delivery</h3>
                <p>a) All pickups and deliveries must be scheduled through the App.</p>
                <p>b) The time slots provided are estimates. We are not liable for delays caused by traffic, weather, or other unforeseen circumstances, but we will make reasonable efforts to keep you informed.</p>
                <p>c) A failed pickup or delivery attempt due to your unavailability may result in order cancellation or an additional rescheduling fee.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">9. Cancellation and Refund Policy</h3>
                <p>a) Cancellation: You may cancel an order free of charge at any time before our delivery partner has been dispatched for pickup via the App. If the rider has already been dispatched, a cancellation fee may apply.</p>
                <p>b) Refunds:</p>
                <p className="ml-4">i. No refunds will be provided for services that have been successfully completed and delivered.</p>
                <p className="ml-4">ii. For service complaints (e.g., quality issues), you must contact our support within 24 hours of delivery. We will investigate and, at our sole discretion, may offer to re-process the item or provide a credit to your account.</p>
                <p className="ml-4">iii. Compensation for damaged or lost items is governed by Section 6 of these Terms.</p>
                <p className="ml-4">iv. Any approved refunds will be processed to the original payment method within 5-7 business days.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">10. General Limitation of Liability</h3>
                <p>To the maximum extent permitted by applicable law, ACS Group and Urban Steam, its affiliates, and their respective officers, directors, and employees shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising out of or in any way connected with your use of the App or Services.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">11. Governing Law and Jurisdiction</h3>
                <p>These Terms shall be governed by and construed in accordance with the laws of India. Any dispute, claim, or controversy arising out of or relating to these Terms or the breach thereof shall be subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">12. Compliance with Consumer Protection Law</h3>
                <p>These Terms are intended to define the relationship between Urban Steam and our Users. However, nothing in these Terms shall be construed to limit or waive any rights, remedies, or protections that a User is granted as a consumer under the mandatory provisions of the Consumer Protection Act, 2019, and any rules made thereunder, or any other applicable consumer law. In the event of any conflict or inconsistency between a provision in these Terms and a mandatory provision of the Consumer Protection Act, 2019, the provisions of the Act shall prevail to the extent of such conflict.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">13. Severability</h3>
                <p>If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court or competent authority under the Consumer Protection Act, 2019 or any other law, the validity, legality, and enforceability of the remaining provisions will not in any way be affected or impaired. Such a provision shall be deemed modified to the minimum extent necessary to make it valid, legal, and enforceable.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2">14. Contact Information</h3>
                <p>For any questions, support, or to report an issue regarding these Terms or our Services, please contact us at:</p>
                <p className="mt-2">Support Email: <a href="mailto:support@urbansteam.in" className="text-blue-500 underline">support@urbansteam.in</a></p>
              </section>
            </div>
            <div className="p-4 border-t">
              <Button
                onClick={() => setShowTermsModal(false)}
                className="w-full h-10 sm:h-12 rounded-xl text-white"
                style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateProfile;