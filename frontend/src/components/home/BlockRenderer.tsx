import React from 'react';
import { HomepageBlock } from '../../types/catalog';
import { HeroBannerBlock } from './HeroBannerBlock';
import { ProductCarouselBlock } from './ProductGridOrRowBlock';
import { PlatformGridBlock } from './PlatformGridBlock';

export const BlockRenderer: React.FC<{ block: HomepageBlock }> = ({ block }) => {
  switch (block.block_type) {
    case 'hero_banner':
      return <HeroBannerBlock block={block} />;
    case 'best_sellers':
      return <ProductCarouselBlock block={block} isFlashDeal={false} />;
    case 'flash_deals':
      return <ProductCarouselBlock block={block} isFlashDeal={true} />;
    case 'platform_spotlight':
      return <PlatformGridBlock block={block} />;
    default:
      // Fallback for any future backend-configured product block
      if (block.products && block.products.length > 0) {
        return <ProductCarouselBlock block={block} />;
      }
      return null;
  }
};