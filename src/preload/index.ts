import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPath: (name: string) => ipcRenderer.invoke('app:get-path', name),
  },
  auth: {
    login: (credentials: { email: string; password: string; deviceInfo?: any }) =>
      ipcRenderer.invoke('auth:login', credentials),
    refresh: (refreshToken: string) => ipcRenderer.invoke('auth:refresh', refreshToken),
    logout: (sessionId: string) => ipcRenderer.invoke('auth:logout', sessionId),
    verify: (token: string) => ipcRenderer.invoke('auth:verify', token),
    changePassword: (userId: string, currentPassword: string, newPassword: string) =>
      ipcRenderer.invoke('auth:change-password', userId, currentPassword, newPassword),
    resetPassword: (userId: string, newPassword: string) =>
      ipcRenderer.invoke('auth:reset-password', userId, newPassword),
  },
  db: {
    backup: (options?: { type?: 'auto' | 'manual' | 'pre_migration' | 'pre_import' }) =>
      ipcRenderer.invoke('db:backup', options),
    restore: (backupId: string) => ipcRenderer.invoke('db:restore', backupId),
    verifyBackup: (backupId: string) => ipcRenderer.invoke('db:verify-backup', backupId),
    backupHistory: (limit?: number) => ipcRenderer.invoke('db:backup-history', limit),
    exportBackup: (backupId: string, exportPath: string) => ipcRenderer.invoke('db:export-backup', backupId, exportPath),
    importBackup: (importPath: string) => ipcRenderer.invoke('db:import-backup', importPath),
  },
  backup: {
    scheduleGet: () => ipcRenderer.invoke('backup:schedule-get'),
    scheduleSet: (data: any) => ipcRenderer.invoke('backup:schedule-set', data),
  },
  network: {
    start: (port?: number) => ipcRenderer.invoke('network:start', port),
    stop: () => ipcRenderer.invoke('network:stop'),
    status: () => ipcRenderer.invoke('network:status'),
    devices: () => ipcRenderer.invoke('network:devices'),
  },
  export: {
    data: (options: any) => ipcRenderer.invoke('export:data', options),
    template: (entityType: string) => ipcRenderer.invoke('export:template', entityType),
    fullBackup: () => ipcRenderer.invoke('export:full-backup'),
  },
  import: {
    data: (fileData: string, options: any) => ipcRenderer.invoke('import:data', fileData, options),
    fullBackup: (fileData: string) => ipcRenderer.invoke('import:full-backup', fileData),
  },
  dialog: {
    showSave: (options: any) => ipcRenderer.invoke('dialog:show-save', options),
    showOpen: (options: any) => ipcRenderer.invoke('dialog:show-open', options),
    showMessage: (options: any) => ipcRenderer.invoke('dialog:show-message', options),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    openPath: (path: string) => ipcRenderer.invoke('shell:open-path', path),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string, description?: string, isPublic?: boolean) =>
      ipcRenderer.invoke('settings:set', key, value, description, isPublic),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
  },
  audit: {
    log: (data: any) => ipcRenderer.invoke('audit:log', data),
    trail: (entityType: string, entityId: string) => ipcRenderer.invoke('audit:trail', entityType, entityId),
    userActivity: (userId: string, limit?: number) => ipcRenderer.invoke('audit:user-activity', userId, limit),
    export: () => ipcRenderer.invoke('audit:export'),
  },
});

contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
});