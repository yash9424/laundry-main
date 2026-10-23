import { useState } from "react";
import { X } from "lucide-react";

interface AddAddressProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAddress: (address: { title: string; subtitle: string }) => void;
}

const AddAddress = ({ isOpen, onClose, onAddAddress }: AddAddressProps) => {
  const [address, setAddress] = useState({ title: "", subtitle: "" });

  const handleSubmit = () => {
    if (address.title.trim()) {
      onAddAddress(address);
      setAddress({ title: "", subtitle: "" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="max-h-[85vh] overflow-y-auto bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-black">Add New Address</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Address Title"
            value={address.title}
            onChange={(e) => setAddress({...address, title: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Address Details (Optional)"
            value={address.subtitle}
            onChange={(e) => setAddress({...address, subtitle: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-semibold"
          >
            Add Address
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAddress;