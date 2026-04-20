// Lazy-init Podpislon SDK client.
// Pattern matches our Resend/Supabase lazy-init to avoid CI build failures
// (env var is only available at runtime, not during Next.js "Collecting page data").

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PodpislonSDK = require('@podpislon/podpislon-sdk');

type PodpislonClient = {
  createDocument: (params: any) => Promise<any>;
  getDocument: (id: number) => Promise<any>;
  getDocuments: (params?: any) => Promise<any>;
  getFile: (id: number) => Promise<any>;
  deleteDocument: (id: number) => Promise<any>;
  getInfo: () => Promise<any>;
  resend: (code: string, contactId?: string | null) => Promise<any>;
};

let _client: PodpislonClient | null = null;

export function getPodpislon(): PodpislonClient {
  if (_client) return _client;
  const token = process.env.PODPISLON_API_KEY;
  if (!token) throw new Error('PODPISLON_API_KEY not configured');
  _client = new PodpislonSDK({ apiToken: token }) as PodpislonClient;
  return _client;
}

/** Podpislon status codes → our internal status */
export function mapPodpislonStatus(code: string | number): 'sent' | 'viewed' | 'signed' | 'cancelled' {
  const s = String(code);
  if (s === '30') return 'signed';
  if (s === '20') return 'viewed';
  if (s === '35' || s === '40') return 'cancelled';
  return 'sent';
}

/** Normalize phone to 79XXXXXXXXX (no + or spaces) as required by Podpislon */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // +7XXXXXXXXXX → 7XXXXXXXXXX (11 chars total)
  if (digits.length === 11 && digits.startsWith('8')) return '7' + digits.slice(1);
  if (digits.length === 11 && digits.startsWith('7')) return digits;
  if (digits.length === 10) return '7' + digits;
  return digits;
}
