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

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR'); // dd/MM/yyyy
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type LeadFields = Pick<
  Lead,
  | 'name' | 'email' | 'phone'
  | 'paginaCaptura' | 'pesquisa' | 'grupo'
  | 'utmCampaign' | 'utmMedium' | 'utmSource' | 'utmContent' | 'utmTerm'
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
  ];
}

// Leadscore sheet: A=Hora | B=Data | C=Nome | D=Email | E=Telefone
// F–P=respostas do questionário (em ordem de envio) | Q=LeadScore | R=Nota Lead Faixa
function buildQuestionnaireRow(lead: LeadFields, date: Date): unknown[] {
  const answers = (lead.answers as Record<string, unknown>) ?? {};
  const answerValues = Object.values(answers).map((v) => v ?? '');
  return [
    formatTime(date),
    formatDate(date),
    lead.name ?? '',
    lead.email ?? '',
    lead.phone ?? '',
    ...answerValues,
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
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}
