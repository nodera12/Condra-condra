import React, { useState, useEffect } from 'react';
import {
  Zap,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  History,
  ArrowRight,
  Info,
  Wallet,
  Building2,
  ArrowDownLeft,
  X,
  CreditCard,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { DataPackage, DataPurchase } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface BuyDataViewProps {
  adminOnline: boolean;
  onOpenWallet?: () => void;
}

const PALMPAY_CONFIG = {
  bank: 'PalmPay',
  accountNumber: '9076586127',
  accountFormatted: '907  658  6127',
  name: 'ALBERT TERKIMBI UKULA',
};

export const BuyDataView: React.FC<BuyDataViewProps> = ({ adminOnline, onOpenWallet }) => {
  const { user, isAuthenticated, requireAuthAction, openAuthModal, refreshUser } = useAuth();

  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [history, setHistory] = useState<DataPurchase[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<DataPackage | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  const walletBalance = user?.walletBalance || 0;

  const loadData = async () => {
    try {
      const pkgs = await api.getDataPackages();
      setPackages(pkgs);
      if (isAuthenticated) {
        const hist = await api.getDataPurchasesHistory();
        setHistory(hist);
      }
    } catch (err) {
      console.error('Failed to load data bundles:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (isAuthenticated) {
        api.getDataPurchasesHistory().then(setHistory).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleCopyAccount = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const getPackageNumericPrice = (pkg: DataPackage): number => {
    return parseInt(pkg.price.replace(/[^0-9]/g, ''), 10) || 250;
  };

  const handleOpenBuy = (pkg: DataPackage) => {
    requireAuthAction(() => {
      setSelectedPackage(pkg);
      setShowOrderModal(true);
      setStatusMessage(null);
      setErrorMessage(null);
    }, 'Please log in or create an account to buy data packages.');
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;

    const price = getPackageNumericPrice(selectedPackage);
    if (walletBalance < price) {
      setErrorMessage(
        `Insufficient funds. Your wallet balance is ₦${walletBalance.toLocaleString()}, but this data bundle requires ₦${price.toLocaleString()}. Please deposit money into your wallet.`
      );
      return;
    }

    if (!phoneNumber || phoneNumber.trim().length < 8) {
      setErrorMessage('Please enter a valid phone number (e.g. 08012345678 or +234 801 234 5678).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await api.createDataPurchase(phoneNumber.trim());
      // Refresh user to immediately sync the deducted wallet balance
      await refreshUser();

      setStatusMessage(
        res.message ||
          `Payment of ₦${price.toLocaleString()} deducted from your wallet. Request is pending administrator approval.`
      );
      setPhoneNumber('');
      setShowOrderModal(false);

      // Reload purchase history
      const updated = await api.getDataPurchasesHistory();
      setHistory(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit purchase request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: DataPurchase['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/60 border border-red-800 text-red-400">
            <XCircle className="w-3.5 h-3.5" />
            Rejected (Refunded)
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-800 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            Pending Approval
          </span>
        );
    }
  };

  return (
    <div
      id="buy-data-page"
      className="min-h-[calc(100vh-3.5rem)] pb-20 pt-4 px-4 max-w-xl mx-auto text-neutral-100 animate-in fade-in duration-200"
    >
      {/* 1. Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-white font-['Outfit',sans-serif] flex items-center gap-2">
            Buy Mobile Data
            <Zap className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-neutral-400">Fast broadband allocation deducted directly from wallet</p>
        </div>

        {/* Live Admin Online Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            adminOnline
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${adminOnline ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
          <span>{adminOnline ? 'Admin Online' : 'Admin Offline'}</span>
        </div>
      </div>

      {/* 2. Wallet Balance Bar & Status */}
      {isAuthenticated && (
        <div
          id="card-wallet-status-banner"
          className="mb-5 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 block font-medium">Your Wallet Balance</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-amber-400 font-bold">₦</span>
                <span className="text-xl font-black text-white font-mono">
                  {walletBalance.toLocaleString()}
                </span>
                {walletBalance < 250 && (
                  <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    Low Balance
                  </span>
                )}
              </div>
            </div>
          </div>

          {onOpenWallet && (
            <button
              id="btn-deposit-shortcut"
              onClick={onOpenWallet}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs transition-all shadow active:scale-95 shrink-0"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Deposit via PalmPay</span>
            </button>
          )}
        </div>
      )}

      {/* Notice regarding request status */}
      {statusMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2.5 shadow-lg">
          <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* 3. Main Package Section */}
      <div className="mb-6">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-2">
          Available Data Bundle
        </span>

        {packages.map((pkg) => {
          const price = getPackageNumericPrice(pkg);
          const hasInsufficientFunds = isAuthenticated && walletBalance < price;

          return (
            <div
              key={pkg.id}
              className="p-5 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border-2 border-amber-500/30 hover:border-amber-500/60 transition-all shadow-xl relative overflow-hidden"
            >
              {/* Subtle glow highlight */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                    {pkg.name}
                  </span>
                  <div className="text-3xl font-black text-white font-['Outfit',sans-serif] mt-2 tracking-tight">
                    {pkg.size}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">{pkg.validity} High-Speed Broadband</div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-neutral-500 block">Price</span>
                  <span className="text-2xl font-black text-amber-400 font-['Outfit',sans-serif]">{pkg.price}</span>
                  <span className="text-[10px] text-neutral-400 block">Deducted from Wallet</span>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed mb-4 border-t border-neutral-800/80 pt-3">
                {pkg.description}
              </p>

              {/* Insufficient Funds Warning inside card if balance is inadequate */}
              {hasInsufficientFunds && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      <strong>Insufficient Funds:</strong> You have ₦{walletBalance.toLocaleString()}, but ₦
                      {price.toLocaleString()} is required.
                    </span>
                  </div>
                  {onOpenWallet && (
                    <button
                      onClick={onOpenWallet}
                      className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-[11px] font-bold shrink-0"
                    >
                      Deposit Now
                    </button>
                  )}
                </div>
              )}

              {/* Action Button */}
              {!isAuthenticated ? (
                <button
                  id="btn-buy-package-login"
                  onClick={() => openAuthModal('login', 'Please log in to purchase data.')}
                  className="w-full py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all"
                >
                  <span>Log In to Buy Data</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : hasInsufficientFunds ? (
                <button
                  id="btn-buy-package-insufficient"
                  onClick={() => handleOpenBuy(pkg)}
                  className="w-full py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all"
                >
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>Insufficient Funds — Deposit Required</span>
                </button>
              ) : (
                <button
                  id="btn-buy-package"
                  onClick={() => handleOpenBuy(pkg)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all"
                >
                  <span>BUY DATA NOW ({pkg.price})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* PalmPay Deposit Card for Quick Reference */}
      <div className="mb-6 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-neutral-200">Official PalmPay Deposit Info</span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            Instant Credit
          </span>
        </div>
        <p className="text-neutral-400 text-[11px] mb-3 leading-relaxed">
          Need more funds in your wallet? Transfer directly to the PalmPay details below and upload your receipt in the{' '}
          <strong className="text-amber-400">Wallet</strong> section.
        </p>
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 flex items-center justify-between text-xs">
          <div>
            <div className="text-neutral-400 text-[11px]">Bank: <strong className="text-neutral-200">{PALMPAY_CONFIG.bank}</strong></div>
            <div className="text-neutral-400 text-[11px]">Name: <strong className="text-neutral-200">{PALMPAY_CONFIG.name}</strong></div>
            <div className="font-mono text-amber-400 font-bold tracking-wider mt-0.5">
              {PALMPAY_CONFIG.accountFormatted}
            </div>
          </div>
          <button
            onClick={() => handleCopyAccount(PALMPAY_CONFIG.accountNumber)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
          >
            {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Technical Disclaimer Note */}
      <div className="mb-8 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-neutral-400 text-xs leading-relaxed flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-neutral-200 block mb-1">Notice to Customers & Creators:</strong>
          Data bundle purchases are strictly debited from your personal wallet balance. If there is no money in your wallet,
          you cannot buy data until a verified PalmPay deposit is credited.
        </div>
      </div>

      {/* 4. Purchase History Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Transaction History
          </h2>
          {isAuthenticated && (
            <span className="text-[11px] text-neutral-500">{history.length} request(s)</span>
          )}
        </div>

        {!isAuthenticated ? (
          <div className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800 text-center">
            <p className="text-xs text-neutral-400 mb-3">Log in to view your data purchases and approval statuses.</p>
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
            >
              Log In
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 rounded-xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-500">
            No data requests submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 text-left"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white">{item.packageName}</span>
                    <span className="text-xs font-bold text-amber-400">{item.price}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1 mb-1">
                    <Phone className="w-3 h-3 text-neutral-500" />
                    <span>{item.phoneNumber}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {new Date(item.createdAt).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                  {item.adminNotes && (
                    <div className="text-[10px] text-neutral-400 italic mt-1 bg-neutral-950 px-2 py-0.5 rounded">
                      Admin: {item.adminNotes}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">{getStatusBadge(item.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          CONFIRMATION PURCHASE MODAL
          ======================================================== */}
      {showOrderModal && selectedPackage && (
        <div
          id="confirm-purchase-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowOrderModal(false)}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-left relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowOrderModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">Confirm Data Purchase</h3>
                <p className="text-xs text-neutral-400">
                  {selectedPackage.name} ({selectedPackage.size})
                </p>
              </div>
            </div>

            {/* Wallet Balance Comparison Box */}
            {(() => {
              const packagePrice = getPackageNumericPrice(selectedPackage);
              const isInsufficient = walletBalance < packagePrice;

              return (
                <div className="my-4 space-y-3">
                  {/* Balance Summary Card */}
                  <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Bundle Price:</span>
                      <span className="font-bold text-white text-sm">{selectedPackage.price}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                      <span className="text-neutral-400">Current Wallet Balance:</span>
                      <span className={`font-bold font-mono text-sm ${isInsufficient ? 'text-red-400' : 'text-emerald-400'}`}>
                        ₦{walletBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                      <span className="text-neutral-400">Balance After Deduction:</span>
                      <span className="font-bold font-mono text-neutral-300">
                        {isInsufficient ? (
                          <span className="text-red-400 font-semibold">Insufficient Funds</span>
                        ) : (
                          `₦${(walletBalance - packagePrice).toLocaleString()}`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* INSUFFICIENT FUNDS ALERT CALLOUT */}
                  {isInsufficient ? (
                    <div
                      id="alert-insufficient-funds"
                      className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/40 text-red-200 text-xs space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-red-300 text-sm mb-1">Insufficient Funds</h4>
                          <p className="leading-relaxed text-red-200/90 text-xs">
                            You cannot buy data because there is no sufficient money in your wallet. Your balance is{' '}
                            <strong className="text-white">₦{walletBalance.toLocaleString()}</strong>, but this bundle costs{' '}
                            <strong className="text-white">{selectedPackage.price}</strong>.
                          </p>
                        </div>
                      </div>

                      {/* PalmPay Deposit Guide Box */}
                      <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] space-y-1.5 text-neutral-300">
                        <div className="font-bold text-neutral-100 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Deposit to PalmPay Account:</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Bank:</span>
                          <span className="font-semibold text-white">{PALMPAY_CONFIG.bank}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Account No:</span>
                          <span className="font-mono font-bold text-amber-400">{PALMPAY_CONFIG.accountFormatted}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Account Name:</span>
                          <span className="font-semibold text-white uppercase text-[10px]">{PALMPAY_CONFIG.name}</span>
                        </div>
                      </div>

                      {onOpenWallet && (
                        <button
                          type="button"
                          id="btn-modal-deposit-now"
                          onClick={() => {
                            setShowOrderModal(false);
                            onOpenWallet();
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all active:scale-95"
                        >
                          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                          <span>Deposit to Wallet & Upload Proof</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>₦{packagePrice.toLocaleString()} will be deducted from your wallet upon confirmation.</span>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleConfirmPurchase} className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Mobile Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          id="input-data-phone"
                          type="tel"
                          required
                          disabled={isInsufficient}
                          placeholder="08012345678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Works on all major Nigerian networks (MTN, Airtel, Glo, 9mobile).
                      </p>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowOrderModal(false)}
                        className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>

                      {isInsufficient ? (
                        <button
                          id="btn-confirm-purchase-disabled"
                          type="button"
                          disabled={true}
                          className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 text-neutral-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-neutral-700/50 opacity-60"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Insufficient Funds</span>
                        </button>
                      ) : (
                        <button
                          id="btn-confirm-purchase"
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <span>Processing Payment...</span>
                          ) : (
                            <>
                              <span>Confirm & Pay {selectedPackage.price}</span>
                              <CheckCircle2 className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
