import { postToDataCrazy } from './datacrazy';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => mockFetch.mockReset());

const mockLead = {
  name: 'Bob',
  email: 'bob@test.com',
  phone: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmTerm: null,
  utmContent: null,
  score: null,
  grade: null,
};

describe('postToDataCrazy', () => {
  it('is a no-op when dataCrazyUrl is null', async () => {
    await postToDataCrazy({ dataCrazyUrl: null, fieldMapping: null }, mockLead as any);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends fetch to the configured URL', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await postToDataCrazy(
      { dataCrazyUrl: 'https://api.datacrazy.io/hook', fieldMapping: null },
      mockLead as any
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.datacrazy.io/hook',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('applies fieldMapping when provided', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await postToDataCrazy(
      {
        dataCrazyUrl: 'https://api.datacrazy.io/hook',
        fieldMapping: { nome: 'name', email_destino: 'email' },
      },
      mockLead as any
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ nome: 'Bob', email_destino: 'bob@test.com' });
  });

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 422, text: async () => 'bad request' });
    await expect(
      postToDataCrazy(
        { dataCrazyUrl: 'https://api.datacrazy.io/hook', fieldMapping: null },
        mockLead as any
      )
    ).rejects.toThrow('DataCrazy POST failed: 422');
  });
});
