export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    
    const pathParts = url.pathname.split('/').filter(Boolean);
    let rawId = url.searchParams.get('id');
    let pathParams = {};

    if (pathParts.length > 0) {
      if (!rawId) {
        rawId = pathParts[0];
      }
      for (let i = 1; i < pathParts.length; i++) {
        let part = pathParts[i].replace('.png', '');
        const dashIdx = part.indexOf('-');
        if (dashIdx !== -1) {
          const key = part.substring(0, dashIdx);
          const val = part.substring(dashIdx + 1);
          pathParams[key] = val;
        }
      }
    }

    const cleanId = rawId ? rawId.replace('.png', '').replace('/', '') : 'tt0111161';

    // Функция для получения параметра из query (?bg=...) или из пути (/bg-...)
    const getParam = (key, defaultVal, altKey = null) => {
      return url.searchParams.get(key) || pathParams[key] || (altKey ? pathParams[altKey] : null) || defaultVal;
    };

    // Определение источника: если начинается с 'tt' — IMDb, иначе — Кинопоиск
    const isImdb = cleanId.startsWith('tt');

    const bgColor = '#' + getParam('bg', '121212');
    const defaultBrandColor = isImdb ? 'f5c518' : 'f36c00'; // Жёлтый для IMDb, оранжевый для Кинопоиска
    const brandTextColor = '#' + getParam(isImdb ? 'imdb_text' : 'kp_text', defaultBrandColor, isImdb ? 'imdb-text' : 'kp-text');
    const ratingTextColor = '#' + getParam('text', 'ffffff');
    
    const rawFont = getParam('font', null);
    const font = rawFont ? decodeURIComponent(rawFont) : 'Arial, Helvetica, sans-serif';

    const width = getParam('w', '120');
    const height = getParam('h', '36');
    const rx = getParam('rx', '6');

    const wNum = parseFloat(width) || 120;
    const hNum = parseFloat(height) || 36;
    
    const scale = parseFloat(getParam('scale', '1')) || 1;

    const heightRatio = hNum / 36;
    const totalScale = heightRatio * scale;

    const brandFontSize = 13 * totalScale;
    const ratingFontSize = 14 * totalScale;

    const brandXPos = wNum * 0.27;
    const ratingXPos = wNum - (25 * (wNum / 120));
    const centerYOffset = 4 * totalScale;

    let rating = '-'; // Прочерк по умолчанию, если рейтинг не найден
    const brandName = isImdb ? 'IMDb' : 'Кинопоиск';

    try {
      if (isImdb) {
        // Запрос к IMDb
        const gqlResponse = await fetch('https://api.graphql.imdb.com/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
      } else {
        // Запрос к Кинопоиску
        const kpResponse = await fetch(`https://kinopoiskapiunofficial.tech/api/v2.2/films/${cleanId}`, {
          headers: {
            'X-API-KEY': 'e30ef708-7757-4180-9971-d602166e5124',
            'Content-Type': 'application/json',
          }
        });

        if (kpResponse.ok) {
          const kpData = await kpResponse.json();
          if (kpData && kpData.ratingKinopoisk) {
            rating = kpData.ratingKinopoisk.toFixed(1);
          }
        }
      }
    } catch (e) {
      console.error('Rating fetch failed:', e);
    }

    // Уменьшаем шрифт для более длинного слова "Кинопоиск"
    const actualBrandFontSize = !isImdb ? brandFontSize * 0.75 : brandFontSize;

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${wNum} ${hNum}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}" rx="${rx}"/>
        <text x="${brandXPos}" y="${(hNum / 2) + centerYOffset}" font-family="${font}" font-size="${actualBrandFontSize}" font-weight="900" letter-spacing="0.5" fill="${brandTextColor}" text-anchor="middle">${brandName}</text>
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
