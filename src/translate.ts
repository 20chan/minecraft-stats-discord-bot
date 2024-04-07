const DEEPL_API_KEY = process.env.DEEPL_API_KEY ?? '';

export async function translate(target: 'KO' | 'EN', text: string) {
  const result = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`
    },
    body: JSON.stringify({
      text: text.split('\n'),
      target_lang: target,
      formality: 'prefer_less',
    }),
  });

  const json = await result.json();

  return json.translations.map((x: any) => x.text).join('\n');
}