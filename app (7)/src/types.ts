

export interface EvidencePhoto {
  id: string; // Google Drive file ID
  url: string; // This will be the thumbnailLink for display
  webViewLink: string; // Link to view full-size in Google Drive
  caption?: string;
}

export interface FollowUp {
  date: string;
  notes: string;
  photos?: EvidencePhoto[];
}

export interface AbatementDetails {
  workDate?: string;
  costDetails?: {
    type: 'mowing';
    hours: number;
    employees: number;
    rate: number;
    adminFee: number;
    total: number;
  };
  statementOfCostDate?: string;
  statementOfCostDocUrl?: string;
  photos?: {
    before?: EvidencePhoto[];
    after?: EvidencePhoto[];
  };
  propertyInfo?: {
    legalDescription: string;
    taxId: string;
    parcelNumber: string;
  };
  noticeOfLienDocUrl?: string;
  certificateOfLienDocUrl?: string;
}


export interface Case {
  id: string;
  caseId: string;
  status: 'ACTIVE' | 'DUE' | 'CLOSED' | 'FAILURE-NOTICED' | 'PENDING_ABATEMENT' | 'CONTINUAL_ABATEMENT';
  dateCreated: string;
  complianceDeadline: string;
  address: { street: string; city: string; province: string; postalCode: string; };
  ownerInfo: { name?: string; mailingAddress?: string; phone?: string; };
  ownerInfoStatus: 'KNOWN' | 'UNKNOWN';
  violation: { type: string; ordinance: string; description: string; correctiveAction: string; noticeClause: string; };
  evidence: { notes: { date: string; text: string; }[]; photos?: EvidencePhoto[] };
  notices: { title: string; docUrl: string; date: string; }[];
  isVacant: boolean;
  followUps?: FollowUp[];
  abatement?: AbatementDetails;
}

export interface Property {
  id: string;
  streetAddress: string;
  ownerInfo: { name?: string; mailingAddress?: string; phone?: string; };
  residentInfo: { name?: string; phone?: string; };
  isVacant: boolean;
  dilapidationNotes: string;
}

export interface PhotoWithMeta {
  file: File;
  dataUrl: string;
}

export interface User {
  username: string;
  password: string; // Plaintext for simplicity given local file constraints, or basic hash if possible. We'll stick to simple text for now as requested for simplicity.
  role: 'admin' | 'officer';
}

export interface AppConfig {
  google?: {
    clientId: string;
    fileId?: string;
    // ... (templates moved to local config below)
  };
  users?: User[]; // Local text-based users
  templates?: {
    cityName: string;
    departmentName: string;
    initialNotice: {
      header: string;
      body: string;
      warning: string;
    };
    finalNotice: {
      header: string;
      body: string;
    };
  };
}

export interface ComplaintLogEntry {
  id: string;
  timestamp: string;
  callerName: string;
  callerPhone: string;
  location: string;
  type: 'CODE' | 'DOG';
  details: {
    // For CODE
    violationType?: string;
    ordinance?: string;
    description?: string;
    correctiveAction?: string;
    // For DOG
    dogDescription?: string;
    dogBehavior?: string;
    dogOwnerInfo?: string;
  };
  notes?: string;
}


export type NoticePurpose = 'INITIAL' | 'FAILURE';

export type View = 'LIST' | 'DETAILS' | 'NEW' | 'ADMIN' | 'TEMPLATES' | 'LOG' | 'PROPERTIES' | 'REPORTS' | 'TASKS' | 'PATROL';
