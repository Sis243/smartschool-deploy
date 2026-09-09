'use client';

import { useEffect, useState } from 'react';
import parentApi from '@/lib/parent-api';

const canalIcon: Record<string, string> = {
  SMS: '💬',
  EMAIL: '📧',
  WHATSAPP: '📱',
  PUSH: '🔔',
};

export default function ParentNotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi.get('/api/v1/parent/notifications')
      .then((r) => setNotifs(r.data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function marquerLu(id: string) {
    await parentApi.patch(`/api/v1/parent/notifications/${id}/lu`);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-bold text-gray-900">Notifications</h1>

      {notifs.length === 0 ? (
        <p className="text-center text-gray-400 py-12 text-sm">Aucune notification</p>
      ) : (
        notifs.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.lu && marquerLu(n.id)}
            className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer transition ${
              n.lu ? 'opacity-70' : 'border-l-4 border-blue-500'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{canalIcon[n.canal] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-sm text-gray-900 leading-tight">{n.titre}</p>
                  {!n.lu && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(n.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
