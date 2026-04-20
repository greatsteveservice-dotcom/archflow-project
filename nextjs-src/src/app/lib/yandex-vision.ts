// Yandex Cloud Vision API wrapper.
// Docs: https://yandex.cloud/ru/docs/vision/api-ref/Vision/batchAnalyze

let _config: { apiKey: string; folderId: string } | null = null;

function getConfig() {
  if (_config) return _config;
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey) throw new Error('YANDEX_API_KEY not configured');
  if (!folderId) throw new Error('YANDEX_FOLDER_ID not configured');
  _config = { apiKey, folderId };
  return _config;
}

/**
 * Classify an image with Yandex Vision.
 * Returns top labels (object/scene classes) in Russian.
 */
export async function classifyImage(imageBase64: string, maxLabels = 5): Promise<string[]> {
  const { apiKey, folderId } = getConfig();

  const res = await fetch('https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze', {
    method: 'POST',
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      folderId,
      analyze_specs: [{
        content: imageBase64,
        features: [{
          type: 'CLASSIFICATION',
          classificationConfig: { model: 'quality' },
        }],
      }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Yandex Vision ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const labels = data?.results?.[0]?.results?.[0]?.classification?.properties || [];
  return labels
    .sort((a: any, b: any) => (b.probability ?? 0) - (a.probability ?? 0))
    .slice(0, maxLabels)
    .map((l: any) => String(l.name || '').trim())
    .filter(Boolean);
}
