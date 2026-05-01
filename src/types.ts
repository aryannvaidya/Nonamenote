export interface Theme {
  id: string;
  name: string;
  bgClass: string;
  paperClass: string;
  fontClass: string;
  accentColor: string;
  description: string;
}

export const THEMES: Theme[] = [
  { 
    id: 'telegraph', 
    name: 'Telegraph', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-[#fdf5e6] shadow-2xl border-4 border-[#b89e7a]', 
    fontClass: 'font-telegraph text-[#2F2F2F]',
    accentColor: '#b89e7a',
    description: 'Morse & stamp'
  },
  { 
    id: 'white', 
    name: 'Plain White', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-white shadow-2xl border border-gray-100', 
    fontClass: 'font-serif-elegant text-gray-800',
    accentColor: '#b89e7a',
    description: 'Minimal'
  },
  { 
    id: 'black', 
    name: 'Plain Black', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-[#111] shadow-2xl border border-white/5 [background-image:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.05\'/%3E%3C/svg%3E")]', 
    fontClass: 'font-sans text-gray-100',
    accentColor: '#b89e7a',
    description: 'Noise'
  },
  { 
    id: 'valentine', 
    name: 'Valentine', 
    bgClass: 'bg-[#300a0a]', 
    paperClass: 'bg-[#fff5f5] shadow-2xl border-t-[16px] border-pink-200 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100%25\' height=\'100%25\'%3E%3Ctext x=\'10\' y=\'30\' font-size=\'30\' opacity=\'0.3\'%3E💖%3C/text%3E%3Ctext x=\'85%25\' y=\'15%25\' font-size=\'20\' opacity=\'0.2\'%3E💘%3C/text%3E%3Ctext x=\'15%25\' y=\'85%25\' font-size=\'25\' opacity=\'0.2\'%3E💝%3C/text%3E%3Ctext x=\'90%25\' y=\'90%25\' font-size=\'30\' opacity=\'0.3\'%3E💌%3C/text%3E%3Ccircle cx=\'50%25\' cy=\'50%25\' r=\'150\' fill=\'none\' stroke=\'%23f472b6\' stroke-width=\'0.5\' stroke-dasharray=\'10 20\' opacity=\'0.1\'/%3E%3C/svg%3E")]', 
    fontClass: 'font-serif-elegant text-[#9b2c2c]',
    accentColor: '#f472b6',
    description: 'Hearts & Pink'
  },
  { 
    id: 'holi', 
    name: 'GRADIENT', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-white shadow-2xl [background-image:radial-gradient(circle_at_0%_0%,_rgba(255,0,150,0.15)_0%,_transparent_40%),_radial-gradient(circle_at_100%_0%,_rgba(0,200,255,0.15)_0%,_transparent_40%),_radial-gradient(circle_at_50%_100%,_rgba(255,200,0,0.15)_0%,_transparent_40%)]', 
    fontClass: 'font-sans text-gray-700 font-bold',
    accentColor: '#ed64a6',
    description: 'Vibrant'
  },
  { 
    id: 'forest', 
    name: 'Forest', 
    bgClass: 'bg-[#051a10]', 
    paperClass: 'bg-white shadow-2xl border-l-[16px] border-green-950 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100%25\' height=\'100%25\'%3E%3Ctext x=\'5\' y=\'15\' font-size=\'15\' opacity=\'0.1\'%3E🍃%3C/text%3E%3Ctext x=\'95%25\' y=\'95%25\' font-size=\'15\' opacity=\'0.1\' text-anchor=\'end\'%3E🍄%3C/text%3E%3Cpath d=\'M0 0 Q20 50 0 100\' fill=\'none\' stroke=\'%231a3d2e\' stroke-width=\'4\' opacity=\'0.05\'/%3E%3C/svg%3E")]', 
    fontClass: 'font-serif-elegant text-[#1c4532]',
    accentColor: '#276749',
    description: 'Nature'
  },
  { 
    id: 'ocean', 
    name: 'Ocean', 
    bgClass: 'bg-[#1a365d]', 
    paperClass: 'bg-white shadow-2xl border-b-[24px] border-blue-950 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100%25\' height=\'100%25\'%3E%3Cpath d=\'M0 90 Q25 80 50 90 T100 90\' fill=\'none\' stroke=\'%231a365d\' opacity=\'0.08\'/%3E%3Ctext x=\'10\' y=\'95%25\' font-size=\'15\' opacity=\'0.2\'%3E🐚%3C/text%3E%3Ccircle cx=\'80%25\' cy=\'70%25\' r=\'2\' fill=\'%231a365d\' opacity=\'0.05\'/%3E%3C/svg%3E")]', 
    fontClass: 'font-serif-elegant text-[#1a365d]',
    accentColor: '#319795',
    description: 'Waves'
  },
  { 
    id: 'terminal', 
    name: 'Terminal', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-[#0d1117] border border-[#30363d] shadow-2xl rounded-none overflow-hidden before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-8 before:bg-[#161b22] before:border-b before:border-[#30363d] after:content-[">_"] after:absolute after:bottom-4 after:right-4 after:text-[#3fb950] after:animate-[cursor-blink_1s_infinite]', 
    fontClass: 'font-mono text-[#f0f6fc] caret-[#58a6ff]',
    accentColor: '#3fb950',
    description: 'Repo style'
  }
];

export const CHAR_LIMIT = 500;
