export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    
    // Получаем ID из query-параметра или из пути (/tt0120689.png)
    let rawId = url.searchParams.get('id');
    if (!rawId) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        rawId = pathParts[0];
      }
    }

    const cleanId = rawId ? rawId.replace('.png', '').replace('/', '') : 'tt0111161';

    // Цвета, шрифты и размеры
    const bgColor = '#' + (url.searchParams.get('bg') || '121212');
    const imdbTextColor = '#' + (url.searchParams.get('imdb_text') || 'f5c518');
    const ratingTextColor = '#' + (url.searchParams.get('text') || 'ffffff');
    
    // Получаем параметр font, декодируем %20, а если не передан — используем дефолтный
    const rawFont = url.searchParams.get('font');
    const font = rawFont ? decodeURIComponent(rawFont) : 'Arial, Helvetica, sans-serif';

    const width = url.searchParams.get('w') || '120';
    const height = url.searchParams.get('h') || '36';
    const rx = url.searchParams.get('rx') || '6';

    // Числовые значения для расчётов масштабирования
    const wNum = parseFloat(width) || 120;
    const hNum = parseFloat(height) || 36;
    
    // Ручной коэффициент масштабирования (поддерживает дробные, например scale=3.4)
    const scale = parseFloat(url.searchParams.get('scale')) || 1;

    // Логика динамического масштабирования:
    // Базовый размер привязан к высоте h (стандартная высота 36px давала шрифты 13 и 14)
    const heightRatio = hNum / 36;
    const totalScale = heightRatio * scale;

    const imdbFontSize = 13 * totalScale;
    const ratingFontSize = 14 * totalScale;

    // Пропорциональные координаты по горизонтали для корре позиционирования при любом w
    const imdbXPos = wNum * 0.27;
    const ratingXPos = wNum - (25 * (wNum / 120));
    const centerYOffset = 4 * totalScale;

    let rating = 'N/A';

    // Получаем рейтинг с IMDb
    try {
      const gqlResponse = await fetch('https://api.graphql.imdb.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'x-imdb-client-name': 'imdb-web-next',
          'x-imdb-user-country': 'US'
        },
        body: JSON.stringify({
          query: `
            query GetTitle($id: ID!) {
              title(id: $id) {
                ratingsSummary {
                  aggregateRating
                }
              }
            }
          `,
          variables: { id: cleanId }
        })
      });

      if (gqlResponse.ok) {
        const gqlData = await gqlResponse.json();
        const aggregateRating = gqlData?.data?.title?.ratingsSummary?.aggregateRating;
        if (aggregateRating) {
          rating = aggregateRating.toFixed(1);
        }
      }
    } catch (e) {
      console.error('GraphQL rating fetch failed:', e);
    }

    // SVG баннер с динамическими размерами и пользовательским шрифтом
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${wNum} ${hNum}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}" rx="${rx}"/>
        <text x="${imdbXPos}" y="${(hNum / 2) + centerYOffset}" font-family="${font}" font-size="${imdbFontSize}" font-weight="900" letter-spacing="1.5" fill="${imdbTextColor}" text-anchor="middle">IMDb</text>
        <text x="${ratingXPos}" y="${(hNum / 2) + centerYOffset}" font-family="${font}" font-size="${ratingFontSize}" font-weight="bold" fill="${ratingTextColor}" text-anchor="middle">${rating}</text>
      </svg>
    `.trim();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).send(svg);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).send('Error generating banner: ' + error.message);
  }
}
