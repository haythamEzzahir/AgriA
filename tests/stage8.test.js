import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub env vars so config's lazy getters don't throw (needed for the live-call
// integration test at the bottom; unit tests pass a mock client directly).
vi.stubEnv('DEEPSEEK_API_KEY',  'test-key');
vi.stubEnv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1');
vi.stubEnv('DEEPSEEK_MODEL',    'deepseek-chat');

const { translate } = await import('../src/stage8_translate.js');

// ── Shared fixture ────────────────────────────────────────────────────────────

const FARM    = { name: "Ferme d'Ahmed", crop: 'tomato', analysis_date: '2026-05-15' };
const WEATHER = { air_temperature: 39, rain_3d_mm: 0, soil_moisture: 0.14, et0_mm_per_day: 6.2 };
const ZONES   = [
  { zone_id: 'A', position: 'NW',     priority: 'HIGH',   decision: 'URGENT_IRRIGATION',
    action: { amount_liters: 20281, timing: 'before_7am' } },
  { zone_id: 'C', position: 'NE',     priority: 'MEDIUM', decision: 'IRRIGATE_SOON',
    action: { amount_liters: 18500, timing: 'within_24h' } },
  { zone_id: 'E', position: 'Center', priority: 'INFO',   decision: 'HEALTHY' },
];

// Build a fake openai-SDK-compatible client whose create() is a vi.fn()
function makeClient(content = 'mocked narrative') {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content } }],
  });
  return { chat: { completions: { create } }, _create: create };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('translate (§10)', () => {
  it('Test 1: returns the content string from the API response', async () => {
    const { _create: create, ...client } = makeClient('mocked narrative');
    const result = await translate({ farm: FARM, zones: ZONES, weather: WEATHER }, client);
    expect(result).toBe('mocked narrative');
  });

  it('Test 2: system message contains agricultural-advisor framing and "never invent data" rule', async () => {
    const { _create: create, ...client } = makeClient();
    await translate({ farm: FARM, zones: ZONES, weather: WEATHER }, client);

    const { messages } = create.mock.calls[0][0];
    const sys = messages.find(m => m.role === 'system').content;
    expect(sys).toContain('agricultural advisor');
    expect(sys.toLowerCase()).toContain('never invent data');
  });

  it('Test 3: user message contains zone IDs, decisions, and weather_context', async () => {
    const { _create: create, ...client } = makeClient();
    await translate({ farm: FARM, zones: ZONES, weather: WEATHER }, client);

    const { messages } = create.mock.calls[0][0];
    const payload = JSON.parse(messages.find(m => m.role === 'user').content);

    expect(payload.zones.map(z => z.id)).toEqual(expect.arrayContaining(['A', 'C', 'E']));
    expect(payload.zones.map(z => z.decision)).toEqual(
      expect.arrayContaining(['URGENT_IRRIGATION', 'IRRIGATE_SOON', 'HEALTHY'])
    );
    expect(payload.weather_context).toMatchObject({
      temperature:           39,
      rain_forecast_3d_mm:   0,
      soil_moisture_percent: 14,
    });
  });

  it("Test 4: language='fr' → system prompt mentions French", async () => {
    const { _create: create, ...client } = makeClient();
    await translate({ farm: FARM, zones: ZONES, weather: WEATHER, language: 'fr' }, client);
    const { messages } = create.mock.calls[0][0];
    expect(messages.find(m => m.role === 'system').content).toMatch(/french/i);
  });

  it("Test 4: language='darija' → system prompt mentions Darija", async () => {
    const { _create: create, ...client } = makeClient();
    await translate({ farm: FARM, zones: ZONES, weather: WEATHER, language: 'darija' }, client);
    const { messages } = create.mock.calls[0][0];
    expect(messages.find(m => m.role === 'system').content).toMatch(/darija/i);
  });

  it("Test 4: language='mixed' (default) → system prompt mentions both Darija and French", async () => {
    const { _create: create, ...client } = makeClient();
    await translate({ farm: FARM, zones: ZONES, weather: WEATHER }, client);
    const sys = create.mock.calls[0][0].messages.find(m => m.role === 'system').content;
    expect(sys).toMatch(/darija/i);
    expect(sys).toMatch(/french/i);
  });

  it('Test 5: SDK error → translate() throws an Error mentioning "DeepSeek"', async () => {
    const create = vi.fn().mockRejectedValue(new Error('network timeout'));
    const client = { chat: { completions: { create } } };
    await expect(translate({ farm: FARM, zones: ZONES, weather: WEATHER }, client))
      .rejects.toThrow(/DeepSeek/);
  });

  it('Test 5: thrown error includes the underlying message', async () => {
    const create = vi.fn().mockRejectedValue(new Error('rate limit exceeded'));
    const client = { chat: { completions: { create } } };
    await expect(translate({ farm: FARM, zones: ZONES, weather: WEATHER }, client))
      .rejects.toThrow(/rate limit exceeded/);
  });

  it('SDK is called with temperature=0.3 and max_tokens=1500', async () => {
    const { _create: create, ...client } = makeClient();
    await translate({ farm: FARM, zones: ZONES, weather: WEATHER }, client);
    const args = create.mock.calls[0][0];
    expect(args.temperature).toBe(0.3);
    expect(args.max_tokens).toBe(1500);
  });

  it('SDK is called with model from config (deepseek-chat)', async () => {
    const { _create: create, ...client } = makeClient();
    await translate({ farm: FARM, zones: ZONES, weather: WEATHER }, client);
    expect(create.mock.calls[0][0].model).toBe('deepseek-chat');
  });

  it.skip('Test 6 (integration): live DeepSeek call with §11.8 fixture', async () => {
    // Un-skip locally with a real DEEPSEEK_API_KEY in .env to eyeball output quality.
    // Pass no _client so the real OpenAI SDK + DeepSeek endpoint are used.
    const result = await translate({ farm: FARM, zones: ZONES, weather: WEATHER, language: 'mixed' });
    console.log('\n─── DeepSeek live output ───\n', result, '\n───────────────────────────\n');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(10);
  });
});
