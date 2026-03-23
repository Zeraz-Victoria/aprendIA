// Game Theme System — Free Fire inspired aesthetic presets
export type ThemeKey = 'fuego' | 'hielo' | 'selva' | 'neon' | 'clasico';

export interface GameTheme {
    key: ThemeKey;
    label: string;
    emoji: string;
    // Map background
    mapBg: string;           // main bg gradient
    mapCardBg: string;       // map container bg
    mapBorder: string;       // map border color
    texture: string;         // css background pattern url
    // Nodes
    nodeActive: string;      // active node gradient
    nodeActiveGlow: string;  // glow shadow
    nodeLocked: string;      // locked bg
    nodeCompleted: string;   // completed bg
    // Path
    pathBase: string;        // base path color
    pathProgress: string;    // progress path color
    pathGlow: string;        // progress glow
    // HUD
    hudBg: string;           // HUD bar background
    hudAccent: string;       // accent color for HUD elements
    hudTextPrimary: string;
    hudTextSecondary: string;
    // Labels / Badges
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    // Lobby
    lobbyBg: string;
    lobbyGlow1: string;
    lobbyGlow2: string;
    lobbyTitle: string;      // gradient for title text
    lobbyCardHover: string;
    // Banner
    bannerBg: string;
    bannerBorder: string;
    bannerAccent: string;
}

export const THEMES: Record<ThemeKey, GameTheme> = {
    fuego: {
        key: 'fuego',
        label: 'Fuego',
        emoji: '🔥',
        mapBg: 'bg-gradient-to-b from-gray-950 via-red-950 to-orange-950',
        mapCardBg: 'bg-gray-900/90',
        mapBorder: 'border-orange-800/50',
        texture: "https://www.transparenttextures.com/patterns/dark-mosaic.png",
        nodeActive: 'bg-gradient-to-br from-orange-500 to-red-600',
        nodeActiveGlow: '0 0 25px rgba(249,115,22,0.6), 0 0 50px rgba(239,68,68,0.3)',
        nodeLocked: 'bg-gray-800 border-gray-700',
        nodeCompleted: 'bg-gradient-to-br from-amber-500 to-orange-600',
        pathBase: '#7f1d1d',
        pathProgress: '#f97316',
        pathGlow: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]',
        hudBg: 'bg-gray-950/95 border-orange-900/50',
        hudAccent: 'text-orange-400',
        hudTextPrimary: 'text-orange-100',
        hudTextSecondary: 'text-orange-300/70',
        badgeBg: 'bg-orange-900/80',
        badgeText: 'text-orange-200',
        badgeBorder: 'border-orange-700',
        lobbyBg: 'from-gray-950 via-red-950 to-orange-950',
        lobbyGlow1: 'bg-orange-500/20',
        lobbyGlow2: 'bg-red-600/20',
        lobbyTitle: 'from-orange-300 via-red-400 to-yellow-300',
        lobbyCardHover: 'hover:shadow-[0_0_40px_rgba(249,115,22,0.3)]',
        bannerBg: 'bg-gray-950/80',
        bannerBorder: 'border-orange-800',
        bannerAccent: 'text-orange-400',
    },

    hielo: {
        key: 'hielo',
        label: 'Hielo',
        emoji: '❄️',
        mapBg: 'bg-gradient-to-b from-slate-950 via-cyan-950 to-blue-950',
        mapCardBg: 'bg-slate-900/90',
        mapBorder: 'border-cyan-800/50',
        texture: "https://www.transparenttextures.com/patterns/snow.png",
        nodeActive: 'bg-gradient-to-br from-cyan-400 to-blue-600',
        nodeActiveGlow: '0 0 25px rgba(34,211,238,0.6), 0 0 50px rgba(59,130,246,0.3)',
        nodeLocked: 'bg-slate-800 border-slate-700',
        nodeCompleted: 'bg-gradient-to-br from-cyan-400 to-teal-500',
        pathBase: '#164e63',
        pathProgress: '#22d3ee',
        pathGlow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]',
        hudBg: 'bg-slate-950/95 border-cyan-900/50',
        hudAccent: 'text-cyan-400',
        hudTextPrimary: 'text-cyan-100',
        hudTextSecondary: 'text-cyan-300/70',
        badgeBg: 'bg-cyan-900/80',
        badgeText: 'text-cyan-200',
        badgeBorder: 'border-cyan-700',
        lobbyBg: 'from-slate-950 via-cyan-950 to-blue-950',
        lobbyGlow1: 'bg-cyan-400/20',
        lobbyGlow2: 'bg-blue-500/20',
        lobbyTitle: 'from-cyan-300 via-blue-300 to-sky-200',
        lobbyCardHover: 'hover:shadow-[0_0_40px_rgba(34,211,238,0.3)]',
        bannerBg: 'bg-slate-950/80',
        bannerBorder: 'border-cyan-800',
        bannerAccent: 'text-cyan-400',
    },

    selva: {
        key: 'selva',
        label: 'Selva',
        emoji: '🌿',
        mapBg: 'bg-gradient-to-b from-gray-950 via-green-950 to-emerald-950',
        mapCardBg: 'bg-gray-900/90',
        mapBorder: 'border-green-800/50',
        texture: "https://www.transparenttextures.com/patterns/dark-wood.png",
        nodeActive: 'bg-gradient-to-br from-lime-500 to-green-600',
        nodeActiveGlow: '0 0 25px rgba(132,204,22,0.6), 0 0 50px rgba(22,163,74,0.3)',
        nodeLocked: 'bg-gray-800 border-gray-700',
        nodeCompleted: 'bg-gradient-to-br from-emerald-400 to-green-600',
        pathBase: '#14532d',
        pathProgress: '#84cc16',
        pathGlow: 'drop-shadow-[0_0_10px_rgba(132,204,22,0.6)]',
        hudBg: 'bg-gray-950/95 border-green-900/50',
        hudAccent: 'text-lime-400',
        hudTextPrimary: 'text-green-100',
        hudTextSecondary: 'text-lime-300/70',
        badgeBg: 'bg-green-900/80',
        badgeText: 'text-lime-200',
        badgeBorder: 'border-green-700',
        lobbyBg: 'from-gray-950 via-green-950 to-emerald-950',
        lobbyGlow1: 'bg-lime-500/20',
        lobbyGlow2: 'bg-emerald-500/20',
        lobbyTitle: 'from-lime-300 via-green-300 to-emerald-200',
        lobbyCardHover: 'hover:shadow-[0_0_40px_rgba(132,204,22,0.3)]',
        bannerBg: 'bg-gray-950/80',
        bannerBorder: 'border-green-800',
        bannerAccent: 'text-lime-400',
    },

    neon: {
        key: 'neon',
        label: 'Neón',
        emoji: '💜',
        mapBg: 'bg-gradient-to-b from-gray-950 via-purple-950 to-fuchsia-950',
        mapCardBg: 'bg-gray-900/90',
        mapBorder: 'border-purple-800/50',
        texture: "https://www.transparenttextures.com/patterns/diagmonds-light.png",
        nodeActive: 'bg-gradient-to-br from-fuchsia-500 to-purple-600',
        nodeActiveGlow: '0 0 25px rgba(217,70,239,0.6), 0 0 50px rgba(147,51,234,0.3)',
        nodeLocked: 'bg-gray-800 border-gray-700',
        nodeCompleted: 'bg-gradient-to-br from-violet-400 to-fuchsia-500',
        pathBase: '#581c87',
        pathProgress: '#d946ef',
        pathGlow: 'drop-shadow-[0_0_10px_rgba(217,70,239,0.6)]',
        hudBg: 'bg-gray-950/95 border-purple-900/50',
        hudAccent: 'text-fuchsia-400',
        hudTextPrimary: 'text-purple-100',
        hudTextSecondary: 'text-fuchsia-300/70',
        badgeBg: 'bg-purple-900/80',
        badgeText: 'text-fuchsia-200',
        badgeBorder: 'border-purple-700',
        lobbyBg: 'from-gray-950 via-purple-950 to-fuchsia-950',
        lobbyGlow1: 'bg-fuchsia-500/20',
        lobbyGlow2: 'bg-purple-600/20',
        lobbyTitle: 'from-fuchsia-300 via-purple-300 to-pink-200',
        lobbyCardHover: 'hover:shadow-[0_0_40px_rgba(217,70,239,0.3)]',
        bannerBg: 'bg-gray-950/80',
        bannerBorder: 'border-purple-800',
        bannerAccent: 'text-fuchsia-400',
    },

    clasico: {
        key: 'clasico',
        label: 'Clásico',
        emoji: '🌊',
        mapBg: 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900',
        mapCardBg: 'bg-slate-800',
        mapBorder: 'border-slate-700/50',
        texture: "https://www.transparenttextures.com/patterns/stardust.png",
        nodeActive: 'bg-gradient-to-br from-teal-500 to-indigo-600',
        nodeActiveGlow: '0 0 25px rgba(99,102,241,0.5), 0 0 50px rgba(20,184,166,0.3)',
        nodeLocked: 'bg-slate-800 border-slate-700',
        nodeCompleted: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
        pathBase: '#334155',
        pathProgress: '#818cf8',
        pathGlow: 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]',
        hudBg: 'bg-slate-900/95 border-slate-800',
        hudAccent: 'text-teal-400',
        hudTextPrimary: 'text-slate-100',
        hudTextSecondary: 'text-teal-300/70',
        badgeBg: 'bg-slate-700',
        badgeText: 'text-slate-200',
        badgeBorder: 'border-slate-600',
        lobbyBg: 'from-slate-900 via-slate-900 to-slate-900',
        lobbyGlow1: 'bg-teal-500/20',
        lobbyGlow2: 'bg-emerald-500/20',
        lobbyTitle: 'from-teal-300 via-emerald-300 to-sky-300',
        lobbyCardHover: 'hover:shadow-[0_0_40px_rgba(45,212,191,0.3)]',
        bannerBg: 'bg-slate-900/80',
        bannerBorder: 'border-slate-700',
        bannerAccent: 'text-teal-400',
    },
};

export const THEME_LIST = Object.values(THEMES);

export function getTheme(key?: string): GameTheme {
    if (key && key in THEMES) return THEMES[key as ThemeKey];
    return THEMES.clasico;
}
