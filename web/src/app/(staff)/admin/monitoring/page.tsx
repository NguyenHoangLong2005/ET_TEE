'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Cpu, Database, ShoppingCart, AlertTriangle, Clock, Server, HardDrive, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

type Metrics = {
  jvm: {
    usedMemoryMb: number;
    totalMemoryMb: number;
    freeMemoryMb: number;
    maxMemoryMb: number;
    systemLoad: number;
    processors: number;
    threadCount: number;
    peakThreadCount: number;
  };
  database: {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    maxPoolSize: number;
    minIdle: number;
    threadsAwaitingConnection: number;
  };
  orders: {
    totalOrders: number;
    pendingOrders: number;
    activeOrders: number;
  };
  recentErrors: number;
  uptime: {
    startTime: number;
    uptimeMs: number;
    uptimeFormatted: string;
  };
};

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.get<Metrics>('/api/admin/monitoring/metrics');
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu giám sát hệ thống');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const formatMemory = (mb?: number) => {
    const safeMb = Number(mb) || 0;
    if (safeMb >= 1024) {
      return `${(safeMb / 1024).toFixed(1)} GB`;
    }
    return `${safeMb.toFixed(0)} MB`;
  };

  const getMemoryPercentage = () => {
    if (!metrics?.jvm?.maxMemoryMb || metrics.jvm.maxMemoryMb <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((metrics.jvm.usedMemoryMb || 0) / metrics.jvm.maxMemoryMb) * 100)));
  };

  const getDbPoolPercentage = () => {
    if (!metrics?.database?.maxPoolSize || metrics.database.maxPoolSize <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((metrics.database.activeConnections || 0) / metrics.database.maxPoolSize) * 100)));
  };

  if (loading) {
    return (
      <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-slate-900">Giám Sát Hệ Thống (System Monitoring)</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-slate-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </PermissionGuard>
    );
  }

  if (error) {
    return (
      <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Giám Sát Hệ Thống (System Monitoring)</h1>
            <button
              type="button"
              onClick={() => { setLoading(true); fetchMetrics(); }}
              className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Thử lại
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            {error}
          </div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Giám Sát Hệ Thống"
          subtitle={metrics?.uptime ? `Uptime: ${metrics.uptime.uptimeFormatted}` : "Theo dõi trạng thái JVM, kết nối cơ sở dữ liệu và tài nguyên máy chủ"}
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'Giám sát hệ thống' },
          ]}
          actions={
            <Button
              variant="outline"
              onClick={() => { setLoading(true); fetchMetrics(); }}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Làm mới
            </Button>
          }
        />

      {metrics?.recentErrors && metrics.recentErrors > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <div className="font-semibold text-red-800">
              {metrics.recentErrors} lỗi trong 1 giờ gần đây
            </div>
            <div className="text-xs text-red-600">Kiểm tra nhật ký để biết chi tiết</div>
          </div>
        </div>
      )}

      {metrics && (
        <>
          {/* JVM Metrics */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-6 h-6 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">JVM & System Resources</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {/* Memory */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Bộ nhớ JVM</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatMemory(metrics.jvm.usedMemoryMb)} / {formatMemory(metrics.jvm.maxMemoryMb)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      getMemoryPercentage() > 90 ? 'bg-red-500' : 
                      getMemoryPercentage() > 70 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${getMemoryPercentage()}%` }}
                  ></div>
                </div>
                <div className="text-xs text-slate-500 mt-1">{getMemoryPercentage()}% sử dụng</div>
              </div>

              {/* CPU */}
              <div>
                <div className="text-sm text-slate-500 mb-1">CPU Load</div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics.jvm.systemLoad > 0 ? metrics.jvm.systemLoad.toFixed(2) : 'N/A'}
                </div>
                <div className="text-xs text-slate-500">avg trên {metrics.jvm.processors} cores</div>
              </div>

              {/* Threads */}
              <div>
                <div className="text-sm text-slate-500 mb-1">Threads</div>
                <div className="text-2xl font-bold text-slate-900">{metrics.jvm.threadCount}</div>
                <div className="text-xs text-slate-500">Peak: {metrics.jvm.peakThreadCount}</div>
              </div>

              {/* System Memory */}
              <div>
                <div className="text-sm text-slate-500 mb-1">System Memory</div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatMemory(metrics.jvm.totalMemoryMb)}
                </div>
                <div className="text-xs text-slate-500">
                  Free: {formatMemory(metrics.jvm.freeMemoryMb)}
                </div>
              </div>
            </div>
          </div>

          {/* Database Pool */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Database Connection Pool</h2>
            </div>

            {metrics.database && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <div className="text-3xl font-bold text-emerald-700">{metrics.database.activeConnections}</div>
                    <div className="text-xs text-emerald-600 mt-1">Đang sử dụng</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-700">{metrics.database.idleConnections}</div>
                    <div className="text-xs text-blue-600 mt-1">Rảnh rỗi</div>
                  </div>
                  <div className="text-center p-4 bg-slate-100 rounded-xl">
                    <div className="text-3xl font-bold text-slate-700">{metrics.database.totalConnections}</div>
                    <div className="text-xs text-slate-600 mt-1">Tổng kết nối</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-xl">
                    <div className="text-3xl font-bold text-amber-700">{metrics.database.maxPoolSize}</div>
                    <div className="text-xs text-amber-600 mt-1">Max Pool Size</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Pool Usage</span>
                    <span className="text-sm font-bold text-slate-900">
                      {metrics.database.activeConnections} / {metrics.database.maxPoolSize}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all ${
                        getDbPoolPercentage() > 90 ? 'bg-red-500' : 
                        getDbPoolPercentage() > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, getDbPoolPercentage())}%` }}
                    ></div>
                  </div>
                </div>

                {metrics.database.threadsAwaitingConnection > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-800">
                        {metrics.database.threadsAwaitingConnection} threads đang chờ kết nối!
                      </div>
                      <div className="text-xs text-red-600">Cân nhắc tăng max pool size</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Statistics */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
              <h2 className="text-sm font-semibold text-slate-900">Order Statistics</h2>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <div className="text-3xl font-bold text-slate-700">{metrics.orders.totalOrders}</div>
                <div className="text-xs text-slate-500 mt-1">Tổng đơn hàng</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <div className="text-3xl font-bold text-amber-700">{metrics.orders.pendingOrders}</div>
                <div className="text-xs text-amber-600 mt-1">Đang chờ xử lý</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-700">{metrics.orders.activeOrders}</div>
                <div className="text-xs text-blue-600 mt-1">Đang xử lý/Ship</div>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </PermissionGuard>
  );
}

