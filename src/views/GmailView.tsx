import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Send,
  Trash2,
  Star,
  RefreshCw,
  Search,
  Plus,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  User as UserIcon,
  LogOut,
  ExternalLink,
  Inbox,
  SendHorizontal,
  Bookmark,
  FileText,
  Eye,
  CornerUpLeft,
} from 'lucide-react';
import {
  connectGoogleGmail,
  getCachedAccessToken,
  disconnectGoogleGmail,
  initGoogleAuth,
} from '../lib/googleAuth.ts';
import {
  gmailApi,
  GmailProfile,
  GmailMessageSummary,
  GmailMessageDetail,
} from '../lib/gmailApi.ts';
import { GmailConfirmModal, ConfirmActionDetails } from '../components/GmailConfirmModal.tsx';

type MailboxFolder = 'INBOX' | 'STARRED' | 'SENT' | 'DRAFT';

export const GmailView: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [isConnecting, setIsConnecting] = useState(false);
  const [profile, setProfile] = useState<GmailProfile | null>(null);

  // Email List & Detail state
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<MailboxFolder>('INBOX');

  // Compose Modal / Form state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // Reply state
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState('');

  // Alerts & Notifications
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Mandatory Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionDetails | null>(null);
  const [pendingExecution, setPendingExecution] = useState<(() => Promise<void>) | null>(null);
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);

  // Monitor auth status
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (_user, token) => {
        setAccessToken(token);
      },
      () => {
        // Token cleared
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    setErrorNotice(null);
    try {
      const res = await connectGoogleGmail();
      setAccessToken(res.accessToken);
      setSuccessNotice(`Connected to Gmail as ${res.user.email}`);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to connect to Google account. Please allow popup access.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleGmail();
    setAccessToken(null);
    setProfile(null);
    setMessages([]);
    setSelectedMessage(null);
    setSuccessNotice('Disconnected from Gmail.');
  };

  // Fetch Mailbox Messages
  const loadMailbox = useCallback(
    async (token: string, folder: MailboxFolder, query: string = '') => {
      setIsLoadingList(true);
      setErrorNotice(null);

      try {
        // Build Gmail search query
        let q = query.trim();
        if (folder === 'INBOX') {
          q = q ? `${q} in:inbox` : 'in:inbox';
        } else if (folder === 'STARRED') {
          q = q ? `${q} is:starred` : 'is:starred';
        } else if (folder === 'SENT') {
          q = q ? `${q} in:sent` : 'in:sent';
        } else if (folder === 'DRAFT') {
          q = q ? `${q} in:draft` : 'in:draft';
        }

        const res = await gmailApi.listMessages(token, { maxResults: 15, q });
        if (res.messages && res.messages.length > 0) {
          const summaries = await gmailApi.fetchBatchSummaries(token, res.messages);
          setMessages(summaries);
        } else {
          setMessages([]);
        }
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('invalid_token')) {
          setAccessToken(null);
          setErrorNotice('Your Gmail session expired. Please sign in again.');
        } else {
          setErrorNotice(err.message || 'Failed to fetch emails.');
        }
      } finally {
        setIsLoadingList(false);
      }
    },
    []
  );

  // Load profile and emails once token is available
  useEffect(() => {
    if (!accessToken) return;

    gmailApi
      .getProfile(accessToken)
      .then((p) => setProfile(p))
      .catch((err) => {
        console.warn('Profile fetch warning:', err);
      });

    loadMailbox(accessToken, activeFolder, searchQuery);
  }, [accessToken, activeFolder, loadMailbox]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    loadMailbox(accessToken, activeFolder, searchQuery);
  };

  // Open Message Detail
  const handleSelectMessage = async (summary: GmailMessageSummary) => {
    if (!accessToken) return;
    setSelectedMessageId(summary.id);
    setIsLoadingDetail(true);
    setIsReplying(false);
    setReplyBody('');

    try {
      const detail = await gmailApi.getMessage(accessToken, summary.id);
      setSelectedMessage(detail);

      // If unread, mark as read
      if (detail.isUnread) {
        await gmailApi.modifyMessage(accessToken, detail.id, [], ['UNREAD']);
        setMessages((prev) =>
          prev.map((m) => (m.id === detail.id ? { ...m, isUnread: false } : m))
        );
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Could not load message details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Star / Unstar
  const handleToggleStar = async (e: React.MouseEvent, msgId: string, currentStarred: boolean) => {
    e.stopPropagation();
    if (!accessToken) return;

    try {
      if (currentStarred) {
        await gmailApi.modifyMessage(accessToken, msgId, [], ['STARRED']);
      } else {
        await gmailApi.modifyMessage(accessToken, msgId, ['STARRED'], []);
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isStarred: !currentStarred } : m))
      );
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage({ ...selectedMessage, isStarred: !currentStarred });
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update star state.');
    }
  };

  // MANDATORY CONFIRMATION: Trash/Delete Email
  const requestTrashEmail = (messageId: string, subject: string, sender: string) => {
    setConfirmAction({
      type: 'trash',
      title: 'Move Email to Trash',
      description: `Are you sure you want to move this message from "${sender}" to your Gmail Trash?`,
      subject,
      confirmLabel: 'Move to Trash',
      isDestructive: true,
    });

    setPendingExecution(() => async () => {
      if (!accessToken) return;
      await gmailApi.trashMessage(accessToken, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      setSuccessNotice('Email moved to Trash.');
    });

    setConfirmModalOpen(true);
  };

  // MANDATORY CONFIRMATION: Send New Email
  const requestSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim()) {
      setErrorNotice('Recipient email address is required.');
      return;
    }
    if (!composeSubject.trim()) {
      setErrorNotice('Subject line cannot be empty.');
      return;
    }

    setConfirmAction({
      type: 'send',
      title: 'Confirm Email Transmission',
      description: 'You are about to send an email through your connected Google Workspace account.',
      recipient: composeTo.trim(),
      subject: composeSubject.trim(),
      snippet: composeBody.slice(0, 100) + (composeBody.length > 100 ? '...' : ''),
      confirmLabel: 'Confirm & Send',
    });

    setPendingExecution(() => async () => {
      if (!accessToken) return;
      await gmailApi.sendEmail(accessToken, {
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        body: composeBody,
      });

      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setIsComposeOpen(false);
      setSuccessNotice(`Email successfully sent to ${composeTo.trim()}`);
      if (activeFolder === 'SENT') {
        loadMailbox(accessToken, 'SENT');
      }
    });

    setConfirmModalOpen(true);
  };

  // MANDATORY CONFIRMATION: Send Reply
  const requestSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyBody.trim()) {
      setErrorNotice('Reply message content cannot be empty.');
      return;
    }

    const replyTo = selectedMessage.from;
    const replySubject = selectedMessage.subject.startsWith('Re:')
      ? selectedMessage.subject
      : `Re: ${selectedMessage.subject}`;

    setConfirmAction({
      type: 'send',
      title: 'Send Reply Email',
      description: `Send reply to ${replyTo} regarding "${selectedMessage.subject}"?`,
      recipient: replyTo,
      subject: replySubject,
      snippet: replyBody.slice(0, 100),
      confirmLabel: 'Send Reply',
    });

    setPendingExecution(() => async () => {
      if (!accessToken || !selectedMessage) return;
      await gmailApi.sendEmail(accessToken, {
        to: replyTo,
        subject: replySubject,
        body: replyBody,
        threadId: selectedMessage.threadId,
      });

      setReplyBody('');
      setIsReplying(false);
      setSuccessNotice(`Reply dispatched to ${replyTo}`);
    });

    setConfirmModalOpen(true);
  };

  // Execute confirmed action
  const handleExecuteConfirmedAction = async () => {
    if (!pendingExecution) return;
    setIsConfirmProcessing(true);
    try {
      await pendingExecution();
      setConfirmModalOpen(false);
      setPendingExecution(null);
    } catch (err: any) {
      setErrorNotice(err.message || 'Operation failed.');
    } finally {
      setIsConfirmProcessing(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-20 px-3 sm:px-6 pt-4 max-w-5xl mx-auto">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
                Gmail Workspace
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-amber-300 border border-neutral-700">
                Google APIs
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              {accessToken && profile
                ? `Connected as ${profile.emailAddress}`
                : 'Manage, read, and compose your emails directly inside Mr Felix'}
            </p>
          </div>
        </div>

        {/* Action button: Connect / Disconnect */}
        <div className="flex items-center gap-2">
          {accessToken ? (
            <button
              id="btn-disconnect-gmail"
              onClick={handleDisconnect}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-red-400 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              id="btn-connect-google-gmail"
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isConnecting ? 'Connecting...' : 'Connect Gmail Account'}</span>
            </button>
          )}

          {accessToken && (
            <button
              id="btn-compose-email"
              onClick={() => setIsComposeOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Compose</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successNotice && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-red-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* NOT CONNECTED STATE */}
      {!accessToken ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mb-4 text-red-400 shadow-xl">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Your Google Workspace</h2>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-md mb-6">
            Authenticate with your Google account to read inbox emails, send responses, and draft messages securely. All authentication tokens are kept safely in memory with permission from the app's users.
          </p>

          <button
            id="btn-google-signin-main"
            type="button"
            onClick={handleConnectGoogle}
            disabled={isConnecting}
            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isConnecting ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        </div>
      ) : (
        /* CONNECTED INTERFACE */
        <div className="space-y-4">
          {/* Search bar & Folders */}
          <div className="p-3 bg-neutral-900 rounded-2xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Folder Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => {
                  setActiveFolder('INBOX');
                  setSelectedMessage(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeFolder === 'INBOX'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Inbox</span>
              </button>

              <button
                onClick={() => {
                  setActiveFolder('STARRED');
                  setSelectedMessage(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeFolder === 'STARRED'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Starred</span>
              </button>

              <button
                onClick={() => {
                  setActiveFolder('SENT');
                  setSelectedMessage(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeFolder === 'SENT'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <SendHorizontal className="w-3.5 h-3.5" />
                <span>Sent</span>
              </button>

              <button
                onClick={() => {
                  setActiveFolder('DRAFT');
                  setSelectedMessage(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeFolder === 'DRAFT'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Drafts</span>
              </button>
            </div>

            {/* Search query form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => loadMailbox(accessToken, activeFolder, searchQuery)}
                disabled={isLoadingList}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors disabled:opacity-50"
                title="Refresh mailbox"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
              </button>
            </form>
          </div>

          {/* MAIN WORKSPACE: Split List or Detail View */}
          {selectedMessage ? (
            /* MESSAGE DETAIL VIEW */
            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <button
                  id="btn-back-to-inbox"
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to {activeFolder}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleToggleStar(e, selectedMessage.id, selectedMessage.isStarred)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      selectedMessage.isStarred
                        ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title={selectedMessage.isStarred ? 'Unstar' : 'Star'}
                  >
                    <Star className="w-4 h-4" fill={selectedMessage.isStarred ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={() =>
                      requestTrashEmail(selectedMessage.id, selectedMessage.subject, selectedMessage.from)
                    }
                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-colors"
                    title="Trash Email"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Header Info */}
              <div>
                <h2 className="text-lg font-bold text-white mb-2">{selectedMessage.subject}</h2>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-400 font-bold text-xs">
                      {selectedMessage.from.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-white font-medium">{selectedMessage.from}</span>
                      {selectedMessage.to && (
                        <div className="text-[11px] text-neutral-500">To: {selectedMessage.to}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-neutral-500">{selectedMessage.date}</span>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 text-xs text-neutral-200 leading-relaxed font-sans min-h-[140px] whitespace-pre-wrap break-words select-text">
                {selectedMessage.bodyText || selectedMessage.snippet}
              </div>

              {/* Quick Reply Form */}
              <div className="pt-3 border-t border-neutral-800">
                {!isReplying ? (
                  <button
                    id="btn-open-reply"
                    onClick={() => setIsReplying(true)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center gap-2 transition-colors"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    <span>Reply to this email</span>
                  </button>
                ) : (
                  <form onSubmit={requestSendReply} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-300">
                        Replying to {selectedMessage.from}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsReplying(false)}
                        className="text-xs text-neutral-500 hover:text-neutral-300"
                      >
                        Cancel
                      </button>
                    </div>

                    <textarea
                      required
                      rows={4}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Type your reply message..."
                      className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        id="btn-submit-reply"
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirm & Send Reply</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* EMAIL LIST VIEW */
            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden divide-y divide-neutral-850">
              {isLoadingList ? (
                <div className="p-12 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span>Loading messages from your Gmail...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                  <p className="font-semibold text-neutral-300">No emails found in {activeFolder}</p>
                  <p className="text-[11px] text-neutral-500">
                    {searchQuery ? 'Try clearing your search query.' : 'Your mailbox folder is empty.'}
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-3.5 sm:p-4 flex items-start gap-3 cursor-pointer hover:bg-neutral-800/60 transition-colors group ${
                      msg.isUnread ? 'bg-neutral-900/90 font-medium' : 'bg-neutral-950/30'
                    }`}
                  >
                    {/* Star toggle */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleStar(e, msg.id, msg.isStarred)}
                      className={`mt-0.5 p-1 rounded hover:bg-neutral-800 transition-colors ${
                        msg.isStarred ? 'text-amber-400' : 'text-neutral-600 hover:text-neutral-400'
                      }`}
                    >
                      <Star className="w-4 h-4" fill={msg.isStarred ? 'currentColor' : 'none'} />
                    </button>

                    {/* Unread indicator */}
                    <div className="mt-1.5">
                      {msg.isUnread ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 block" title="Unread" />
                      ) : (
                        <span className="w-2 h-2 block" />
                      )}
                    </div>

                    {/* Content snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs truncate ${msg.isUnread ? 'text-white font-bold' : 'text-neutral-300'}`}>
                          {msg.from}
                        </span>
                        <span className="text-[10px] text-neutral-500 shrink-0">{msg.date.split(',')[0]}</span>
                      </div>

                      <div className={`text-xs truncate ${msg.isUnread ? 'text-neutral-100 font-semibold' : 'text-neutral-300'}`}>
                        {msg.subject}
                      </div>

                      <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{msg.snippet}</p>
                    </div>

                    {/* Quick action: Trash button */}
                    <div className="hidden group-hover:flex items-center gap-1 pl-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestTrashEmail(msg.id, msg.subject, msg.from);
                        }}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                        title="Trash this email"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* COMPOSE EMAIL MODAL */}
      {isComposeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsComposeOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">New Message</h3>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={requestSendEmail} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">To (Recipient)</label>
                <input
                  id="input-compose-to"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Subject</label>
                <input
                  id="input-compose-subject"
                  type="text"
                  required
                  placeholder="Subject of your message..."
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Message Body</label>
                <textarea
                  id="input-compose-body"
                  required
                  rows={6}
                  placeholder="Write your email here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-neutral-500">
                  Transmitted with permission from your connected Gmail.
                </span>
                <button
                  id="btn-confirm-send-email"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION DIALOG FOR ALL DESTRUCTIVE / MUTATING OPERATIONS */}
      <GmailConfirmModal
        isOpen={confirmModalOpen}
        actionDetails={confirmAction}
        onConfirm={handleExecuteConfirmedAction}
        onCancel={() => {
          setConfirmModalOpen(false);
          setPendingExecution(null);
        }}
        isProcessing={isConfirmProcessing}
      />
    </div>
  );
};
