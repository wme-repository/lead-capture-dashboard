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

export async function appendLeadToSheet(
  source: Pick<Source, 'sheetsId' | 'sheetTab'>,
  lead: Pick<Lead, 'name' | 'email' | 'phone' | 'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmTerm' | 'utmContent' | 'score' | 'grade'>
): Promise<void> {
  if (!source.sheetsId || !source.sheetTab) return;

  const row = [
    lead.name ?? '',
    lead.email ?? '',
    lead.phone ?? '',
    lead.utmSource ?? '',
    lead.utmMedium ?? '',
    lead.utmCampaign ?? '',
    lead.utmTerm ?? '',
    lead.utmContent ?? '',
    lead.score != null ? String(lead.score) : '',
    lead.grade ?? '',
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
