import { google } from 'googleapis';
import type { Source, Lead } from '@/generated/prisma/client';

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

const TZ = 'America/Sao_Paulo';

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { timeZone: TZ }); // dd/MM/yyyy
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

type LeadFields = Pick<
  Lead,
  | 'name' | 'email' | 'phone'
  | 'paginaCaptura' | 'pesquisa' | 'grupo'
  | 'utmCampaign' | 'utmMedium' | 'utmSource' | 'utmContent' | 'utmTerm'
  | 'lp'
  | 'score' | 'grade' | 'answers'
  | 'receivedAt'
>;

// Captação sheet: A=Data | B=Hora | C=Nome | D=Telefone | E=Página de Captura
// F=Pesquisa | G=Grupo | H=utm_campaign | I=utm_medium | J=utm_source | K=utm_content | L=utm_term
function buildStandardRow(lead: LeadFields, date: Date): unknown[] {
  return [
    formatDate(date),
    formatTime(date),
    lead.name ?? '',
    lead.email ?? '',
    lead.phone ?? '',
    lead.paginaCaptura ?? '',
    lead.pesquisa ?? '',
    lead.grupo ?? '',
    lead.utmCampaign ?? '',
    lead.utmMedium ?? '',
    lead.utmSource ?? '',
    lead.utmContent ?? '',
    lead.utmTerm ?? '',
    lead.lp ?? '',
  ];
}

// Leadscore sheet columns F→P — answers keyed "1" through "11"
function buildQuestionnaireRow(lead: LeadFields, date: Date): unknown[] {
  const answers = (lead.answers as Record<string, unknown>) ?? {};
  const answerCells = Array.from({ length: 11 }, (_, i) => answers[String(i + 1)] ?? '');
  return [
    formatTime(date),
    formatDate(date),
    lead.name ?? '',
    lead.email ?? '',
    lead.phone ?? '',
    ...answerCells,
    lead.score ?? '',
    lead.grade ?? '',
  ];
}

export async function appendLeadToSheet(
  source: Pick<Source, 'sheetsId' | 'sheetTab' | 'schemaType'>,
  lead: LeadFields
): Promise<void> {
  if (!source.sheetsId || !source.sheetTab) return;

  const date = new Date(lead.receivedAt);
  const row =
    source.schemaType === 'questionnaire'
      ? buildQuestionnaireRow(lead, date)
      : buildStandardRow(lead, date);

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: source.sheetsId,
    range: `${source.sheetTab}!A1`,
    // RAW so date/hour strings ("20/06/2026", "15:30:00") are stored as text and
    // display correctly even if the column is formatted as "number" (avoids serials).
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}
