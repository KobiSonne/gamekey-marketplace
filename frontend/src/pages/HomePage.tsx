import React, { useEffect, useState } from 'react';
import { getHomepage } from '../api/catalog';
import { HomepageBlock } from '../types/catalog';
import { BlockRenderer } from '../components/home/BlockRenderer';

export const HomePage: React.FC = () => {
  const [blocks, setBlocks] = useState<HomepageBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadHomepage = async () => {
      try {
        setIsLoading(true);
        const data = await getHomepage();
        if (isMounted) {
          setBlocks(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Unable to load storefront.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadHomepage();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="h-[400px] rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-72 rounded-xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block p-6 rounded-2xl bg-[#2A1163] border border-[#FD5A20]">
          <p className="text-lg font-bold text-white">Failed to load storefront</p>
          <p className="text-sm text-gray-300 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#4618AC]/35 via-[#1F0A4D] to-[#1F0A4D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-14">
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </main>
  );
};