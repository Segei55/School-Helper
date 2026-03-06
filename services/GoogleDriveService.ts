import { SyncBrowserData } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const SYNC_FILE_NAME = 'browser_sync.json';

export class GoogleDriveService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Find the sync file in the App Data Folder.
   */
  async findSyncFile(): Promise<string | null> {
    const query = `name='${SYNC_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`;
    const url = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&spaces=appDataFolder&fields=files(id,name)`;
    
    try {
      const response = await fetch(url, { headers: this.headers });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error(`Drive API Error: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
      return null;
    } catch (error) {
      console.error('Error finding sync file:', error);
      throw error;
    }
  }

  /**
   * Download the content of the sync file.
   */
  async downloadFile(fileId: string): Promise<SyncBrowserData | null> {
    const url = `${DRIVE_API_URL}/${fileId}?alt=media`;
    try {
      const response = await fetch(url, { headers: this.headers });
      if (!response.ok) throw new Error(`Download Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Create a new sync file in the App Data Folder.
   */
  async createFile(data: SyncBrowserData): Promise<string> {
    const metadata = {
      name: SYNC_FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json'
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    const url = `${UPLOAD_API_URL}?uploadType=multipart`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}` }, // Content-Type is set automatically by FormData
        body: formData
      });

      if (!response.ok) throw new Error(`Create File Error: ${response.statusText}`);
      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }

  /**
   * Update an existing sync file.
   */
  async updateFile(fileId: string, data: SyncBrowserData): Promise<void> {
    const url = `${UPLOAD_API_URL}/${fileId}?uploadType=media`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error(`Update File Error: ${response.statusText}`);
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }
}
