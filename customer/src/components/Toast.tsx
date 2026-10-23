import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type, onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-6 h-6 flex-shrink-0" />,
    error: <XCircle className="w-6 h-6 flex-shrink-0" />,
    warning: <AlertCircle className="w-6 h-6 flex-shrink-0" />
  };

  const colors = {
    success: 'from-green-500 to-green-600',
    error: 'from-red-500 to-red-600',
    warning: 'from-orange-500 to-orange-600'
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[70] animate-in slide-in-from-top duration-300 w-[90%] max-w-md">
      <div className={`bg-gradient-to-r ${colors[type]} text-white px-4 py-4 rounded-2xl shadow-2xl flex items-center gap-3`}>
        {icons[type]}
        <span className="font-semibold flex-1 text-sm sm:text-base">{message}</span>
        <button onClick={onClose} className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmDialog = ({ 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}: ConfirmDialogProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="max-h-[85vh] overflow-y-auto bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <h3 className="text-lg sm:text-xl font-bold mb-2">{title}</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl font-semibold text-gray-600 border-2 border-gray-300 hover:bg-gray-50 transition"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl font-semibold text-white shadow-lg transition"
              style={{ background: 'linear-gradient(to right, #ef4444, #dc2626)' }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
