import { useState, useCallback } from 'react';
import { 
  BrowserData, 
  SyncBrowserData, 
  SyncBrowserTab, 
  SyncBrowserSettings, 
  BrowserTab, 
  BrowserSettings, 
  BrowserHistoryItem 
} from '../types';
import { GoogleDriveService } from '../services/GoogleDriveService';

interface UseSyncProps {
  accessToken?: string;
  currentData: BrowserData;
  onDataImported: (data: BrowserData) => void;
  onSyncError?: (error: string) => void;
}

export const useSync = ({ accessToken, currentData, onDataImported, onSyncError }: UseSyncProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const getService = useCallback(() => {
    if (!accessToken) throw new Error('No access token available');
    return new GoogleDriveService(accessToken);
  }, [accessToken]);

  const exportData = useCallback(async () => {
    if (!accessToken) return;
    setIsSyncing(true);
    try {
      const service = getService();
      
      // Convert App Data to Sync Data
      const syncData: SyncBrowserData = {
        tabs: (currentData.tabs || []).map((t: BrowserTab) => ({
          id: t.id,
          url: t.url,
          title: t.title,
          lastAccessed: Date.now() // Approximation
        })),
        history: currentData.history,
        settings: {
          homePage: currentData.settings.homePage,
          searchEngineUrl: currentData.settings.searchEngineUrl,
          isAdBlockEnabled: currentData.settings.adBlockEnabled
        },
        bookmarks: currentData.bookmarks || []
      };

      const fileId = await service.findSyncFile();
      if (fileId) {
        await service.updateFile(fileId, syncData);
      } else {
        await service.createFile(syncData);
      }
      setLastSyncTime(Date.now());
    } catch (error: any) {
      console.error('Export failed:', error);
      if (onSyncError) onSyncError(error.message || 'Export failed');
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken, currentData, getService, onSyncError]);

  const importData = useCallback(async () => {
    if (!accessToken) return;
    setIsSyncing(true);
    try {
      const service = getService();
      const fileId = await service.findSyncFile();
      
      if (!fileId) {
        throw new Error('Sync file not found in Google Drive');
      }

      const cloudData = await service.downloadFile(fileId);
      if (!cloudData) throw new Error('Empty sync file');

      // Merge Logic
      
      // 1. History: Merge, Unique by URL, Sort Desc, Limit 200
      const combinedHistory = [...cloudData.history, ...currentData.history];
      const uniqueHistoryMap = new Map<string, BrowserHistoryItem>();
      combinedHistory.forEach(item => {
          // If duplicate, prefer the one with later timestamp? 
          // Actually, we just want unique URLs.
          if (!uniqueHistoryMap.has(item.url)) {
              uniqueHistoryMap.set(item.url, item);
          } else {
              const existing = uniqueHistoryMap.get(item.url)!;
              if (item.timestamp > existing.timestamp) {
                  uniqueHistoryMap.set(item.url, item);
              }
          }
      });
      const mergedHistory = Array.from(uniqueHistoryMap.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 200);

      // 2. Tabs: Replace if cloud has tabs
      let mergedTabs: BrowserTab[] = currentData.tabs || [];
      if (cloudData.tabs && cloudData.tabs.length > 0) {
          mergedTabs = cloudData.tabs.map(t => ({
              id: t.id,
              url: t.url,
              title: t.title,
              isLoading: false,
              canGoBack: false,
              canGoForward: false
          }));
      }

      // 3. Settings: Overwrite
      const mergedSettings: BrowserSettings = {
          homePage: cloudData.settings.homePage,
          searchEngineUrl: cloudData.settings.searchEngineUrl,
          adBlockEnabled: cloudData.settings.isAdBlockEnabled
      };

      // 4. Bookmarks: Overwrite
      const mergedBookmarks = cloudData.bookmarks || [];

      const finalData: BrowserData = {
          history: mergedHistory,
          tabs: mergedTabs,
          settings: mergedSettings,
          bookmarks: mergedBookmarks,
          activeTabId: mergedTabs.length > 0 ? mergedTabs[0].id : currentData.activeTabId
      };

      onDataImported(finalData);
      setLastSyncTime(Date.now());

    } catch (error: any) {
      console.error('Import failed:', error);
      if (onSyncError) onSyncError(error.message || 'Import failed');
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken, currentData, getService, onDataImported, onSyncError]);

  return {
    isSyncing,
    lastSyncTime,
    exportData,
    importData
  };
};
