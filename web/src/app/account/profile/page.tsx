'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Save, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';

function ProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-100 rounded-lg"></div>
          </div>
        ))}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-100 rounded-lg"></div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="h-24 bg-gray-100 rounded-lg"></div>
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
  const [isEditing, setIsEditing] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    avatarUrl: '',
    defaultShippingAddress: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/account/profile`, {
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
            avatarUrl: d.avatarUrl || '',
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
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (originalData) {
      setFormData(originalData);
    }
    setIsEditing(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
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
      const res = await fetch(`${API_BASE}/api/account/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(headers as Record<string, string>)
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Lỗi cập nhật hồ sơ');
      }

      toast.success('Đã cập nhật hồ sơ thành công!');
      setOriginalData(formData);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Đã xảy ra lỗi khi cập nhật hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

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
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4">
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

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Họ và tên <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Email (Không thể sửa)</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full p-3 border border-gray-200 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Số điện thoại</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0xxx xxx xxx"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Giới tính</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
            >
              <option value="">Chọn giới tính</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Ngày sinh</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Ảnh đại diện (URL)</label>
            <input
              type="text"
              name="avatarUrl"
              placeholder="https://..."
              value={formData.avatarUrl}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Địa chỉ giao hàng mặc định</label>
          <textarea
            name="defaultShippingAddress"
            rows={3}
            value={formData.defaultShippingAddress}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow resize-none"
            placeholder="Ví dụ: 123 Nguyễn Trãi, Quận 1, TP.HCM"
          ></textarea>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSaving || !isEditing}
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
