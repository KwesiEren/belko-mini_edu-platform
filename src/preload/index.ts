import { contextBridge, ipcRenderer } from 'electron';

/**
 * Every domain call takes the session token and returns an IpcResult envelope:
 *   { ok: true, data } | { ok: false, error, code }
 * The typed shape lives in src/types/electron-api.d.ts.
 */
type Payload = Record<string, unknown>;

const withToken = (channel: string, payload: Payload = {}) => {
  const { token, ...rest } = payload as { token?: string };
  return ipcRenderer.invoke(channel, { ...rest, token });
};

contextBridge.exposeInMainWorld('electronAPI', {
  // ------------------------------------------------------------- platform
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPath: (name: string) => ipcRenderer.invoke('app:get-path', name),
  },

  // ----------------------------------------------------------------- auth
  auth: {
    login: (credentials: { email: string; password: string; deviceInfo?: Record<string, unknown> }) =>
      ipcRenderer.invoke('auth:login', credentials),
    refresh: (refreshToken: string) => ipcRenderer.invoke('auth:refresh', refreshToken),
    logout: (sessionId: string) => ipcRenderer.invoke('auth:logout', sessionId),
    verify: (token: string) => ipcRenderer.invoke('auth:verify', token),
    changePassword: (userId: string, currentPassword: string, newPassword: string) =>
      ipcRenderer.invoke('auth:change-password', userId, currentPassword, newPassword),
    resetPassword: (token: string, userId: string, newPassword: string) =>
      ipcRenderer.invoke('auth:reset-password', token, userId, newPassword),
  },

  // ---------------------------------------------------------------- setup
  setup: {
    getStatus: () => ipcRenderer.invoke('setup:get-status'),
    complete: (payload: Payload) => ipcRenderer.invoke('setup:complete', payload),
  },

  // ------------------------------------------------------------ dashboard
  dashboard: {
    overview: (token: string) => withToken('dashboard:overview', { token }),
  },

  // ------------------------------------------------------------- schools
  schools: {
    getPublic: () => ipcRenderer.invoke('schools:get-public'),
    get: (token: string) => withToken('schools:get', { token }),
    update: (token: string, updates: Payload) => withToken('schools:update', { ...updates, token }),
  },

  // ------------------------------------------------------------ academic
  academic: {
    yearsList: (token: string) => withToken('academic:years-list', { token }),
    termsList: (token: string, academicYearId: string) => withToken('academic:terms-list', { token, academic_year_id: academicYearId }),
    createYear: (token: string, data: Payload) => withToken('academic:year-create', { ...data, token }),
    setCurrentYear: (token: string, id: string) => withToken('academic:set-current-year', { token, id }),
    createTerm: (token: string, data: Payload) => withToken('academic:term-create', { ...data, token }),
    setCurrentTerm: (token: string, id: string) => withToken('academic:set-current-term', { token, id }),
    closeTerm: (token: string, id: string, reason: string) => withToken('academic:term-close', { token, id, reason }),
    reopenTerm: (token: string, id: string) => withToken('academic:term-reopen', { token, id }),
  },

  // ------------------------------------------------------------ students
  students: {
    list: (token: string, params: Payload = {}) => withToken('students:list', { ...params, token }),
    get: (token: string, id: string) => withToken('students:get', { token, id }),
    create: (token: string, data: Payload) => withToken('students:create', { ...data, token }),
    update: (token: string, data: Payload) => withToken('students:update', { ...data, token }),
    changeStatus: (token: string, id: string, status: string, reason?: string) =>
      withToken('students:change-status', { token, id, status, reason }),
    delete: (token: string, id: string) => withToken('students:delete', { token, id }),
  },

  // ------------------------------------------------------------- classes
  classes: {
    list: (token: string, academicYearId: string) => withToken('classes:list', { token, academicYearId }),
    create: (token: string, data: Payload) => withToken('classes:create', { ...data, token }),
    update: (token: string, data: Payload) => withToken('classes:update', { ...data, token }),
    delete: (token: string, id: string) => withToken('classes:delete', { token, id }),
  },

  // ------------------------------------------------------------ subjects
  subjects: {
    list: (token: string) => withToken('subjects:list', { token }),
    create: (token: string, data: Payload) => withToken('subjects:create', { ...data, token }),
    update: (token: string, data: Payload) => withToken('subjects:update', { ...data, token }),
    delete: (token: string, id: string) => withToken('subjects:delete', { token, id }),
  },

  // --------------------------------------------------------------- staff
  staff: {
    list: (token: string) => withToken('staff:list', { token }),
    create: (token: string, data: Payload) => withToken('staff:create', { ...data, token }),
    update: (token: string, data: Payload) => withToken('staff:update', { ...data, token }),
  },

  // --------------------------------------------------------------- users
  users: {
    list: (token: string) => withToken('users:list', { token }),
    create: (token: string, data: Payload) => withToken('users:create', { ...data, token }),
    setActive: (token: string, id: string, isActive: boolean) => withToken('users:set-active', { token, id, is_active: isActive }),
    resetPassword: (token: string, id: string, newPassword: string) => withToken('users:reset-password', { token, id, newPassword }),
  },

  // ---------------------------------------------------------- attendance
  attendance: {
    openSession: (token: string, data: Payload) => withToken('attendance:open-session', { ...data, token }),
    getSession: (token: string, sessionId: string) => withToken('attendance:get-session', { token, session_id: sessionId }),
    sessionsByClassDate: (token: string, classId: string, date: string) =>
      withToken('attendance:sessions-by-class-date', { token, class_id: classId, date }),
    mark: (token: string, sessionId: string, marks: Array<{ student_id: string; status: string; remarks?: string }>) =>
      withToken('attendance:mark', { token, session_id: sessionId, marks }),
    markAllPresent: (token: string, sessionId: string, studentIds: string[]) =>
      withToken('attendance:mark-all-present', { token, session_id: sessionId, student_ids: studentIds }),
    closeSession: (token: string, sessionId: string) => withToken('attendance:close-session', { token, session_id: sessionId }),
    submitSession: (token: string, sessionId: string) => withToken('attendance:submit-session', { token, session_id: sessionId }),
    stats: (token: string, studentId: string, termId: string) => withToken('attendance:stats', { token, student_id: studentId, term_id: termId }),
  },

  // -------------------------------------------------------------- grades
  grades: {
    componentsList: (token: string, params: Payload) => withToken('grades:components-list', { ...params, token }),
    sheetGetOrCreate: (token: string, data: Payload) => withToken('grades:sheet-get-or-create', { ...data, token }),
    entriesGet: (token: string, gradeSheetId: string) => withToken('grades:entries-get', { token, grade_sheet_id: gradeSheetId }),
    entriesBulkUpsert: (token: string, gradeSheetId: string, entries: Payload[]) =>
      withToken('grades:entries-bulk-upsert', { token, grade_sheet_id: gradeSheetId, entries }),
    totals: (token: string, gradeSheetId: string) => withToken('grades:totals', { token, grade_sheet_id: gradeSheetId }),
    sheetSubmit: (token: string, sheetId: string) => withToken('grades:sheet-submit', { token, sheet_id: sheetId }),
    sheetReview: (token: string, sheetId: string, action: 'approved' | 'returned', remarks?: string) =>
      withToken('grades:sheet-review', { token, sheet_id: sheetId, action, remarks }),
    sheetApprove: (token: string, sheetId: string) => withToken('grades:sheet-approve', { token, sheet_id: sheetId }),
    sheetPublish: (token: string, sheetId: string) => withToken('grades:sheet-publish', { token, sheet_id: sheetId }),
    sheetUnlock: (token: string, sheetId: string, reason: string) => withToken('grades:sheet-unlock', { token, sheet_id: sheetId, reason }),
    sheetsByTeacher: (token: string, academicYearId: string, termId?: string) =>
      withToken('grades:sheets-by-teacher', { token, academic_year_id: academicYearId, term_id: termId }),
    reportCard: (token: string, data: Payload) => withToken('grades:report-card', { ...data, token }),
  },

  // ---------------------------------------------------------------- fees
  fees: {
    componentsList: (token: string, academicYearId: string) => withToken('fees:components-list', { token, academic_year_id: academicYearId }),
    componentCreate: (token: string, data: Payload) => withToken('fees:component-create', { ...data, token }),
    structureGetOrDefault: (token: string, data: Payload) => withToken('fees:structure-get-or-default', { ...data, token }),
    structureAddComponent: (token: string, structureId: string, componentId: string) =>
      withToken('fees:structure-add-component', { token, structure_id: structureId, component_id: componentId }),
    billsGenerate: (token: string, data: Payload) => withToken('fees:bills-generate', { ...data, token }),
    billsList: (token: string, params: Payload) => withToken('fees:bills-list', { ...params, token }),
    paymentsList: (token: string, billId: string) => withToken('fees:payments-list', { token, bill_id: billId }),
    paymentRecord: (token: string, data: Payload) => withToken('fees:payment-record', { ...data, token }),
    paymentVoid: (token: string, paymentId: string, reason: string) => withToken('fees:payment-void', { token, payment_id: paymentId, reason }),
    debtors: (token: string, academicYearId: string, termId: string) =>
      withToken('fees:debtors', { token, academic_year_id: academicYearId, term_id: termId }),
    collectionReport: (token: string, params: Payload) => withToken('fees:collection-report', { ...params, token }),
  },

  // ------------------------------------------------------------ settings
  settings: {
    getAll: (token: string) => withToken('settings:get-all', { token }),
    set: (token: string, key: string, value: string, description?: string, isPublic?: boolean) =>
      withToken('settings:set', { token, key, value, description, is_public: isPublic }),
  },

  // ------------------------------------------------------------- backups
  backup: {
    create: (token: string, type?: string) => withToken('backup:create', { token, type }),
    scheduleGet: () => ipcRenderer.invoke('backup:schedule-get'),
    scheduleSet: (data: Payload) => ipcRenderer.invoke('backup:schedule-set', data),
  },

  // ------------------------------------------------------------ database
  db: {
    restore: (token: string, backupId: string) => withToken('db:restore', { token, backupId }),
    verifyBackup: (token: string, backupId: string) => withToken('db:verify-backup', { token, backupId }),
    backupHistory: (token?: string, limit?: number) => ipcRenderer.invoke('db:backup-history', limit),
    exportBackup: (token: string, backupId: string, exportPath: string) => withToken('db:export-backup', { token, backupId, exportPath }),
    importBackup: (token: string, importPath: string) => withToken('db:import-backup', { token, importPath }),
  },

  // ------------------------------------------------------------- network
  network: {
    start: (token?: string, port?: number) => ipcRenderer.invoke('network:start', port),
    stop: () => ipcRenderer.invoke('network:stop'),
    status: () => ipcRenderer.invoke('network:status'),
    devices: () => ipcRenderer.invoke('network:devices'),
  },

  // ------------------------------------------------------- export/import
  exportData: {
    data: (token: string, options: Payload) => withToken('export:data', { ...options, token }),
    template: (token: string, entityType: string) => withToken('export:template', { token, entityType }),
    fullBackup: (token: string) => withToken('export:full-backup', { token }),
  },
  importData: {
    data: (token: string, fileData: string, options: Payload) => withToken('import:data', { token, fileData, ...options }),
    fullBackup: (token: string, fileData: string) => withToken('import:full-backup', { token, fileData }),
  },

  // -------------------------------------------------------------- dialogs
  dialog: {
    showSave: (options: Payload) => ipcRenderer.invoke('dialog:show-save', options),
    showOpen: (options: Payload) => ipcRenderer.invoke('dialog:show-open', options),
    showMessage: (options: Payload) => ipcRenderer.invoke('dialog:show-message', options),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    openPath: (path: string) => ipcRenderer.invoke('shell:open-path', path),
  },

  // ---------------------------------------------------------------- audit
  audit: {
    trail: (token: string, entityType: string, entityId: string) => withToken('audit:trail', { token, entityType, entityId }),
    userActivity: (token: string, userId: string, limit?: number) => withToken('audit:user-activity', { token, userId, limit }),
    export: (token: string) => withToken('audit:export', { token }),
  },
});

contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
});
