import Link from "next/link";

export default function AdminAiConfigPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-bold">
            SYSTEM ADMIN PORTAL
          </span>
          <h1 className="text-2xl font-bold text-white">Quản Trị AI Models & Recommendation Engine</h1>
        </div>
        <Link
          href="/"
          className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
        >
          ← Về Trang Khách Hàng
        </Link>
      </div>

      {/* Admin Submenu */}
      <div className="flex gap-4 border-b border-slate-800 pb-3">
        <Link
          href="/admin/users"
          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition"
        >
          👤 Quản lý Tài khoản & Phân quyền
        </Link>
        <Link
          href="/admin/ai-config"
          className="px-4 py-2 rounded-lg bg-violet-600/20 text-violet-300 font-bold text-xs border border-violet-500/30"
        >
          🤖 Cấu hình Mô hình AI (FashionCLIP / SASRec)
        </Link>
      </div>

      {/* AI Models Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">FashionCLIP Model (Visual Embeddings)</h3>
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              ACTIVE (v1.4.0)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Trích xuất vector đặc trưng hình ảnh và văn bản sản phẩm thời trang. Lưu trữ vector 512D trên <b>pgvector (PostgreSQL)</b>.
          </p>
          <div className="text-xs text-slate-300 space-y-1">
            <div>• Dim Vector: 512 dimensions</div>
            <div>• Similarity Metric: Cosine Distance</div>
            <div>• Target Service: Python FastAPI (ai-service)</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">SASRec Model (Sequential Rec)</h3>
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              ACTIVE (v2.1.0)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Mô hình Transformer dự đoán chuỗi hành vi mua sắm tiếp theo của người dùng dựa trên lịch sử tương tác.
          </p>
          <div className="text-xs text-slate-300 space-y-1">
            <div>• Sequence Length: 50 interactions</div>
            <div>• A/B Test Rollout: 80% Traffic</div>
            <div>• Target Placement: Home For You & Product Detail</div>
          </div>
        </div>
      </div>
    </div>
  );
}
