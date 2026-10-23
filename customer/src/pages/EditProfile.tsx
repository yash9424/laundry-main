import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Plus, X, Camera } from "lucide-react";
import { API_URL } from '@/config/api';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import Header from "@/components/Header";

const EditProfile = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showImageOptions, setShowImageOptions] = useState(false);

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) {
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const customer = data.data;
        setFormData({
          fullName: customer.name || '',
          email: customer.email || '',
          phone: customer.mobile?.startsWith('google_') ? '' : customer.mobile || ''
        });
        setProfileImage(customer.profileImage || null);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    }
  };

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
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const customerId = localStorage.getItem('customerId');
      
      const updateData: any = {
        name: formData.fullName,
        email: formData.email,
        mobile: formData.phone
      };
      
      if (profileImage) {
        updateData.profileImage = profileImage;
      }
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('userName', formData.fullName);
        window.dispatchEvent(new Event('userNameChanged'));
        navigate("/profile");
      } else {
        alert('Failed to update profile: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Failed to update profile: ' + (error.message || 'Network error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header 
        title="Edit Profile"
        onBack={() => navigate(-1)}
      />

      <div className="px-4 sm:px-6 py-4 sm:py-6">
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
          <p className="mt-2 sm:mt-3 text-gray-600 text-xs sm:text-sm">Tap to change photo</p>
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
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!formData.fullName || !formData.email || !formData.phone || isLoading}
          className="w-full h-10 sm:h-12 rounded-xl text-white text-sm sm:text-base font-semibold mt-6 disabled:cursor-not-allowed"
          style={!formData.fullName || !formData.email || !formData.phone || isLoading ? { background: '#9ca3af' } : { background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
        >
          {isLoading ? 'Updating...' : 'Update Profile'}
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
    </div>
  );
};

export default EditProfile;