import React, { useState, useEffect } from 'react';
import { ExternalLink, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api.ts';
import { RequiredLink } from '../types.ts';

export const RequiredLinkGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<RequiredLink | null>(null);
  const [hasCompleted, setHasCompleted] = useState<boolean>(() => {
    return sessionStorage.getItem('mrfelix_required_link_completed') === 'true';
  });

  const checkConfig = async () => {
    try {
      const data = await api.getRequiredLink();
      setConfig(data);
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    checkConfig();
    const interval = setInterval(checkConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleContinue = () => {
    if (config?.url) {
      window.open(config.url, '_blank', 'noopener,noreferrer');
      sessionStorage.setItem('mrfelix_required_link_completed', 'true');
      setHasCompleted(true);
    }
  };

  // If enabled and not completed in this session, show required action screen
  if (config && config.isEnabled && !hasCompleted) {
    return (
      <div
        id="required-link-screen"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950 text-neutral-100"
      >
        <div className="relative w-full max-w-md bg-neutral-900 border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            Important Notice
          </span>

          <h2 className="text-xl font-bold text-white font-['Outfit',sans-serif] mb-2">
            {config.title || 'Important'}
          </h2>

          <p className="text-sm text-neutral-300 leading-relaxed mb-6">
            {config.description || 'You have an action to complete before continuing.'}
          </p>

          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400 mb-6 flex items-center justify-center gap-2 truncate">
            <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{config.url}</span>
          </div>

          <button
            id="btn-required-link-continue"
            onClick={handleContinue}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all"
          >
            <span>Continue</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-neutral-500 mt-4">
            This verification or partner step is configured by the platform administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
