'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Info } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';
import { toast } from 'sonner';

const getApiBase = () => getApiBaseUrl();

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

const MEASUREMENT_PROFILES = [
  { id: 'SELF_ADULT', label: 'Người lớn (Bản thân)', icon: '👤' },
  { id: 'CHILD', label: 'Trẻ em', icon: '👦' },
  { id: 'OTHER', label: 'Mua hộ / Khác', icon: '🎁' },
];

const FIT_PREFERENCES = [
  { id: 'SLIM', label: 'Ôm vừa vặn', subLabel: 'Slim fit', icon: '👕' },
  { id: 'REGULAR', label: 'Thoải mái', subLabel: 'Regular fit', icon: '👔' },
  { id: 'LOOSE', label: 'Rộng rãi', subLabel: 'Loose / Oversize', icon: '🧥' },
];

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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeasurements = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${getApiBase()}/api/account/measurements`, {
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
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleProfileTypeChange = (value: string) => {
    let updates: any = { measurementProfileType: value };
    if (value === 'SELF_ADULT') {
      updates.preferredKidsSize = '';
    } else if (value === 'CHILD') {
      updates.preferredAdultSize = '';
    }
    setFormData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleFitPreferenceChange = (value: string) => {
    setFormData(prev => ({ ...prev, fitPreference: value }));
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

      ['heightCm', 'weightKg', 'shoulderCm', 'chestCm', 'waistCm', 'hipCm', 'armLengthCm', 'legLengthCm'].forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        } else {
          payload[key] = Number(payload[key]);
        }
      });

      const res = await fetch(`${getApiBase()}/api/account/measurements`, {
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

  const detailedFields = [
    { name: 'shoulderCm', label: 'Vai', desc: 'Đo từ mỏm vai trái sang mỏm vai phải.' },
    { name: 'chestCm', label: 'Ngực', desc: 'Đo vòng quanh phần nở nhất của ngực.' },
    { name: 'waistCm', label: 'Eo', desc: 'Đo vòng quanh phần nhỏ nhất của eo.' },
    { name: 'hipCm', label: 'Mông', desc: 'Đo vòng quanh phần nở nhất của mông.' },
    { name: 'armLengthCm', label: 'Dài tay', desc: 'Đo từ mỏm vai đến cổ tay.' },
    { name: 'legLengthCm', label: 'Dài chân', desc: 'Đo từ eo xuống mắt cá chân.' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-black uppercase mb-2">Số đo & Kích cỡ</h2>
      <p className="text-gray-500 mb-8 pb-4 border-b border-gray-100">
        Lưu số đo để ET.TEE giúp bạn chọn size chuẩn xác nhất.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">

        {/* Profile Type */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <label className="block text-base font-bold text-gray-900 mb-4">Đối tượng đo <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MEASUREMENT_PROFILES.map(profile => (
              <button
                key={profile.id}
                type="button"
                onClick={() => handleProfileTypeChange(profile.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  formData.measurementProfileType === profile.id
                    ? 'border-black bg-white shadow-sm'
                    : 'border-transparent bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <span className="text-3xl mb-2">{profile.icon}</span>
                <span className={`text-sm font-semibold ${formData.measurementProfileType === profile.id ? 'text-black' : ''}`}>
                  {profile.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cân nặng, Chiều cao */}
          <div className="space-y-6">
            <h3 className="font-bold text-lg text-gray-900">Chỉ số cơ bản</h3>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-600">Chiều cao</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    name="heightCm"
                    placeholder="170"
                    value={formData.heightCm}
                    onChange={handleChange}
                    min="80"
                    max="230"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900"
                  />
                  <span className="absolute right-4 top-3 text-gray-500 font-medium">cm</span>
                </div>
              </div>

              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-600">Cân nặng</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    name="weightKg"
                    placeholder="65"
                    value={formData.weightKg}
                    onChange={handleChange}
                    min="10"
                    max="200"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900"
                  />
                  <span className="absolute right-4 top-3 text-gray-500 font-medium">kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Size ưu thích */}
          <div className="space-y-6">
            <h3 className="font-bold text-lg text-gray-900">Size ưu tiên</h3>

            <div className="grid grid-cols-2 gap-4">
              {(formData.measurementProfileType === 'SELF_ADULT' || formData.measurementProfileType === 'OTHER') && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Áo/Quần người lớn</label>
                  <select
                    name="preferredAdultSize"
                    value={formData.preferredAdultSize}
                    onChange={handleChange}
                    className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900 bg-white"
                  >
                    <option value="">Chọn size...</option>
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
                  <label className="text-sm font-semibold text-gray-600">Trẻ em</label>
                  <select
                    name="preferredKidsSize"
                    value={formData.preferredKidsSize}
                    onChange={handleChange}
                    className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900 bg-white"
                  >
                    <option value="">Chọn size...</option>
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

              <div className={formData.measurementProfileType === 'OTHER' ? 'col-span-2' : ''}>
                <label className="text-sm font-semibold text-gray-600">Giày/dép</label>
                <input
                  type="text"
                  name="shoeSize"
                  placeholder="Vd: 40 hoặc 250mm"
                  value={formData.shoeSize}
                  onChange={handleChange}
                  className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sở thích mặc đồ */}
        <div className="pt-6 border-t border-gray-100">
          <h3 className="font-bold text-lg text-gray-900 mb-4">Sở thích mặc đồ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FIT_PREFERENCES.map(fit => (
              <button
                key={fit.id}
                type="button"
                onClick={() => handleFitPreferenceChange(fit.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  formData.fitPreference === fit.id
                    ? 'border-black bg-white shadow-sm'
                    : 'border-transparent bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <span className="text-2xl">{fit.icon}</span>
                <div>
                  <p className={`font-semibold text-sm ${formData.fitPreference === fit.id ? 'text-black' : ''}`}>{fit.label}</p>
                  <p className="text-xs text-gray-500">{fit.subLabel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Số đo chi tiết */}
        <div className="pt-6 border-t border-gray-100">
          <div className="mb-6 flex flex-col">
            <h3 className="font-bold text-lg text-gray-900">Số đo chi tiết (cm)</h3>
            <span className="text-sm text-gray-500">Giúp hệ thống gợi ý size quần áo chuẩn xác hơn (Không bắt buộc)</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            {detailedFields.map(field => (
              <div key={field.name}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">{field.label}</label>
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setActiveTooltip(field.name)}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onClick={() => setActiveTooltip(activeTooltip === field.name ? null : field.name)}
                      className="text-gray-400 hover:text-black"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                    {activeTooltip === field.name && (
                      <div className="absolute z-10 w-48 p-2 mt-1 text-xs text-white bg-black rounded-lg shadow-lg -left-24 bottom-full mb-2">
                        {field.desc}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                      </div>
                    )}
                  </div>
                </div>
                <input 
                  type="number" 
                  name={field.name} 
                  value={(formData as any)[field.name]} 
                  onChange={handleChange} 
                  min="0" 
                  placeholder="--"
                  className="w-full p-2 border border-gray-300 rounded-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-black text-gray-900 bg-gray-50 hover:bg-white focus:bg-white" 
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-600 mb-1 block">Ghi chú thêm</label>
          <textarea
            name="note"
            rows={2}
            value={formData.note}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900 resize-none"
            placeholder="Ví dụ: Đùi to, tay áo thích mặc dài..."
          ></textarea>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
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
