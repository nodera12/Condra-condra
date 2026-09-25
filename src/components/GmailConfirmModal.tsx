import React from 'react';
import { AlertTriangle, Send, Trash2, X } from 'lucide-react';

export interface ConfirmActionDetails {
  type: 'send' | 'trash';
  title: string;
  description: string;
  recipient?: string;
  subject?: string;
  snippet?: string;
  confirmLabel: string;
  isDestructive?: boolean;
}

interface GmailConfirmModalProps {
  isOpen: boolean;
  actionDetails: ConfirmActionDetails | null;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const GmailConfirmModal: React.FC<GmailConfirmModalProps> = ({
  isOpen,
  actionDetails,
  onConfirm,
  onCancel,
  isProcessing,
}) => {
  if (!isOpen || !actionDetails) return null;

  const isTrash = actionDetails.type === 'trash';

  return (
    <div
      id="gmail-confirm-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        id="gmail-confirm-card"
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isTrash
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isTrash ? <Trash2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{actionDetails.title}</h3>
            <p className="text-xs text-neutral-400">User Confirmation Required</p>
          </div>
        </div>

        <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 mb-4 text-xs space-y-2">
          <p className="text-neutral-300 leading-relaxed">{actionDetails.description}</p>

          {actionDetails.recipient && (
            <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/80">
              <span className="text-neutral-500 font-medium">Recipient:</span>
              <span className="text-amber-300 font-mono break-all">{actionDetails.recipient}</span>
            </div>
          )}

          {actionDetails.subject && (
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium">Subject:</span>
              <span className="text-white font-medium truncate">{actionDetails.subject}</span>
            </div>
          )}

          {actionDetails.snippet && (
            <div className="text-[11px] text-neutral-400 italic bg-neutral-900/80 p-2 rounded border border-neutral-800 line-clamp-2">
              "{actionDetails.snippet}"
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            id="btn-confirm-cancel"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-confirm-execute"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
              isTrash
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
            } disabled:opacity-50`}
          >
            {isProcessing ? (
              <span>Executing...</span>
            ) : (
              <>
                {isTrash ? <Trash2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>{actionDetails.confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
