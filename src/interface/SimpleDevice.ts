export interface SimpleDevice {
    id: string;
    name: string;
    description: string;
    groupId: string;
    online: boolean;
    preview: boolean;
    urlServer: string;
    MAC: string;
    ip: string;
    createAt: string;
    TimeAlive: string;
    playlistState: String;
  }
  export interface SelectedDevice {
    id: string;
    name: string;
    groupId: string;
    isSelected: boolean;
  }