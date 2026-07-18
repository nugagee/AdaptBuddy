import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.1';

type DigestPriority = 'steady' | 'watch' | 'urgent';
type DigestStatus = 'draft' | 'generated' | 'email_ready' | 'sent' | 'failed' | 'archived';

interface DigestAction {
  label?: string;
  detail?: string;
}

interface BuddyDigestPayload {
  title?: string;
  subjectName?: string;
  windowLabel?: string;
  headline?: string;
  summary?: string[];
  wins?: string[];
  watchouts?: string[];
  suggestedActions?: DigestAction[];
  talkingPoints?: string[];
}

interface EvidencePackMetric {
  label?: string;
  value?: string | number;
  detail?: string;
}

interface EvidencePackSection {
  title?: string;
  items?: string[];
}

interface EvidencePackPayload {
  title?: string;
  subjectName?: string;
  windowLabel?: string;
  priority?: DigestPriority;
  executiveSummary?: string[];
  metrics?: EvidencePackMetric[];
  supportSections?: EvidencePackSection[];
  talkingPoints?: string[];
  privacyNote?: string;
}

interface WeeklyDigestSnapshotRow {
  id: string;
  user_id: string;
  scope: string;
  title: string;
  subject_name: string;
  window_label: string;
  priority: DigestPriority;
  status: DigestStatus;
  digest: BuddyDigestPayload | null;
  evidence_pack: EvidencePackPayload | null;
  email_to: string | null;
  email_subject: string | null;
  scheduled_for: string | null;
  generated_at: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface WorkerRequestBody {
  dryRun?: boolean;
  includeFuture?: boolean;
  limit?: number;
  snapshotId?: string;
}

interface SendResult {
  id: string;
  emailTo: string | null;
  status: 'sent' | 'failed' | 'skipped' | 'dry_run';
  detail: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-digest-worker-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const priorityLabels: Record<DigestPriority, string> = {
  steady: 'Steady',
  watch: 'Watch',
  urgent: 'Urgent',
};

const priorityColors: Record<DigestPriority, { bg: string; text: string; border: string }> = {
  steady: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  watch: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  urgent: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const getRequiredEnv = (name: string): string => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const parseBody = async (request: Request): Promise<WorkerRequestBody> => {
  try {
    const raw = await request.text();
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const isAuthorized = (request: Request): boolean => {
  const expected = Deno.env.get('DIGEST_WORKER_SECRET')?.trim();
  if (!expected) return false;

  const secretHeader = request.headers.get('x-digest-worker-secret')?.trim();
  const authHeader = request.headers.get('authorization')?.trim();
  const bearerSecret = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length).trim()
    : '';

  return secretHeader === expected || bearerSecret === expected;
};

const asArray = (value?: string[] | null): string[] => Array.isArray(value) ? value.filter(Boolean) : [];

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (value?: string | null): string => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(date);
};

const truncate = (value: string, max = 700): string =>
  value.length > max ? `${value.slice(0, max - 3)}...` : value;

const isDue = (snapshot: WeeklyDigestSnapshotRow, includeFuture: boolean): boolean => {
  if (includeFuture || !snapshot.scheduled_for) return true;
  const scheduled = new Date(snapshot.scheduled_for).getTime();
  return Number.isFinite(scheduled) ? scheduled <= Date.now() : true;
};

const listHtml = (items: string[] | undefined, fallback: string): string => {
  const values = asArray(items);
  return `<ul style="margin:12px 0 0;padding-left:22px;color:#334155;line-height:1.65;">${
    (values.length ? values : [fallback])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('')
  }</ul>`;
};

const sectionHtml = (title: string, body: string): string => `
  <section style="margin-top:24px;">
    <h2 style="margin:0;color:#31275f;font-size:20px;line-height:1.25;">${escapeHtml(title)}</h2>
    ${body}
  </section>
`;

const buildEmailHtml = (snapshot: WeeklyDigestSnapshotRow): string => {
  const digest = snapshot.digest ?? {};
  const pack = snapshot.evidence_pack ?? {};
  const priority = snapshot.priority ?? pack.priority ?? 'steady';
  const colors = priorityColors[priority];
  const summary = asArray(digest.summary).length ? digest.summary : pack.executiveSummary;
  const supportSections = Array.isArray(pack.supportSections) ? pack.supportSections.slice(0, 4) : [];
  const metrics = Array.isArray(pack.metrics) ? pack.metrics.slice(0, 6) : [];
  const actions = Array.isArray(digest.suggestedActions) ? digest.suggestedActions.slice(0, 5) : [];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(snapshot.email_subject || snapshot.title)}</title>
  </head>
  <body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#1e293b;">
    <div style="display:none;max-height:0;overflow:hidden;">
      ${escapeHtml(digest.headline || 'Your AdaptBuddy weekly support digest is ready.')}
    </div>
    <main style="max-width:760px;margin:0 auto;padding:28px 16px;">
      <article style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px;box-shadow:0 18px 50px rgba(15,23,42,0.08);">
        <p style="margin:0 0 10px;color:#6366f1;font-size:12px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;">AdaptBuddy Weekly Digest</p>
        <h1 style="margin:0;color:#2f285f;font-size:32px;line-height:1.12;">${escapeHtml(snapshot.title)}</h1>
        <p style="margin:12px 0 0;color:#64748b;font-size:15px;line-height:1.7;">
          ${escapeHtml(snapshot.subject_name)} · ${escapeHtml(snapshot.window_label)} · generated ${escapeHtml(formatDate(snapshot.generated_at))}
        </p>
        <div style="margin-top:18px;display:inline-flex;align-items:center;border:1px solid ${colors.border};background:${colors.bg};color:${colors.text};border-radius:999px;padding:8px 12px;font-size:13px;font-weight:900;">
          ${priorityLabels[priority]} priority
        </div>

        ${sectionHtml('Headline', `<p style="margin:12px 0 0;color:#334155;font-size:17px;line-height:1.7;">${escapeHtml(digest.headline || 'A support snapshot is ready for review.')}</p>`)}
        ${sectionHtml('Summary', listHtml(summary, 'No summary evidence has been recorded yet.'))}
        ${sectionHtml('Wins', listHtml(digest.wins, 'No specific wins recorded yet.'))}
        ${sectionHtml('Watchouts', listHtml(digest.watchouts, 'No major watchouts recorded.'))}

        ${metrics.length ? sectionHtml('Evidence Metrics', `
          <div style="margin-top:14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
            ${metrics.map((metric) => `
              <div style="border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#f8fafc;">
                <p style="margin:0;color:#64748b;font-size:12px;font-weight:800;">${escapeHtml(metric.label)}</p>
                <p style="margin:6px 0 0;color:#2f285f;font-size:24px;font-weight:900;">${escapeHtml(metric.value)}</p>
                <p style="margin:4px 0 0;color:#64748b;font-size:12px;line-height:1.5;">${escapeHtml(metric.detail)}</p>
              </div>
            `).join('')}
          </div>
        `) : ''}

        ${actions.length ? sectionHtml('Suggested Actions', `
          <ul style="margin:12px 0 0;padding-left:22px;color:#334155;line-height:1.65;">
            ${actions.map((action) => `<li><strong>${escapeHtml(action.label || 'Action')}:</strong> ${escapeHtml(action.detail || '')}</li>`).join('')}
          </ul>
        `) : ''}

        ${supportSections.map((section) =>
          sectionHtml(section.title || 'Support Evidence', listHtml(section.items, 'No evidence recorded yet.'))
        ).join('')}

        ${sectionHtml('Talking Points', listHtml(digest.talkingPoints || pack.talkingPoints, 'Keep collecting shared support evidence.'))}

        <section style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:18px;">
          <h2 style="margin:0;color:#31275f;font-size:18px;">Privacy Boundary</h2>
          <p style="margin:10px 0 0;color:#64748b;font-size:13px;line-height:1.7;">
            ${escapeHtml(pack.privacyNote || 'This digest is a support coordination aid. It is not a diagnosis or clinical decision.')}
          </p>
        </section>
      </article>
      <p style="margin:18px 4px 0;color:#94a3b8;font-size:12px;line-height:1.6;">
        AdaptBuddy generated this from support-visible information and the visibility settings already approved inside the app.
      </p>
    </main>
  </body>
</html>`;
};

const buildEmailText = (snapshot: WeeklyDigestSnapshotRow): string => {
  const digest = snapshot.digest ?? {};
  const pack = snapshot.evidence_pack ?? {};
  const lines = [
    snapshot.title,
    `${snapshot.subject_name} - ${snapshot.window_label}`,
    `Generated: ${formatDate(snapshot.generated_at)}`,
    `Priority: ${priorityLabels[snapshot.priority]}`,
    '',
    digest.headline || 'A support snapshot is ready for review.',
    '',
    'Summary',
    ...(asArray(digest.summary).length ? asArray(digest.summary) : asArray(pack.executiveSummary)).map((item) => `- ${item}`),
    '',
    'Wins',
    ...(asArray(digest.wins).length ? asArray(digest.wins) : ['No specific wins recorded yet.']).map((item) => `- ${item}`),
    '',
    'Watchouts',
    ...(asArray(digest.watchouts).length ? asArray(digest.watchouts) : ['No major watchouts recorded.']).map((item) => `- ${item}`),
    '',
    'Suggested Actions',
    ...(Array.isArray(digest.suggestedActions) && digest.suggestedActions.length
      ? digest.suggestedActions.map((action) => `- ${action.label || 'Action'}: ${action.detail || ''}`)
      : ['- Keep reviewing support-visible evidence.']),
    '',
    'Privacy Boundary',
    pack.privacyNote || 'This digest is a support coordination aid. It is not a diagnosis or clinical decision.',
  ];

  return lines.join('\n');
};

const sendEmail = async (
  snapshot: WeeklyDigestSnapshotRow,
  resendApiKey: string,
  fromEmail: string,
  replyToEmail?: string,
): Promise<string> => {
  if (!snapshot.email_to?.trim()) {
    throw new Error('Snapshot has no email_to value.');
  }

  const subject = snapshot.email_subject || `${snapshot.title}: ${snapshot.subject_name}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [snapshot.email_to],
      subject,
      html: buildEmailHtml(snapshot),
      text: buildEmailText(snapshot),
      ...(replyToEmail ? { reply_to: replyToEmail } : {}),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload?.message === 'string'
      ? payload.message
      : `Resend returned HTTP ${response.status}`;
    throw new Error(detail);
  }

  return typeof payload?.id === 'string' ? payload.id : 'sent';
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
  }

  if (!isAuthorized(request)) {
    return json({ error: 'Unauthorized digest worker request.' }, 401);
  }

  const body = await parseBody(request);
  const limit = Math.max(1, Math.min(Number(body.limit ?? 10), 50));
  const dryRun = body.dryRun === true;
  const includeFuture = body.includeFuture === true;

  let supabaseUrl: string;
  let serviceRoleKey: string;
  try {
    supabaseUrl = getRequiredEnv('SUPABASE_URL');
    serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Missing Supabase environment.' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let query = supabase
    .from('weekly_digest_snapshots')
    .select('id,user_id,scope,title,subject_name,window_label,priority,status,digest,evidence_pack,email_to,email_subject,scheduled_for,generated_at,metadata,created_at')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (body.snapshotId) {
    query = query.eq('id', body.snapshotId);
  } else {
    query = query.eq('status', 'email_ready');
  }

  const { data, error } = await query;
  if (error) {
    return json({ error: error.message }, 500);
  }

  const candidates = ((data ?? []) as WeeklyDigestSnapshotRow[])
    .filter((snapshot) => body.snapshotId || snapshot.status === 'email_ready')
    .filter((snapshot) => isDue(snapshot, includeFuture));

  if (dryRun) {
    return json({
      dryRun: true,
      requested: data?.length ?? 0,
      eligible: candidates.length,
      snapshots: candidates.map((snapshot) => ({
        id: snapshot.id,
        emailTo: snapshot.email_to,
        title: snapshot.title,
        scheduledFor: snapshot.scheduled_for,
      })),
    });
  }

  if (candidates.length === 0) {
    return json({
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: data?.length ?? 0,
      results: [],
    });
  }

  let resendApiKey: string;
  let fromEmail: string;
  try {
    resendApiKey = getRequiredEnv('RESEND_API_KEY');
    fromEmail = getRequiredEnv('DIGEST_FROM_EMAIL');
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Missing email provider environment.',
      eligible: candidates.length,
      hint: 'Set RESEND_API_KEY and DIGEST_FROM_EMAIL as Supabase function secrets.',
    }, 503);
  }

  const replyToEmail = Deno.env.get('DIGEST_REPLY_TO_EMAIL')?.trim() || undefined;
  const results: SendResult[] = [];

  for (const snapshot of candidates) {
    try {
      const providerId = await sendEmail(snapshot, resendApiKey, fromEmail, replyToEmail);
      const { error: updateError } = await supabase
        .from('weekly_digest_snapshots')
        .update({
          status: 'sent',
          emailed_at: new Date().toISOString(),
          email_error: null,
          metadata: {
            ...(snapshot.metadata ?? {}),
            email_provider: 'resend',
            email_provider_id: providerId,
            sent_by: 'send-weekly-digests',
          },
        })
        .eq('id', snapshot.id);

      if (updateError) throw updateError;
      results.push({
        id: snapshot.id,
        emailTo: snapshot.email_to,
        status: 'sent',
        detail: providerId,
      });
    } catch (sendError) {
      const message = truncate(sendError instanceof Error ? sendError.message : 'Unknown email send failure.');
      await supabase
        .from('weekly_digest_snapshots')
        .update({
          status: 'failed',
          email_error: message,
          metadata: {
            ...(snapshot.metadata ?? {}),
            failed_by: 'send-weekly-digests',
          },
        })
        .eq('id', snapshot.id);

      results.push({
        id: snapshot.id,
        emailTo: snapshot.email_to,
        status: 'failed',
        detail: message,
      });
    }
  }

  return json({
    processed: results.length,
    sent: results.filter((result) => result.status === 'sent').length,
    failed: results.filter((result) => result.status === 'failed').length,
    skipped: (data?.length ?? 0) - candidates.length,
    results,
  });
});
