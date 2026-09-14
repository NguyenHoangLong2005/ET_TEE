'use client';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold mb-4">Đã xảy ra lỗi hệ thống</h2>
        <p className="text-gray-500 mb-8">
          Chúng tôi đang nỗ lực khắc phục. Vui lòng thử lại sau.
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-3 bg-black text-white rounded font-bold uppercase hover:bg-gray-800 transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
