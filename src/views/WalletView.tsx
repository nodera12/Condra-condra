import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  UploadCloud,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
  User as UserIcon,
  CreditCard,
  ChevronRight,
  LogIn,
  Zap,
  Video,
  Gift,
  TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { WalletData, WalletTransaction } from '../types.ts';

interface WalletViewProps {
  onBack?: () => void;
  onOpenData?: () => void;
}

const COMMON_BANKS = [
  'PalmPay',
  'OPay',
  'Kuda Bank',
  'Moniepoint',
  'GTBank (Guaranty Trust)',
  'Access Bank',
  'Zenith Bank',
  'First Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Stanbic IBTC Bank',
  'Fidelity Bank',
  'Wema Bank / ALAT',
];

export const WalletView: React.FC<WalletViewProps> = ({ onBack, onOpenData }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'purchases' | 'pending'>('all');

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Copy state
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<string>('2000');
  const [senderName, setSenderName] = useState<string>('');
  const [depositNote, setDepositNote] = useState<string>('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [destBank, setDestBank] = useState<string>('PalmPay');
  const [destAccountNumber, setDestAccountNumber] = useState<string>('');
  const [destAccountName, setDestAccountName] = useState<string>('');
  const [withdrawNote, setWithdrawNote] = useState<string>('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const fetchWallet = async (isManualRefresh = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getWallet();
      setWalletData(data);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [isAuthenticated]);

  const handleCopyAccountNumber = (acc: string) => {
    navigator.clipboard.writeText(acc.replace(/\s+/g, ''));
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  // Handle Screenshot Upload (File reader)
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setDepositError('Please upload an image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setDepositError('Image file is too large. Max size is 8MB.');
      return;
    }

    setDepositError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setScreenshotPreview(result);
      setScreenshotBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccessMsg(null);

    const amountNum = parseFloat(depositAmount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      setDepositError('Please enter a valid deposit amount.');
      return;
    }

    if (!senderName.trim()) {
      setDepositError('Please enter the Sender Name used during the bank transfer.');
      return;
    }

    if (!screenshotBase64) {
      setDepositError('Please upload the transfer screenshot / receipt.');
      return;
    }

    setSubmittingDeposit(true);
    try {
      // 1. Upload screenshot to backend
      const uploadRes = await api.uploadScreenshot(screenshotBase64);

      // 2. Submit deposit record
      const res = await api.submitDeposit({
        amount: amountNum,
        senderName: senderName.trim(),
        screenshotUrl: uploadRes.url,
        note: depositNote.trim() || undefined,
      });

      setDepositSuccessMsg(res.message || 'Deposit submitted successfully!');
      // Reset form
      setSenderName('');
      setDepositNote('');
      setScreenshotPreview(null);
      setScreenshotBase64(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh transactions
      await fetchWallet(true);

      setTimeout(() => {
        setShowDepositModal(false);
        setDepositSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setDepositError(err.message || 'Failed to submit deposit. Please try again.');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccessMsg(null);

    const amountNum = parseFloat(withdrawAmount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.');
      return;
    }

    const currentBalance = walletData?.balance || 0;
    if (amountNum > currentBalance) {
      setWithdrawError(`Insufficient funds. Your available balance is ₦${currentBalance.toLocaleString()}.`);
      return;
    }

    if (!destBank.trim()) {
      setWithdrawError('Please specify the destination bank.');
      return;
    }

    if (!destAccountNumber.trim() || destAccountNumber.trim().length < 8) {
      setWithdrawError('Please enter a valid 10-digit account number.');
      return;
    }

    if (!destAccountName.trim()) {
      setWithdrawError('Please enter the destination account holder name.');
      return;
    }

    setSubmittingWithdrawal(true);
    try {
      const res = await api.submitWithdrawal({
        amount: amountNum,
        destinationBank: destBank.trim(),
        destinationAccountNumber: destAccountNumber.trim(),
        destinationAccountName: destAccountName.trim(),
        note: withdrawNote.trim() || undefined,
      });

      setWithdrawSuccessMsg(res.message || 'Withdrawal request submitted!');
      setWithdrawAmount('');
      setDestAccountNumber('');
      setDestAccountName('');
      setWithdrawNote('');

      await fetchWallet(true);

      setTimeout(() => {
        setShowWithdrawalModal(false);
        setWithdrawSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setWithdrawError(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  // Filter transactions
  const transactions = walletData?.transactions || [];
  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'deposit') return tx.type === 'deposit';
    if (activeFilter === 'withdrawal') return tx.type === 'withdrawal';
    if (activeFilter === 'purchases') return tx.type === 'purchase';
    if (activeFilter === 'pending') return tx.status === 'PENDING';
    return true;
  });

  const depositBank = walletData?.depositBankDetails || {
    bank: 'PalmPay',
    accountNumber: '907  658  6127',
    name: 'ALBERT TERKIMBI UKULA',
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 pb-24">
        <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-400">
            <Wallet className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-100 mb-2">My Wallet</h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            Log in or create an account to manage your balance, deposit funds via PalmPay, withdraw earnings, and purchase mobile data seamlessly.
          </p>
          <button
            id="btn-wallet-login"
            onClick={() => openAuthModal('login')}
            className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Access Wallet</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-28">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3.5 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-100 leading-tight">My Wallet</h1>
            <p className="text-[11px] text-neutral-400">Instant Nigerian Naira Balance & Transfers</p>
          </div>
        </div>

        <button
          id="btn-refresh-wallet"
          onClick={() => fetchWallet(true)}
          disabled={refreshing}
          className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors"
          title="Refresh Balance"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {/* 1. LUXURY BALANCE CARD */}
        <div
          id="wallet-balance-card"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 p-6 shadow-xl"
        >
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-600/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Available Balance
                </span>
                <span className="text-xs text-neutral-400">NGN (₦)</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                @{user?.username || 'user'}
              </span>
            </div>

            <div className="my-3">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-baseline gap-1">
                <span className="text-amber-400 font-semibold text-2xl sm:text-3xl">₦</span>
                {loading ? (
                  <span className="animate-pulse text-neutral-500">...</span>
                ) : (
                  (walletData?.balance || 0).toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                )}
              </h2>
            </div>

            <p className="text-xs text-neutral-400 mb-6">
              Spend your wallet balance on fast Daily Data bundles or withdraw directly to your Nigerian bank.
            </p>

            {/* Creator Earnings Breakdown */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800/80 mb-5">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-neutral-400 mb-0.5">
                  <Video className="w-3 h-3 text-purple-400" />
                  <span>Video Views</span>
                </div>
                <span className="text-xs sm:text-sm font-black text-purple-300 font-mono">
                  ₦{(walletData?.earningsFromVideos || 0).toLocaleString()}
                </span>
              </div>

              <div className="text-center border-x border-neutral-800/80">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-neutral-400 mb-0.5">
                  <Gift className="w-3 h-3 text-amber-400" />
                  <span>Gifts Received</span>
                </div>
                <span className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                  ₦{(walletData?.earningsFromGifts || 0).toLocaleString()}
                </span>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-neutral-400 mb-0.5">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>Total Earned</span>
                </div>
                <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                  ₦{((walletData?.earningsFromVideos || 0) + (walletData?.earningsFromGifts || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons: DEPOSIT & WITHDRAWAL */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-wallet-deposit"
                onClick={() => {
                  setShowDepositModal(true);
                  setDepositError(null);
                  setDepositSuccessMsg(null);
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-sm transition-all shadow-lg active:scale-95"
              >
                <div className="w-6 h-6 rounded-full bg-neutral-950/20 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span>Deposit Funds</span>
              </button>

              <button
                id="btn-wallet-withdrawal"
                onClick={() => {
                  setShowWithdrawalModal(true);
                  setWithdrawError(null);
                  setWithdrawSuccessMsg(null);
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-100 font-bold text-sm transition-all shadow active:scale-95 hover:border-neutral-600"
              >
                <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-300">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span>Withdrawal</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. OFFICIAL PALMPAY DEPOSIT DETAILS CARD */}
        <div
          id="card-palmpay-deposit-info"
          className="rounded-3xl bg-neutral-900/80 border border-neutral-800 p-5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-neutral-200">Official PalmPay Deposit Account</h3>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Verified
            </span>
          </div>

          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
            Make your bank transfer directly to the PalmPay details below. Once sent, tap <strong className="text-amber-300">Deposit Funds</strong> to upload your proof and get credited.
          </p>

          <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 space-y-3">
            {/* Bank */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Bank</span>
              <span className="font-bold text-neutral-100 text-sm">{depositBank.bank}</span>
            </div>

            {/* Account Number */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800/60">
              <div>
                <span className="text-neutral-400 block text-[11px]">Account Number</span>
                <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                  {depositBank.accountNumber}
                </span>
              </div>
              <button
                id="btn-copy-account-number"
                onClick={() => handleCopyAccountNumber(depositBank.accountNumber)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  copiedAccount
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                }`}
              >
                {copiedAccount ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Name */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800/60">
              <span className="text-neutral-400">Account Name</span>
              <span className="font-bold text-neutral-100 uppercase text-xs">{depositBank.name}</span>
            </div>
          </div>
        </div>

        {/* 3. QUICK DATA PURCHASE SHORTCUT */}
        {onOpenData && (
          <div
            onClick={onOpenData}
            className="cursor-pointer rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 p-3.5 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-200 group-hover:text-amber-400 transition-colors">
                  Need Mobile Data?
                </h4>
                <p className="text-[11px] text-neutral-400">Buy 1GB Daily Data package at fast rate</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-400 transition-colors" />
          </div>
        )}

        {/* 4. TRANSACTION HISTORY SECTION */}
        <div id="section-wallet-transactions" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-200">Transaction History</h3>
            <span className="text-xs text-neutral-400">{filteredTransactions.length} records</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-900/80 border border-neutral-800 rounded-xl">
            {(['all', 'deposit', 'withdrawal', 'purchases', 'pending'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                  activeFilter === filter
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-neutral-900/60 animate-pulse rounded-2xl border border-neutral-800" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10 bg-neutral-900/40 rounded-3xl border border-neutral-800/80 p-6">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800/60 border border-neutral-700 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-300">No transactions found</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                {activeFilter === 'pending'
                  ? 'You have no pending deposit or withdrawal requests.'
                  : activeFilter === 'purchases'
                  ? 'You have not made any mobile data purchases yet.'
                  : 'Start by making a PalmPay deposit or purchasing data bundle.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTransactions.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                const isPurchase = tx.type === 'purchase';

                return (
                  <div
                    key={tx.id}
                    className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isDeposit
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isPurchase
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {isDeposit ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : isPurchase ? (
                            <Zap className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-200 capitalize">
                              {isPurchase ? 'Data Purchase' : tx.type}
                            </span>
                            {/* Status Badge */}
                            {tx.status === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                Approved
                              </span>
                            )}
                            {tx.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3 animate-pulse" />
                                Pending Admin
                              </span>
                            )}
                            {tx.status === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                                <XCircle className="w-3 h-3" />
                                Rejected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {new Date(tx.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-black ${
                            isDeposit ? 'text-emerald-400' : 'text-neutral-100'
                          }`}
                        >
                          {isDeposit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Metadata details */}
                    <div className="pt-2 border-t border-neutral-800/60 text-xs text-neutral-400 flex flex-wrap items-center justify-between gap-2">
                      {isDeposit ? (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3 h-3 text-neutral-400" />
                          <span>Sender: <strong className="text-neutral-200">{tx.senderName || 'Not specified'}</strong></span>
                        </div>
                      ) : isPurchase ? (
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Item: <strong className="text-neutral-200">{tx.note || 'Data Bundle Purchase'}</strong></span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-neutral-400" />
                          <span>To: <strong className="text-neutral-200">{tx.destinationBank} ({tx.destinationAccountNumber})</strong></span>
                        </div>
                      )}

                      {/* Proof Button */}
                      {tx.screenshotUrl && (
                        <button
                          onClick={() => setSelectedProofUrl(tx.screenshotUrl || null)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/20 transition-all"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>View Proof Screenshot</span>
                        </button>
                      )}
                    </div>

                    {tx.adminNotes && (
                      <div className="mt-1 p-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-300">
                        <span className="text-neutral-400">Admin Note:</span> {tx.adminNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          DEPOSIT MODAL / DASHBOARD
          ======================================================== */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative my-6">
            <button
              onClick={() => setShowDepositModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-100">Deposit to Wallet</h2>
                <p className="text-xs text-neutral-400">Transfer funds to the PalmPay account & upload proof</p>
              </div>
            </div>

            {/* PalmPay Bank Details Card inside Modal */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Bank:</span>
                <span className="font-bold text-emerald-400">{depositBank.bank}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Account Number:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {depositBank.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAccountNumber(depositBank.accountNumber)}
                    className="p-1 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                    title="Copy"
                  >
                    {copiedAccount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Account Name:</span>
                <span className="font-semibold text-neutral-200">{depositBank.name}</span>
              </div>
            </div>

            {depositSuccessMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{depositSuccessMsg}</span>
              </div>
            )}

            {depositError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{depositError}</span>
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              {/* 1. Deposit Amount */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Deposit Amount (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₦</span>
                  <input
                    id="input-deposit-amount"
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="2000"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['1000', '2000', '5000', '10000', '20000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDepositAmount(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        depositAmount === preset
                          ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      ₦{parseInt(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Sender Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Sender Name <span className="text-amber-400">*</span>
                </label>
                <input
                  id="input-deposit-sender-name"
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. ALBERT TERKIMBI or John Doe (Full bank account name)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Enter the exact account name registered on the bank/PalmPay account you transferred from.
                </p>
              </div>

              {/* 3. Screenshot Upload */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Payment Screenshot Proof <span className="text-amber-400">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  id="input-deposit-screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />

                {screenshotPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-950 p-2">
                    <img
                      src={screenshotPreview}
                      alt="Deposit Proof Preview"
                      className="w-full max-h-48 object-contain rounded-xl bg-neutral-900"
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded-lg bg-neutral-900/80 text-neutral-200 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshotPreview(null);
                          setScreenshotBase64(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 rounded-lg bg-red-900/80 text-red-200 hover:bg-red-800 border border-red-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-neutral-800 hover:border-amber-500/50 rounded-2xl p-6 text-center bg-neutral-950/60 hover:bg-neutral-950 transition-all group"
                  >
                    <UploadCloud className="w-8 h-8 text-neutral-500 group-hover:text-amber-400 mx-auto mb-2 transition-colors" />
                    <p className="text-xs font-semibold text-neutral-300">
                      Click to upload transfer screenshot
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      PNG, JPG, or WEBP up to 8MB
                    </p>
                  </div>
                )}
              </div>

              {/* 4. Optional Note */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Optional Note / Reference
                </label>
                <input
                  id="input-deposit-note"
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="e.g. Transfer session ID or remark"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                id="btn-submit-deposit-form"
                type="submit"
                disabled={submittingDeposit}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingDeposit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Uploading & Submitting...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Deposit Request</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          WITHDRAWAL MODAL / DASHBOARD
          ======================================================== */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative my-6">
            <button
              onClick={() => setShowWithdrawalModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-100">Withdraw Funds</h2>
                <p className="text-xs text-neutral-400">Withdraw your wallet balance to any Nigerian bank</p>
              </div>
            </div>

            {/* Current Balance Banner */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-neutral-400 block">Available Balance</span>
                <span className="text-base font-bold text-white">
                  ₦{(walletData?.balance || 0).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawAmount(String(walletData?.balance || 0))}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
              >
                Use Max
              </button>
            </div>

            {withdrawSuccessMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{withdrawSuccessMsg}</span>
              </div>
            )}

            {withdrawError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              {/* 1. Amount */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Amount to Withdraw (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₦</span>
                  <input
                    id="input-withdraw-amount"
                    type="number"
                    min="100"
                    step="100"
                    max={walletData?.balance || 0}
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* 2. Destination Bank */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Destination Bank
                </label>
                <select
                  id="select-dest-bank"
                  value={destBank}
                  onChange={(e) => setDestBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-amber-400"
                >
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b} className="bg-neutral-900 text-neutral-100">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Account Number */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Account Number (10 digits)
                </label>
                <input
                  id="input-dest-account-number"
                  type="text"
                  maxLength={10}
                  required
                  value={destAccountNumber}
                  onChange={(e) => setDestAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 0123456789"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 font-mono text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 4. Account Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Account Holder Full Name
                </label>
                <input
                  id="input-dest-account-name"
                  type="text"
                  required
                  value={destAccountName}
                  onChange={(e) => setDestAccountName(e.target.value)}
                  placeholder="e.g. John Doe (as on bank record)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 5. Note */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Optional Note
                </label>
                <input
                  id="input-withdraw-note"
                  type="text"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder="e.g. Personal savings withdrawal"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                id="btn-submit-withdrawal-form"
                type="submit"
                disabled={submittingWithdrawal || (walletData?.balance || 0) <= 0}
                className="w-full py-3.5 px-4 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingWithdrawal ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Request Withdrawal</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          FULL RESOLUTION PROOF SCREENSHOT MODAL
          ======================================================== */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-xl w-full bg-neutral-900 rounded-3xl border border-neutral-800 p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <span className="text-xs font-bold text-neutral-200">Transfer Receipt Proof</span>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto flex items-center justify-center bg-neutral-950 rounded-2xl p-2">
              <img
                src={selectedProofUrl}
                alt="Payment Proof"
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
