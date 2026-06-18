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

export async function appendLeadToSheet(
  source: Pick<Source, 'sheetsId' | 'sheetTab' | 'schemaType'>,
  lead: Pick<
    Lead,
    | 'name' | 'email' | 'phone'
    | 'paginaCaptura' | 'pesquisa' | 'grupo'
    | 'utmCampaign' | 'utmMedium' | 'utmSource' | 'utmContent' | 'utmTerm'
    | 'score' | 'grade'
    | 'receivedAt'
  >
): Promise<void> {
  if (!source.sheetsId || !source.sheetTab) return;

  const date = new Date(lead.receivedAt);

  // Ordem das colunas: A→M conforme planilha
  // A: Data de Inscrição | B: Hora | C: Nome | D: Email | E: Telefone
  // F: Página de Captura | G: Pesquisa | H: Grupo
  // I: utm_campaign | J: utm_medium | K: utm_source | L: utm_content | M: utm_term
  const row = [
    formatDate(date),          // A - Data de Inscrição
    formatTime(date),          // B - Hora
    lead.name ?? '',           // C - Nome
    lead.email ?? '',          // D - Email
    lead.phone ?? '',          // E - Telefone
    lead.paginaCaptura ?? '',  // F - Página de Captura
    lead.pesquisa ?? '',       // G - Pesquisa
    lead.grupo ?? '',          // H - Grupo
    lead.utmCampaign ?? '',    // I - utm_campaign
    lead.utmMedium ?? '',      // J - utm_medium
    lead.utmSource ?? '',      // K - utm_source
    lead.utmContent ?? '',     // L - utm_content
    lead.utmTerm ?? '',        // M - utm_term
    ...(source.schemaType === 'questionnaire'
      ? [lead.score ?? '', lead.grade ?? '']  // N - Score | O - Grade
      : []),
  ];

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: source.sheetsId,
    range: `${source.sheetTab}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}
