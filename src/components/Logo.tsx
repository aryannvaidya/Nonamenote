import React, { useState } from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-full h-full" }) => {
  const [error, setError] = useState(false);

  // If there's an error loading the image, or we explicitly want to skip it if missing
  // we'll show a high-quality SVG fallback that matches the brand.
  if (error) {
    return (
      <svg 
        viewBox="0 0 100 100" 
        className={className}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="48" stroke="#b89e7a" strokeWidth="1" strokeDasharray="4 4" />
        <path 
          d="M35 40V60M35 50H45M45 40V60M65 40C65 40 55 40 55 50C55 60 65 60 65 60" 
          stroke="#b89e7a" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          d="M50 25L50 35M25 50L35 50M50 65L50 75M65 50L75 50" 
          stroke="#b89e7a" 
          strokeWidth="0.5" 
          strokeLinecap="round" 
        />
      </svg>
    );
  }

  return (
    <img 
      src="https://i.imgur.com/XHuu82K.png" 
      alt="NoNameNote" 
      className={`object-contain ${className}`}
      style={{
        height: '60px',
        width: 'auto',
        objectFit: 'contain'
      }}
      loading="eager"
      // @ts-ignore - fetchPriority is supported in browsers but may not be in all TS types yet
      fetchPriority="high"
      onError={() => {
        console.warn('Logo image failed to load, falling back to SVG');
        setError(true);
      }}
    />
  );
};
