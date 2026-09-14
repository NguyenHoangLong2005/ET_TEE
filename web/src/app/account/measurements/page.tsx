'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';

function MeasurementsSkeleton() {
  return (
    <div className="max-w-3xl space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded"></div>
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-24"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-12 w-40 bg-gray-200 rounded-lg"></div>
    </div>
  );
}

export default function MeasurementsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState({
    measurementProfileType: 'SELF_ADULT',
    heightCm: '',
    weightKg: '',
    shoulderCm: '',
    chestCm: '',
    waistCm: '',
    hipCm: '',
    armLengthCm: '',
    legLengthCm: '',
    preferredAdultSize: '',
    preferredKidsSize: '',
    shoeSize: '',
    fitPreference: '',
    note: ''
  });

  const [originalData, setOriginalData] = useState<any>(null);

  useEffect(() => {
    const fetchMeasurements = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/account/measurements`, {
          headers: headers as Record<string, string>
        });
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          const data = {
            measurementProfileType: d.measurementProfileType || 'SELF_ADULT',
            heightCm: d.heightCm ?? '',
            weightKg: d.weightKg ?? '',
            shoulderCm: d.shoulderCm ?? '',
            chestCm: d.chestCm ?? '',
            waistCm: d.waistCm ?? '',
            hipCm: d.hipCm ?? '',
            armLengthCm: d.armLengthCm ?? '',
            legLengthCm: d.legLengthCm ?? '',
            preferredAdultSize: d.preferredAdultSize || '',
            preferredKidsSize: d.preferredKidsSize || '',
            shoeSize: d.shoeSize || '',
            fitPreference: d.fitPreference || '',
            note: d.note || ''
          };
          setFormData(data);
          setOriginalData(data);
        } else {
          setLoadError('Không thể tải thông tin số đo. Vui lòng thử lại.');
        }
      } catch {
        setLoadError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMeasurements();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Clear size logic based on type change
    if (name === 'measurementProfileType') {
      if (value === 'SELF_ADULT') {
        setFormData(prev => ({ ...prev, measurementProfileType: value, preferredKidsSize: '' }));
      } else if (value === 'CHILD') {
        setFormData(prev => ({ ...prev, measurementProfileType: value, preferredAdultSize: '' }));
      } else {
        setFormData(prev => ({ ...prev, measurementProfileType: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setHasChanges(true);
  };

  const handleCancel = () => {
    if (originalData) {
      setFormData(originalData);
    }
    setHasChanges(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (formData.heightCm && (Number(formData.heightCm) < 80 || Number(formData.heightCm) > 230)) {
      toast.error('Chiều cao phải từ 80 đến 230 cm.');
      return;
    }
    if (formData.weightKg && (Number(formData.weightKg) < 10 || Number(formData.weightKg) > 200)) {
      toast.error('Cân nặng phải từ 10 đến 200 kg.');
      return;
    }

    setIsSaving(true);
    try {
      const headers = getAuthHeaders();
      const payload: Record<string, any> = { ...formData };

      // Convert strings to numbers where necessary
      ['heightCm', 'weightKg', 'shoulderCm', 'chestCm', 'waistCm', 'hipCm', 'armLengthCm', 'legLengthCm'].forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        } else {
          payload[key] = Number(payload[key]);
        }
      });

      const res = await fetch(`${API_BASE}/api/account/measurements`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(headers as Record<string, string>)
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Lỗi cập nhật số đo');
      }

      toast.success('Đã lưu thông số thành công!');
      setOriginalData(formData);
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err.message || 'Đã xảy ra lỗi khi lưu số đo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-black uppercase mb-2">Số đo & Kích cỡ</h2>
        <p className="text-gray-500 mb-8 pb-4 border-b border-gray-100">
          Lưu số đo để ET.TEE giúp bạn chọn size chuẩn xác nhất.
        </p>
        <MeasurementsSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <h2 className="text-2xl font-black uppercase mb-2">Số đo & Kích cỡ</h2>
        <p className="text-gray-500 mb-8 pb-4 border-b border-gray-100">
          Lưu số đo để ET.TEE giúp bạn chọn size chuẩn xác nhất.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4 max-w-3xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-600 font-medium">{loadError}</p>
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
      <h2 className="text-2xl font-black uppercase mb-2">Số đo & Kích cỡ</h2>
      <p className="text-gray-500 mb-8 pb-4 border-b border-gray-100">
        Lưu số đo để ET.TEE giúp bạn chọn size chuẩn xác nhất.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">

        {/* Profile Type */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-3">Đối tượng đo <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="measurementProfileType"
                value="SELF_ADULT"
                checked={formData.measurementProfileType === 'SELF_ADULT'}
                onChange={handleChange}
                className="w-4 h-4 text-black focus:ring-black"
              />
              <span className="font-medium">Người lớn (Bản thân)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="measurementProfileType"
                value="CHILD"
                checked={formData.measurementProfileType === 'CHILD'}
                onChange={handleChange}
                className="w-4 h-4 text-black focus:ring-black"
              />
              <span className="font-medium">Trẻ em</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="measurementProfileType"
                value="OTHER"
                checked={formData.measurementProfileType === 'OTHER'}
                onChange={handleChange}
                className="w-4 h-4 text-black focus:ring-black"
              />
              <span className="font-medium">Khác (Mua hộ)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cân nặng, Chiều cao */}
          <div className="space-y-6">
            <h3 className="font-bold text-lg">Chỉ số cơ bản</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Chiều cao (cm)</label>
                <input
                  type="number"
                  name="heightCm"
                  placeholder="Ví dụ: 170"
                  value={formData.heightCm}
                  onChange={handleChange}
                  min="80"
                  max="230"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Cân nặng (kg)</label>
                <input
                  type="number"
                  name="weightKg"
                  placeholder="Ví dụ: 65"
                  value={formData.weightKg}
                  onChange={handleChange}
                  min="10"
                  max="200"
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
                />
              </div>
            </div>
          </div>

          {/* Size ưu thích */}
          <div className="space-y-6">
            <h3 className="font-bold text-lg">Size ưu tiên</h3>

            <div className="space-y-4">
              {(formData.measurementProfileType === 'SELF_ADULT' || formData.measurementProfileType === 'OTHER') && (
                <div>
                  <label className="text-sm font-bold text-gray-700">Size quần áo người lớn</label>
                  <select
                    name="preferredAdultSize"
                    value={formData.preferredAdultSize}
                    onChange={handleChange}
                    className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
                  >
                    <option value="">Chưa xác định</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
              )}

              {(formData.measurementProfileType === 'CHILD' || formData.measurementProfileType === 'OTHER') && (
                <div>
                  <label className="text-sm font-bold text-gray-700">Size trẻ em</label>
                  <select
                    name="preferredKidsSize"
                    value={formData.preferredKidsSize}
                    onChange={handleChange}
                    className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
                  >
                    <option value="">Chưa xác định</option>
                    <option value="90">90 (1-2T)</option>
                    <option value="100">100 (2-3T)</option>
                    <option value="110">110 (3-4T)</option>
                    <option value="120">120 (5-6T)</option>
                    <option value="130">130 (7-8T)</option>
                    <option value="140">140 (9-10T)</option>
                    <option value="150">150 (11-12T)</option>
                    <option value="160">160 (13-14T)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-gray-700">Size giày/dép</label>
                <input
                  type="text"
                  name="shoeSize"
                  placeholder="Ví dụ: 40 hoặc 250mm"
                  value={formData.shoeSize}
                  onChange={handleChange}
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Sở thích mặc đồ</label>
                <select
                  name="fitPreference"
                  value={formData.fitPreference}
                  onChange={handleChange}
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
                >
                  <option value="">Chưa xác định</option>
                  <option value="SLIM">Ôm vừa vặn (Slim fit)</option>
                  <option value="REGULAR">Thoải mái (Regular fit)</option>
                  <option value="LOOSE">Rộng rãi (Loose / Oversize)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Số đo chi tiết */}
        <div className="pt-6 border-t border-gray-100">
          <h3 className="font-bold text-lg mb-6">Số đo chi tiết (cm) <span className="font-normal text-sm text-gray-500">- Không bắt buộc</span></h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Vai</label>
              <input type="number" name="shoulderCm" value={formData.shoulderCm} onChange={handleChange} min="0" className="w-full mt-1 p-2 border border-gray-300 rounded transition-shadow focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Ngực</label>
              <input type="number" name="chestCm" value={formData.chestCm} onChange={handleChange} min="0" className="w-full mt-1 p-2 border border-gray-300 rounded transition-shadow focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Eo</label>
              <input type="number" name="waistCm" value={formData.waistCm} onChange={handleChange} min="0" className="w-full mt-1 p-2 border border-gray-300 rounded transition-shadow focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Mông</label>
              <input type="number" name="hipCm" value={formData.hipCm} onChange={handleChange} min="0" className="w-full mt-1 p-2 border border-gray-300 rounded transition-shadow focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Dài tay</label>
              <input type="number" name="armLengthCm" value={formData.armLengthCm} onChange={handleChange} min="0" className="w-full mt-1 p-2 border border-gray-300 rounded transition-shadow focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Dài chân</label>
              <input type="number" name="legLengthCm" value={formData.legLengthCm} onChange={handleChange} min="0" className="w-full mt-1 p-2 border border-gray-300 rounded transition-shadow focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700">Ghi chú thêm</label>
          <textarea
            name="note"
            rows={2}
            value={formData.note}
            onChange={handleChange}
            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow resize-none"
            placeholder="Ví dụ: Đùi to, tay áo thích mặc dài..."
          ></textarea>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            LƯU SỐ ĐO
          </button>

          {hasChanges && (
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
