import { appendLeadToSheet } from './sheets';

jest.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: jest.fn().mockImplementation(() => ({})),
    },
    sheets: jest.fn().mockReturnValue({
      spreadsheets: {
        values: {
          append: jest.fn().mockResolvedValue({ data: {} }),
        },
      },
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { google } = require('googleapis');
const mockAppend = google.sheets().spreadsheets.values.append as jest.Mock;

const mockLead = {
  name: 'Ana',
  email: 'ana@test.com',
  phone: '11999',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmTerm: null,
  utmContent: null,
  score: null,
  grade: null,
};

describe('appendLeadToSheet', () => {
  beforeEach(() => {
    mockAppend.mockClear();
    mockAppend.mockResolvedValue({ data: {} });
  });

  it('is a no-op when sheetsId is null', async () => {
    await appendLeadToSheet({ sheetsId: null, sheetTab: null, schemaType: 'standard' }, mockLead as any);
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it('calls append with correct spreadsheetId and range', async () => {
    await appendLeadToSheet({ sheetsId: 'sheet123', sheetTab: 'Leads', schemaType: 'standard' }, mockLead as any);
    expect(mockAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        spreadsheetId: 'sheet123',
        range: 'Leads!A1',
      })
    );
  });
});
