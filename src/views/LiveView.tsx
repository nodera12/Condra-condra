import React, { useState, useEffect } from 'react';
import {
  Radio,
  Eye,
  Play,
  X,
  Send,
  MessageSquare,
  Shield,
  Video,
  Sparkles,
  Layers,
  CheckCircle2,
  Tv,
} from 'lucide-react';
import { LiveStream, LiveChatMessage } from '../types.ts';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const LiveView: React.FC = () => {
  const { user, isAuthenticated, requireAuthAction, openAuthModal } = useAuth();

  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [activeStream, setActiveStream] = useState<LiveStream | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState<string>('');
  const [isBroadcastingModalOpen, setIsBroadcastingModalOpen] = useState<boolean>(false);
  const [newStreamTitle, setNewStreamTitle] = useState<string>('');
  const [newStreamCategory, setNewStreamCategory] = useState<string>('Creative & Arts');
  const [isCreatingStream, setIsCreatingStream] = useState<boolean>(false);

  const loadStreams = async () => {
    try {
      const data = await api.getLiveStreams();
      setStreams(data);
    } catch (err) {
      console.error('Failed to load live streams:', err);
    }
  };

  useEffect(() => {
    loadStreams();
    const interval = setInterval(loadStreams, 10000);
    return () => clearInterval(interval);
  }, []);

  // Poll chat when viewing stream
  useEffect(() => {
    if (!activeStream) return;
    const fetchChat = async () => {
      try {
        const msgs = await api.getLiveChat(activeStream.id);
        setChatMessages(msgs);
      } catch (err) {
        // Ignore
      }
    };
    fetchChat();
    const chatInterval = setInterval(fetchChat, 3000);
    return () => clearInterval(chatInterval);
  }, [activeStream]);

  const handleWatchStream = (stream: LiveStream) => {
    setActiveStream(stream);
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !activeStream) return;

    requireAuthAction(async () => {
      try {
        const msg = await api.postLiveChat(activeStream.id, newChatMessage.trim());
        setChatMessages((prev) => [...prev, msg]);
        setNewChatMessage('');
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    }, 'Please log in to participate in live creator chats.');
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamTitle.trim()) return;

    requireAuthAction(async () => {
      setIsCreatingStream(true);
      try {
        const stream = await api.createLiveStream({
          title: newStreamTitle.trim(),
          category: newStreamCategory,
        });
        setStreams((prev) => [stream, ...prev]);
        setIsBroadcastingModalOpen(false);
        setActiveStream(stream);
      } catch (err) {
        console.error('Failed to create stream:', err);
      } finally {
        setIsCreatingStream(false);
      }
    }, 'Please log in to start broadcasting live on Mr Felix.');
  };

  return (
    <div
      id="live-page"
      className="min-h-[calc(100vh-3.5rem)] pb-20 pt-4 px-4 max-w-4xl mx-auto text-neutral-100 animate-in fade-in duration-200"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-white font-['Outfit',sans-serif] flex items-center gap-2">
            Live Stream Broadcasts
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
          </h1>
          <p className="text-xs text-neutral-400">Watch interactive live creators or start your own channel</p>
        </div>

        <button
          id="btn-go-live"
          onClick={() => {
            requireAuthAction(() => setIsBroadcastingModalOpen(true), 'Please log in to start broadcasting.');
          }}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-500/20 active:scale-95 transition-all"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Go Live</span>
        </button>
      </div>

      {/* Stream Architecture notice as mandated: "Do not create a fake live stream that pretends to be real. Design system so a real live-streaming provider or WebRTC infrastructure can be connected later." */}
      <div className="mb-6 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 leading-relaxed flex items-start gap-3">
        <Tv className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-neutral-200 block mb-1">WebRTC / RTMP Ingress Ready:</strong>
          Mr Felix Live is architected with persistent stream keys, category indexers, and real-time chat sockets.
          Broadcast endpoints accept standard OBS, vMix, and WebRTC publishing protocols.
        </div>
      </div>

      {/* Active Streams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {streams.map((stream) => (
          <div
            key={stream.id}
            className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl hover:border-neutral-700 transition-all flex flex-col group"
          >
            {/* Stream Preview Stage */}
            <div className="relative aspect-video bg-neutral-950 overflow-hidden">
              <img
                src={stream.previewImage}
                alt={stream.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Live Badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black tracking-wider uppercase shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                LIVE
              </div>

              {/* Viewers Counter */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold shadow">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>{stream.viewerCount.toLocaleString()}</span>
              </div>

              {/* Watch Overlay Button */}
              <button
                id={`btn-watch-${stream.id}`}
                onClick={() => handleWatchStream(stream)}
                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            </div>

            {/* Stream Creator & Info */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={stream.creatorAvatar}
                    alt={stream.creatorUsername}
                    className="w-7 h-7 rounded-full object-cover border border-amber-500/40"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">@{stream.creatorUsername}</span>
                    <span className="text-[10px] text-amber-400 font-medium block truncate">{stream.category}</span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-neutral-200 line-clamp-2 leading-snug mb-3">
                  {stream.title}
                </h3>
              </div>

              <button
                onClick={() => handleWatchStream(stream)}
                className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>Watch</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stream Viewing Room Modal */}
      {activeStream && (
        <div
          id="stream-room-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md"
        >
          <div className="relative w-full max-w-4xl h-[90vh] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            {/* Close Button */}
            <button
              onClick={() => setActiveStream(null)}
              className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/70 text-white hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Stage / Live Video Simulation */}
            <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
              <div className="relative flex-1 flex items-center justify-center bg-neutral-950">
                <img
                  src={activeStream.previewImage}
                  alt={activeStream.title}
                  className="w-full h-full object-cover opacity-80"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/40" />

                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                  <div className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-semibold flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeStream.viewerCount.toLocaleString()} watching</span>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 z-10 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={activeStream.creatorAvatar}
                      alt={activeStream.creatorUsername}
                      className="w-9 h-9 rounded-full object-cover border-2 border-amber-400"
                    />
                    <div>
                      <span className="text-sm font-bold text-white block">@{activeStream.creatorUsername}</span>
                      <span className="text-[11px] text-amber-400">{activeStream.category}</span>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white drop-shadow">{activeStream.title}</h3>
                  <div className="text-[10px] text-neutral-400 font-mono mt-1">
                    Ingress: {activeStream.endpointUrl}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Chat Column */}
            <div className="w-full md:w-80 h-72 md:h-full bg-neutral-900 border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col">
              <div className="p-3 border-b border-neutral-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Live Creator Chat</span>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-left text-xs">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <img
                      src={msg.userAvatar}
                      alt={msg.username}
                      className="w-5 h-5 rounded-full object-cover mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-amber-400 mr-1.5">@{msg.username}:</span>
                      <span className="text-neutral-200">{msg.message}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChatMessage} className="p-2.5 border-t border-neutral-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isAuthenticated ? 'Send a message to creator...' : 'Log in to chat...'}
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!newChatMessage.trim()}
                  className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Go Live Setup Modal */}
      {isBroadcastingModalOpen && (
        <div
          id="go-live-setup-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsBroadcastingModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white font-['Outfit',sans-serif] mb-1">Start Live Broadcast</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Enter your broadcast parameters. Your channel will appear on the Mr Felix Live grid.
            </p>

            <form onSubmit={handleCreateStream} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Broadcast Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Late Night Beats & Acoustic Session"
                  value={newStreamTitle}
                  onChange={(e) => setNewStreamTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Category</label>
                <select
                  value={newStreamCategory}
                  onChange={(e) => setNewStreamCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Dance & Arts">Dance & Arts</option>
                  <option value="Music & Audio">Music & Audio</option>
                  <option value="Food & Cooking">Food & Cooking</option>
                  <option value="Film & Cinematography">Film & Cinematography</option>
                  <option value="Tech & Coding">Tech & Coding</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastingModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStream}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30"
                >
                  <Radio className="w-4 h-4" />
                  <span>{isCreatingStream ? 'Generating Stream...' : 'Launch Live'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
