import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, ArrowUpRight } from 'lucide-react';
import { HomepageBlock } from '../../types/catalog';

interface PlatformItemConfig {
  name: string;
  slug: string;
  tagline?: string;
  accent_hex?: string;
  badge_color?: string;
}

export const PlatformGridBlock: React.FC<{ block: HomepageBlock }> = ({ block }) => {
  const platforms: PlatformItemConfig[] = block.config?.platforms || [];
  if (platforms.length === 0) return null;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{block.title}</h2>
        {block.subtitle && <p className="mt-1 text-sm text-gray-300">{block.subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {platforms.map((platform) => (
          <Link
            key={platform.slug}
            to={`/store?platform=${encodeURIComponent(platform.slug)}`}
            style={{
              background: platform.accent_hex
                ? `linear-gradient(135deg, ${platform.accent_hex} 0%, #2A1163 100%)`
                : undefined,
            }}
            className="group relative p-6 rounded-2xl bg-[#2A1163] border border-[#3F1B85] hover:border-[#FAD318] transition-all duration-200 hover:-translate-y-1 shadow-lg overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#1F0A4D]/80 border border-white/10"
                style={{ color: platform.badge_color || '#FAD318' }}
              >
                <Gamepad2 className="w-6 h-6" />
              </div>

              <span className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#FAD318] text-white group-hover:text-[#1F0A4D] flex items-center justify-center transition-colors">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </span>
            </div>

            <div className="mt-5">
              <h3 className="text-xl font-black text-white group-hover:text-[#FAD318] transition-colors">
                {platform.name}
              </h3>
              {platform.tagline && (
                <p className="mt-1 text-xs font-medium text-gray-300">{platform.tagline}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};