import { Image } from 'expo-image';
import MAPS, { getPoiImage, getOverviewImage, getStrategyImage, getMapConfig } from '@/constants/assetRegistry';

interface MapDataWithPois {
  mapId?: string;
  mapName: string;
  pointsOfInterest?: Array<{ id: string; content?: { relatedImageFile?: string } }>;
  strategyOverlays?: Array<{ id: string }>;
  operationalOverview?: { imageFile?: string };
}

export async function prefetchMapImages(mapId: string, mapData?: MapDataWithPois): Promise<void> {
  if (!mapId) return;

  const imagesToPrefetch: any[] = [];
  const mapConfig = getMapConfig(mapId);

  if (mapConfig?.pois) {
    Object.keys(mapConfig.pois).forEach((poiId) => {
      const source = getPoiImage(mapId, poiId);
      if (source) {
        imagesToPrefetch.push(source);
      }
    });
  }

  if (mapConfig?.strategies) {
    Object.keys(mapConfig.strategies).forEach((strategyId) => {
      const source = getStrategyImage(mapId, strategyId);
      if (source) {
        imagesToPrefetch.push(source);
      }
    });
  }

  const overviewImage = getOverviewImage(mapId);
  if (overviewImage) {
    imagesToPrefetch.push(overviewImage);
  }

  if (imagesToPrefetch.length > 0) {
    console.log(`[Prefetch] Loading ${imagesToPrefetch.length} images for ${mapId}`);

    try {
      const prefetchPromises = imagesToPrefetch.map(async (source) => {
        try {
          await Image.prefetch(source);
        } catch (err) {
          // Silent fail for individual images
        }
      });

      await Promise.all(prefetchPromises);
      console.log(`[Prefetch] Complete for ${mapId}`);
    } catch (error) {
      console.warn('[Prefetch] Some images failed to prefetch:', error);
    }
  }
}

export async function prefetchAllMapsThumbnails(): Promise<void> {
  const mapIds = Object.keys(MAPS);
  
  console.log(`[Prefetch] Loading thumbnails for ${mapIds.length} maps`);
  
  try {
    const prefetchPromises = mapIds.map(async (mapId) => {
      const config = getMapConfig(mapId);
      if (config?.thumbnail) {
        try {
          await Image.prefetch(config.thumbnail);
        } catch (err) {
          // Silent fail
        }
      }
    });
    
    await Promise.all(prefetchPromises);
    console.log('[Prefetch] Thumbnails complete');
  } catch (error) {
    console.warn('[Prefetch] Thumbnail prefetch failed:', error);
  }
}
