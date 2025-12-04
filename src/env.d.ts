interface Window {
  electronAPI: {
    openFile(filters: Electron.FileFilter[]): Promise<any>
    saveFile(defaultName: string, filters: Electron.FileFilter[]): Promise<any>
    readAudioBuffer(path: string): Promise<any>
    readLyricsFile(path: string): Promise<any>
    saveLyricsFile(path: string, content: string): Promise<any>
  }
}
