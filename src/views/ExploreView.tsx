import React, { useState, useEffect } from 'react';
import {
  Search,
  Film,
  Keyboard,
  Clock,
  Play,
  X,
  Sparkles,
  Compass,
  ArrowRight,
  Tv,
  Calendar,
  Layers,
  Mail,
  HardDrive,
} from 'lucide-react';
import { SeasonalFilm } from '../types.ts';
import { api } from '../lib/api.ts';
import { TypingTestView } from './TypingTestView.tsx';
import { StorageExplorer } from '../components/StorageExplorer.tsx';

export const ExploreView: React.FC = () => {
  const [films, setFilms] = useState<SeasonalFilm[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilmTrailer, setActiveFilmTrailer] = useState<SeasonalFilm | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'explore' | 'typing-test' | 'storage'>('explore');

  useEffect(() => {
    api.getSeasonalFilms().then(setFilms).catch(console.error);
  }, []);

  const seasons = ['All', 'Autumn', 'Winter', 'Spring', 'Summer'];

  const getFilmSeason = (film: SeasonalFilm): string => {
    if (film?.season) return film.season;
    const cat = (film?.category || '').toUpperCase();
    if (cat.includes('AUTUMN')) return 'Autumn';
    if (cat.includes('WINTER')) return 'Winter';
    if (cat.includes('SPRING')) return 'Spring';
    if (cat.includes('SUMMER')) return 'Summer';
    return 'All';
  };

  const filteredFilms = films.filter((film) => {
    if (!film) return false;
    const filmSeason = getFilmSeason(film);
    const matchesSeason =
      selectedSeason === 'All' ||
      filmSeason.toLowerCase() === (selectedSeason || '').toLowerCase();

    const query = searchQuery?.toLowerCase().trim() || '';
    if (!query) return matchesSeason;

    const matchesSearch =
      (film.title || '').toLowerCase().includes(query) ||
      (film.synopsis || '').toLowerCase().includes(query) ||
      (film.director || '').toLowerCase().includes(query) ||
      (film.category || '').toLowerCase().includes(query);

    return matchesSeason && matchesSearch;
  });

  if (activeSubTab === 'typing-test') {
    return (
      <div className="animate-in fade-in">
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <button
            onClick={() => setActiveSubTab('explore')}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold mb-2"
          >
            ← Back to Explore & Seasonal Films
          </button>
        </div>
        <TypingTestView onBack={() => setActiveSubTab('explore')} />
      </div>
    );
  }

  if (activeSubTab === 'storage') {
    return (
      <div className="animate-in fade-in max-w-4xl mx-auto px-4 pt-4 pb-20">
        <StorageExplorer onBack={() => setActiveSubTab('explore')} />
      </div>
    );
  }

  return (
    <div
      id="explore-page"
      className="min-h-[calc(100vh-3.5rem)] pb-20 pt-4 px-4 max-w-4xl mx-auto text-neutral-100 animate-in fade-in duration-200"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-white font-['Outfit',sans-serif] flex items-center gap-2">
            Explore & Discover
            <Compass className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-neutral-400">Discover seasonal films, creator spotlights, and typing challenges</p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          id="input-explore-search"
          type="text"
          placeholder="Search seasonal films, directors, themes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
        />
      </div>

      {/* FEATURE 1: STORAGE ICON / SECTION IN EXPLORER */}
      <div
        id="storage-explorer-feature-card"
        onClick={() => setActiveSubTab('storage')}
        className="mb-5 p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-sky-950/40 border-2 border-sky-500/30 hover:border-sky-500/60 cursor-pointer shadow-xl transition-all group relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-110 transition-transform">
              <HardDrive className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500 text-white">
                  Explorer Storage
                </span>
                <span className="text-[11px] text-neutral-400">Videos • Photos • Audio • Links • Notes</span>
              </div>
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif] group-hover:text-sky-300 transition-colors">
                Storage Drive & Vault
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5 max-w-md">
                Permanently save and manage your multimedia files, links, and notes with Public & Private visibility controls.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-sky-400 group-hover:translate-x-1 transition-transform">
            <span>Open Storage</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* HERO FEATURE LAUNCHER: Typing Speed Test Feature */}
      <div
        id="typing-test-feature-card"
        onClick={() => setActiveSubTab('typing-test')}
        className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/40 border-2 border-amber-500/30 hover:border-amber-500/60 cursor-pointer shadow-xl transition-all group relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
              <Keyboard className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-neutral-950">
                  Featured Challenge
                </span>
                <span className="text-[11px] text-neutral-400">15s to 5m tests</span>
              </div>
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif] group-hover:text-amber-300 transition-colors">
                Typing Speed Test
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5 max-w-md">
                Measure your typing velocity, accuracy percentage, and words per minute with live countdown timer.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
            <span>Launch Test</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* GMAIL WORKSPACE FEATURE LAUNCHER */}
      <div
        id="gmail-feature-card"
        onClick={() => {
          window.location.hash = 'gmail';
        }}
        className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-rose-950/40 border-2 border-rose-500/30 hover:border-rose-500/60 cursor-pointer shadow-xl transition-all group relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-rose-500/10 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                  Google Workspace
                </span>
                <span className="text-[11px] text-neutral-400">Gmail Integration</span>
              </div>
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif] group-hover:text-rose-300 transition-colors">
                Gmail Workspace
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5 max-w-md">
                Read emails, compose, send replies, and manage your inbox with connected Google authentication.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-rose-400 group-hover:translate-x-1 transition-transform">
            <span>Open Gmail</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* SEASONAL FILMS SECTION */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit',sans-serif]">Seasonal Films</h2>
              <p className="text-[11px] text-neutral-400">Curated cinematic short films capturing the mood of each season</p>
            </div>
          </div>

          {/* Season Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            {seasons.map((season) => (
              <button
                key={season}
                onClick={() => setSelectedSeason(season)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSeason === season
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {season}
              </button>
            ))}
          </div>
        </div>

        {/* Film Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredFilms.map((film) => (
            <div
              key={film.id}
              className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-lg hover:border-neutral-700 transition-all flex flex-col group"
            >
              {/* Poster & Play Trailer trigger */}
              <div className="relative aspect-video bg-neutral-950 overflow-hidden">
                <img
                  src={film.thumbnailUrl || film.posterUrl || film.poster}
                  alt={film.title || 'Film'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/30" />

                {/* Season Tag */}
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-neutral-900/80 backdrop-blur-sm border border-white/10 text-amber-300">
                  {getFilmSeason(film)} Cinema
                </span>

                {/* Duration */}
                {film.duration && (
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-black/70 text-white flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {film.duration}
                  </span>
                )}

                {/* Trailer button */}
                <button
                  onClick={() => setActiveFilmTrailer(film)}
                  className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-xl"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>
              </div>

              {/* Information */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Directed by {film.director || 'Independent Filmmaker'}</span>
                    <span>{film.year || '2025'}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{film.title}</h3>
                  <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed mb-3">
                    {film.synopsis}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-[11px]">
                  <span className="text-amber-400 font-medium">{film.category}</span>
                  <button
                    onClick={() => setActiveFilmTrailer(film)}
                    className="text-xs font-bold text-white hover:text-amber-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Watch Preview</span>
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Film Trailer Modal */}
      {activeFilmTrailer && (
        <div
          id="film-trailer-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setActiveFilmTrailer(null)}
        >
          <div
            className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black">
              <video
                src={activeFilmTrailer.trailerUrl}
                poster={activeFilmTrailer.thumbnailUrl || activeFilmTrailer.posterUrl || activeFilmTrailer.poster}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setActiveFilmTrailer(null)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/70 text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeFilmTrailer.season} Season
                </span>
                <span className="text-xs text-neutral-400">Directed by {activeFilmTrailer.director} ({activeFilmTrailer.year})</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{activeFilmTrailer.title}</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">{activeFilmTrailer.synopsis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
