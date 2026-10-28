export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string };

export interface ElectronAPI {
  app: {
    getVersion: () => Promise<string>;
    getPath: (name: string) => Promise<string>;
  };
  auth: {
    login: (credentials: { email: string; password: string; deviceInfo?: Record<string, unknown> }) => Promise<IpcResult<{ user: { id: string; email: string; full_name: string; role: string; }; accessToken: string; refreshToken: string; expiresAt: string; }>>;
    refresh: (refreshToken: string) => Promise<IpcResult<{ accessToken: string; expiresAt: string; }>>;
    logout: (sessionId: string) => Promise<IpcResult<true>>;
    verify: (token: string) => Promise<IpcResult<{ valid: boolean; }>>;
    changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<IpcResult<boolean>>;
    resetPassword: (token: string, userId: string, newPassword: string) => Promise<IpcResult<boolean>>;
  };
  setup: {
    getStatus: () => Promise<IpcResult<{ completed: boolean; hasSchool: boolean; hasUsers: boolean; hasCurrentTerm: boolean; }>>;
    complete: (payload: Record<string, unknown>) => Promise<IpcResult<{ schoolId: string; academicYearId: string; termIds: string[]; userId: string; staffId: string; }>>;
  };
  dashboard: {
    overview: (token: string) => Promise<IpcResult<{
      school: { name: string; motto?: string; primary_color?: string; currency?: string; } | null;
      currentYear: { id: string; name: string; } | null;
      currentTerm: { id: string; name: string; ordinal: number; } | null;
      stats: {
        students: number; staff: number; billsDue: number; collected: number;
        collectionRate: number; attendanceTodayRate: number | null;
      };
      recentActivity: Array<{ id: string; action: string; entity_type: string; entity_id?: string; created_at: string; user_id?: string }>;
      lastBackup: string | null;
    }>>;
  };
  schools: {
    getPublic: () => Promise<IpcResult<{ school: { name: string; motto?: string; primary_color?: string; currency?: string; } | null; setupStatus: { completed: boolean; hasSchool: boolean; hasUsers: boolean; hasCurrentTerm: boolean; } }>>;
    get: (token: string) => Promise<IpcResult<any>>;
    update: (token: string, updates: Record<string, unknown>) => Promise<IpcResult<any>>;
  };
  academic: {
    yearsList: (token: string) => Promise<IpcResult<Array<{ id: string; name: string; start_date: string; end_date: string; is_current: boolean; }>>>;
    termsList: (token: string, academicYearId: string) => Promise<IpcResult<Array<{ id: string; name: string; ordinal: number; start_date: string; end_date: string; is_current: boolean; }>>>;
    createYear: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    setCurrentYear: (token: string, id: string) => Promise<IpcResult<true>>;
    createTerm: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    setCurrentTerm: (token: string, id: string) => Promise<IpcResult<true>>;
    closeTerm: (token: string, id: string, reason: string) => Promise<IpcResult<any>>;
    reopenTerm: (token: string, id: string) => Promise<IpcResult<any>>;
  };
  students: {
    list: (token: string, params?: Record<string, unknown>) => Promise<IpcResult<Array<{ id: string; admission_number: string; first_name: string; last_name: string; status: string; class_id?: string; }>>>;
    get: (token: string, id: string) => Promise<IpcResult<any>>;
    create: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    update: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    changeStatus: (token: string, id: string, status: string, reason?: string) => Promise<IpcResult<any>>;
    delete: (token: string, id: string) => Promise<IpcResult<true>>;
  };
  classes: {
    list: (token: string, academicYearId: string) => Promise<IpcResult<Array<{ id: string; name: string; }>>>;
    create: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    update: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    delete: (token: string, id: string) => Promise<IpcResult<true>>;
  };
  subjects: {
    list: (token: string) => Promise<IpcResult<Array<{ id: string; code: string; name: string; }>>>;
    create: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    update: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    delete: (token: string, id: string) => Promise<IpcResult<true>>;
  };
  staff: {
    list: (token: string) => Promise<IpcResult<Array<{ id: string; employee_number: string; first_name: string; last_name: string; role: string; }>>>;
    create: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    update: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
  };
  users: {
    list: (token: string) => Promise<IpcResult<Array<{ id: string; email: string; full_name: string; role: string; is_active: boolean; }>>>;
    create: (token: string, data: Record<string, unknown>) => Promise<IpcResult<{ user: { id: string; email: string; full_name: string; role: string; }; staffId: string; }>>;
    setActive: (token: string, id: string, isActive: boolean) => Promise<IpcResult<any>>;
    resetPassword: (token: string, id: string, newPassword: string) => Promise<IpcResult<boolean>>;
  };
  attendance: {
    openSession: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    getSession: (token: string, sessionId: string) => Promise<IpcResult<any>>;
    sessionsByClassDate: (token: string, classId: string, date: string) => Promise<IpcResult<any[]>>;
    mark: (token: string, sessionId: string, marks: Array<{ student_id: string; status: string; remarks?: string }>) => Promise<IpcResult<any[]>>;
    markAllPresent: (token: string, sessionId: string, studentIds: string[]) => Promise<IpcResult<any[]>>;
    closeSession: (token: string, sessionId: string) => Promise<IpcResult<any>>;
    submitSession: (token: string, sessionId: string) => Promise<IpcResult<any>>;
    stats: (token: string, studentId: string, termId: string) => Promise<IpcResult<{ total: number; present: number; absent: number; late: number; excused: number; percentage: number }>>;
  };
  grades: {
    componentsList: (token: string, params: Record<string, unknown>) => Promise<IpcResult<any[]>>;
    sheetGetOrCreate: (token: string, data: Record<string, unknown>) => Promise<IpcResult<{ sheet: any; students: Array<{ id: string; full_name: string; admission_number: string; }> }>>;
    entriesGet: (token: string, gradeSheetId: string) => Promise<IpcResult<any[]>>;
    entriesBulkUpsert: (token: string, gradeSheetId: string, entries: Record<string, unknown>[]) => Promise<IpcResult<any[]>>;
    totals: (token: string, gradeSheetId: string) => Promise<IpcResult<Array<{ studentId: string; caTotal: number; examScore: number | null; total: number; }>>>;
    sheetSubmit: (token: string, sheetId: string) => Promise<IpcResult<any>>;
    sheetReview: (token: string, sheetId: string, action: 'approved' | 'returned', remarks?: string) => Promise<IpcResult<any>>;
    sheetApprove: (token: string, sheetId: string) => Promise<IpcResult<any>>;
    sheetPublish: (token: string, sheetId: string) => Promise<IpcResult<any>>;
    sheetUnlock: (token: string, sheetId: string, reason: string) => Promise<IpcResult<any>>;
    sheetsByTeacher: (token: string, academicYearId: string, termId?: string) => Promise<IpcResult<any[]>>;
    reportCard: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
  };
  fees: {
    componentsList: (token: string, academicYearId: string) => Promise<IpcResult<any[]>>;
    componentCreate: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any>>;
    structureGetOrDefault: (token: string, data: Record<string, unknown>) => Promise<IpcResult<{ structure: any; components: any[] }>>;
    structureAddComponent: (token: string, structureId: string, componentId: string) => Promise<IpcResult<any[]>>;
    billsGenerate: (token: string, data: Record<string, unknown>) => Promise<IpcResult<any[]>>;
    billsList: (token: string, params: Record<string, unknown>) => Promise<IpcResult<any[]>>;
    paymentsList: (token: string, billId: string) => Promise<IpcResult<any[]>>;
    paymentRecord: (token: string, data: Record<string, unknown>) => Promise<IpcResult<{ payment: any; bill: any }>>;
    paymentVoid: (token: string, paymentId: string, reason: string) => Promise<IpcResult<any>>;
    debtors: (token: string, academicYearId: string, termId: string) => Promise<IpcResult<any[]>>;
    collectionReport: (token: string, params: Record<string, unknown>) => Promise<IpcResult<any>>;
  };
  settings: {
    getAll: (token: string) => Promise<IpcResult<Array<{ key: string; value: string; description?: string; is_public: boolean; }>>>;
    set: (token: string, key: string, value: string, description?: string, isPublic?: boolean) => Promise<IpcResult<true>>;
  };
  backup: {
    create: (token: string, type?: string) => Promise<IpcResult<any>>;
    scheduleGet: () => Promise<IpcResult<any[]>>;
    scheduleSet: (data: Record<string, unknown>) => Promise<IpcResult<any>>;
  };
  db: {
    restore: (token: string, backupId: string) => Promise<IpcResult<any>>;
    verifyBackup: (token: string, backupId: string) => Promise<IpcResult<any>>;
    backupHistory: (token?: string, limit?: number) => Promise<IpcResult<any[]>>;
    exportBackup: (token: string, backupId: string, exportPath: string) => Promise<IpcResult<any>>;
    importBackup: (token: string, importPath: string) => Promise<IpcResult<any>>;
  };
  network: {
    start: (token?: string, port?: number) => Promise<IpcResult<any>>;
    stop: () => Promise<IpcResult<true>>;
    status: () => Promise<IpcResult<any>>;
    devices: () => Promise<IpcResult<any[]>>;
  };
  exportData: {
    data: (token: string, options: Record<string, unknown>) => Promise<IpcResult<any>>;
    template: (token: string, entityType: string) => Promise<IpcResult<any>>;
    fullBackup: (token: string) => Promise<IpcResult<any>>;
  };
  importData: {
    data: (token: string, fileData: string, options: Record<string, unknown>) => Promise<IpcResult<any>>;
    fullBackup: (token: string, fileData: string) => Promise<IpcResult<any>>;
  };
  dialog: {
    showSave: (options: Record<string, unknown>) => Promise<any>;
    showOpen: (options: Record<string, unknown>) => Promise<any>;
    showMessage: (options: Record<string, unknown>) => Promise<any>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
    openPath: (path: string) => Promise<void>;
  };
  audit: {
    trail: (token: string, entityType: string, entityId: string) => Promise<IpcResult<any[]>>;
    userActivity: (token: string, userId: string, limit?: number) => Promise<IpcResult<any[]>>;
    export: (token: string) => Promise<IpcResult<any>>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
