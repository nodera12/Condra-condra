import React from 'react';
import { X, Check, Bell, UserPlus, Zap, Info, CheckCircle2 } from 'lucide-react';
import { AppNotification } from '../types.ts';
import { api } from '../lib/api.ts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onRefresh: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      onRefresh();
    } catch (err) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      onRefresh();
    } catch (err) {
      // Ignore
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-4 h-4 text-sky-400" />;
      case 'data_status':
        return <Zap className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div
      id="notification-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        id="notification-drawer-panel"
        className="w-full max-w-sm h-full bg-neutral-900 border-l border-neutral-800 p-4 flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white font-['Outfit',sans-serif]">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              title="Mark all as read"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              No notifications yet. You're all caught up!
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-neutral-950/40 border-neutral-800/60 text-neutral-300'
                    : 'bg-neutral-900 border-amber-500/30 text-white shadow-sm ring-1 ring-amber-500/20'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-neutral-800 shrink-0 mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-semibold truncate text-white">{notif.title}</h4>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-neutral-500 mt-1.5 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
