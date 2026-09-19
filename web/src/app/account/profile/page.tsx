'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Save, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';
import { toast } from 'sonner';

const getApiBase = () => getApiBaseUrl();

function ProfileSkeleton() {
  return (
    <div className="space-y-8 max-w-3xl animate-pulse">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
        <div className="space-y-3">
          <div className="h-6 w-48 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-100 rounded"></div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-gray-100">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={`c-${i}`} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-100 rounded-lg"></div>
            </div>
          ))}
          <div className="space-y-2 md:col-span-2">
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      </div>
      <div className="h-12 w-40 bg-gray-200 rounded-lg"></div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    defaultShippingAddress: ''
  });

  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${getApiBase()}/api/account/profile`, {
          headers: headers as Record<string, string>
        });
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          const data = {
            fullName: d.fullName || '',
            phone: d.phone || '',
            gender: d.gender || '',
            dateOfBirth: d.dateOfBirth || '',
            defaultShippingAddress: d.defaultShippingAddress || ''
          };
          setFormData(data);
          setOriginalData(data);
        } else {
          setError('Không thể tải thông tin hồ sơ. Vui lòng thử lại.');
        }
      } catch {
        setError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // Basic VN phone validation: 10 digits starting with 0
      const phoneRegex = /(0[3|5|7|8|9])+([0-9]{8})\b/g;
      if (value && !phoneRegex.test(value)) {
        setPhoneError('Số điện thoại không hợp lệ (vd: 0912345678)');
      } else {
        setPhoneError('');
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    if (originalData) {
      setFormData(originalData);
      setPhoneError('');
    }
  };

  const isEditing = JSON.stringify(formData) !== JSON.stringify(originalData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phoneError) {
      toast.error('Vui lòng sửa các lỗi trên form trước khi lưu.');
      return;
    }

    if (!formData.fullName || !formData.fullName.trim()) {
      toast.error('Họ tên không được để trống.');
      return;
    }
    
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      if (dob > new Date()) {
        toast.error('Ngày sinh không thể là ngày trong tương lai.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const headers = getAuthHeaders();
      // Keep avatarUrl in payload if it was there before, or just send what we have
      const payload = { ...formData };
      
      const res = await fetch(`${getApiBase()}/api/account/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(headers as Record<string, string>)
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Lỗi cập nhật hồ sơ');
      }

      toast.success('Đã cập nhật hồ sơ thành công!');
      setOriginalData(formData);
      
      // Optionally trigger a context refresh here if needed to update the sidebar name immediately
    } catch (err: any) {
      toast.error(err.message || 'Đã xảy ra lỗi khi cập nhật hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => 
    name ? name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() : 'U';

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-black uppercase mb-6 pb-4 border-b border-gray-100">Hồ sơ cá nhân</h2>
        <ProfileSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-black uppercase mb-6 pb-4 border-b border-gray-100">Hồ sơ cá nhân</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4 max-w-3xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-black uppercase mb-6 pb-4 border-b border-gray-100">Hồ sơ cá nhân</h2>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
        
        {/* Avatar Display */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 flex-shrink-0 rounded-full bg-black text-white flex items-center justify-center font-bold text-2xl uppercase overflow-hidden border border-gray-100 shadow-sm">
            {(user as any)?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={(user as any).avatarUrl} 
                alt={user?.fullName || ''} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              getInitials(user?.fullName || '')
            )}
          </div>
          <div>
            <h3 className="font-bold text-xl text-gray-900">{user?.fullName}</h3>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Section 1: Thông tin cá nhân */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-gray-900">Thông tin cá nhân</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">Họ và tên <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">Giới tính</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900 bg-white"
              >
                <option value="">Chưa xác định</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">Ngày sinh</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Thông tin liên hệ */}
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Thông tin liên hệ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-semibold text-gray-600">
                Email
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Không thể sửa</span>
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full p-3 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0912 345 678"
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900 ${
                  phoneError ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-600">Địa chỉ giao hàng mặc định</label>
              <textarea
                name="defaultShippingAddress"
                rows={3}
                value={formData.defaultShippingAddress}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900 resize-none"
                placeholder="Ví dụ: 123 Nguyễn Trãi, Quận 1, TP.HCM"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={isSaving || !isEditing || !!phoneError}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            LƯU THAY ĐỔI
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-8 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
            >
              HỦY
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
