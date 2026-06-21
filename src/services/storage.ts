const KEYS = {
  GEMINI_API_KEY: 'mbj_gemini_api_key',
  GOOGLE_CLIENT_ID: 'mbj_google_client_id',
  WHITELISTED_SENDERS: 'mbj_whitelisted_senders',
  AUTO_CLEANED_SENDERS: 'mbj_auto_cleaned_senders',
};

export const getGeminiKey = (): string => {
  return localStorage.getItem(KEYS.GEMINI_API_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
};

export const setGeminiKey = (key: string): void => {
  localStorage.setItem(KEYS.GEMINI_API_KEY, key.trim());
};

export const getGoogleClientId = (): string => {
  return localStorage.getItem(KEYS.GOOGLE_CLIENT_ID) || '173528561504-uekb1laohdv4bp7loqa7i6rcj1e7nmfr.apps.googleusercontent.com';
};

export const setGoogleClientId = (id: string): void => {
  localStorage.setItem(KEYS.GOOGLE_CLIENT_ID, id.trim());
};

export const getWhitelistedSenders = (): string[] => {
  try {
    const data = localStorage.getItem(KEYS.WHITELISTED_SENDERS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error parsing whitelisted senders', e);
    return [];
  }
};

export const addWhitelistedSender = (email: string): void => {
  const list = getWhitelistedSenders();
  const normalized = email.toLowerCase().trim();
  if (!list.includes(normalized)) {
    list.push(normalized);
    localStorage.setItem(KEYS.WHITELISTED_SENDERS, JSON.stringify(list));
  }
};

export const removeWhitelistedSender = (email: string): void => {
  const list = getWhitelistedSenders();
  const normalized = email.toLowerCase().trim();
  const filtered = list.filter(item => item !== normalized);
  localStorage.setItem(KEYS.WHITELISTED_SENDERS, JSON.stringify(filtered));
};

export type CleanupAction = 'archive' | 'delete' | 'read';

export interface AutoCleanRule {
  email: string;
  action: CleanupAction;
  senderName?: string;
}

export const getAutoCleanRules = (): AutoCleanRule[] => {
  try {
    const data = localStorage.getItem(KEYS.AUTO_CLEANED_SENDERS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error parsing auto cleaned senders', e);
    return [];
  }
};

export const addAutoCleanRule = (email: string, action: CleanupAction, senderName?: string): void => {
  const rules = getAutoCleanRules();
  const normalized = email.toLowerCase().trim();
  const existingIndex = rules.findIndex(r => r.email === normalized);
  
  if (existingIndex > -1) {
    rules[existingIndex].action = action;
    if (senderName) rules[existingIndex].senderName = senderName;
  } else {
    rules.push({ email: normalized, action, senderName });
  }
  
  localStorage.setItem(KEYS.AUTO_CLEANED_SENDERS, JSON.stringify(rules));
};

export const removeAutoCleanRule = (email: string): void => {
  const rules = getAutoCleanRules();
  const normalized = email.toLowerCase().trim();
  const filtered = rules.filter(r => r.email !== normalized);
  localStorage.setItem(KEYS.AUTO_CLEANED_SENDERS, JSON.stringify(filtered));
};

export const clearAllSettings = (): void => {
  localStorage.removeItem(KEYS.GEMINI_API_KEY);
  localStorage.removeItem(KEYS.GOOGLE_CLIENT_ID);
  localStorage.removeItem(KEYS.WHITELISTED_SENDERS);
  localStorage.removeItem(KEYS.AUTO_CLEANED_SENDERS);
  localStorage.removeItem('mbj_metric_archived');
  localStorage.removeItem('mbj_metric_deleted');
  localStorage.removeItem('mbj_metric_read');
};

export interface CleanMetrics {
  archived: number;
  deleted: number;
  read: number;
}

export const getMetrics = (): CleanMetrics => {
  try {
    const archived = parseInt(localStorage.getItem('mbj_metric_archived') || '0', 10);
    const deleted = parseInt(localStorage.getItem('mbj_metric_deleted') || '0', 10);
    const read = parseInt(localStorage.getItem('mbj_metric_read') || '0', 10);
    return { archived, deleted, read };
  } catch {
    return { archived: 0, deleted: 0, read: 0 };
  }
};

export const incrementMetric = (type: 'archive' | 'delete' | 'read', amount = 1): void => {
  const cleanKey = type === 'read' ? 'mbj_metric_read' : `mbj_metric_${type}ed`;
  const current = parseInt(localStorage.getItem(cleanKey) || '0', 10);
  localStorage.setItem(cleanKey, (current + amount).toString());
};
