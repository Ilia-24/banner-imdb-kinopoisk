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
    
    const isKinopoisk = /^\d+$/.test(cleanId);

    const getParam = (key, defaultVal, altKey = null) => {
      return url.searchParams.get(key) || pathParams[key] || (altKey ? pathParams[altKey] : null) || defaultVal;
    };

    // Вспомогательные функции для работы с HSL (создание красивого сочного градиента с переходом оттенка)
    const hexToRgb = (hex) => {
      let clean = hex.replace('#', '');
      if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
      const num = parseInt(clean, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };

    const rgbToHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [h * 360, s, l];
    };

    const hslToHex = (h, s, l) => {
      h = ((h % 360) + 360) % 360 / 360;
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      return toHex(r) + toHex(g) + toHex(b);
    };

    // Функция генерации настоящего профессионального градиента
    const generateDynamicGradient = (id, hex, isBackground = true) => {
      let cleanHex = hex.replace('#', '');
      const [r, g, b] = hexToRgb(cleanHex);
      let [h, s, l] = rgbToHsl(r, g, b);

      const isDark = l < 0.45;

      // Сдвигаем тон (hue) и светлоту (lightness) для красивого перелива
      let targetH = h + (isDark ? 12 : -12); // небольшой сдвиг оттенка
      let targetL = isDark ? Math.min(0.75, l + 0.22) : Math.max(0.15, l - 0.22);
      let targetS = Math.min(1, s * 1.1); // чуть добавляем сочности

      const altHex = hslToHex(targetH, targetS, targetL);

      // Направление градиента: для фона диагональ, для текста сверху вниз
      const coords = isBackground ? 'x1="0%" y1="0%" x2="100%" y2="100%"' : 'x1="0%" y1="0%" x2="0%" y2="100%"';
      
      return `
        <linearGradient id="${id}" ${coords}>
          <stop offset="0%" stop-color="#${cleanHex}" />
          <stop offset="100%" stop-color="#${altHex}" />
        </linearGradient>
      `;
    };

    let defsGradients = `
      <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ff0000" />
        <stop offset="20%" stop-color="#ff8c00" />
        <stop offset="40%" stop-color="#ffd700" />
        <stop offset="60%" stop-color="#008000" />
        <stop offset="80%" stop-color="#0000ff" />
        <stop offset="100%" stop-color="#800080" />
      </linearGradient>
    `;

    // Обработка фона (bg)
    const rawBg = getParam('bg', '242424');
    let bgColor;
    if (rawBg.toLowerCase() === 'rainbow') {
      bgColor = 'url(#rainbow)';
    } else if (rawBg.endsWith('-gradient')) {
      const baseHex = rawBg.replace('-gradient', '');
      defsGradients += generateDynamicGradient('grad-bg', baseHex, true);
      bgColor = 'url(#grad-bg)';
    } else {
      bgColor = '#' + rawBg;
    }

    // Обработка текста бренда
    const defaultBrandColor = isKinopoisk ? 'ff6600' : 'f5c518';
    const rawBrandText = getParam('imdb_text', defaultBrandColor, isKinopoisk ? 'kp-text' : 'imdb-text');
    let brandTextColor;
    if (rawBrandText.toLowerCase() === 'rainbow') {
      brandTextColor = 'url(#rainbow)';
    } else if (rawBrandText.endsWith('-gradient')) {
      const baseHex = rawBrandText.replace('-gradient', '');
      defsGradients += generateDynamicGradient('grad-brand', baseHex, false);
      brandTextColor = 'url(#grad-brand)';
    } else {
      brandTextColor = '#' + rawBrandText;
    }
    
    // Обработка текста рейтинга
    const rawRatingText = getParam('text', 'ffffff');
    let ratingTextColor;
    if (rawRatingText.toLowerCase() === 'rainbow') {
      ratingTextColor = 'url(#rainbow)';
    } else if (rawRatingText.endsWith('-gradient')) {
      const baseHex = rawRatingText.replace('-gradient', '');
      defsGradients += generateDynamicGradient('grad-rating', baseHex, false);
      ratingTextColor = 'url(#grad-rating)';
    } else {
      ratingTextColor = '#' + rawRatingText;
    }
    
    const rawFont = getParam('font', null);
    const font = rawFont ? decodeURIComponent(rawFont) : 'Arial, Helvetica, sans-serif';

    const width = getParam('w', '110');
    const height = getParam('h', '40');
    const rx = getParam('rx', '6');

    const wNum = parseFloat(width) || 110;
    const hNum = parseFloat(height) || 40;
    
    const scale = parseFloat(getParam('scale', '1')) || 1;

    const heightRatio = hNum / 40;
    const totalScale = heightRatio * scale;

    const brandFontSize = (isKinopoisk ? 10.5 : 13) * totalScale;
    const ratingFontSize = 14 * totalScale;

    const brandFontFamily = isKinopoisk ? 'sans-serif' : font;
    const brandFontWeight = isKinopoisk ? '700' : '900';
    const brandXPos = isKinopoisk ? (10 * totalScale) : (wNum * 0.27);
    const brandTextAnchor = isKinopoisk ? 'start' : 'middle';
    const brandLetterSpacing = isKinopoisk ? '-0.3' : '1.5';

    const ratingXPos = wNum - (25 * (wNum / 110));
    const centerYOffset = 4 * totalScale;

    let rating = '—';

    if (isKinopoisk) {
      try {
        const xmlRes = await fetch(`https://rating.kinopoisk.ru/${cleanId}.xml`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        if (xmlRes.ok) {
          const xmlText = await xmlRes.text();
          const match = xmlText.match(/<kp_rating[^>]*>([\d.]+)<\/kp_rating>/i) || xmlText.match(/<rating[^>]*>([\d.]+)<\/rating>/i);
          if (match && match[1]) {
            const val = parseFloat(match[1]);
            if (val > 0) {
              rating = val.toFixed(1);
            }
          }
        }

        if (rating === '—') {
          const kpResponse = await fetch(`https://kinopoiskapiunofficial.tech/api/v2.2/films/${cleanId}`, {
            headers: {
              'X-API-KEY': 'e30ed3d7-d75d-4f39-a68b-59751e180d50',
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            }
          });

          if (kpResponse.ok) {
            const kpData = await kpResponse.json();
            const kpRating = kpData.ratingKinopoisk || kpData.rating || kpData.ratingKp || kpData.ratingImdb;
            if (kpRating !== null && kpRating !== undefined && !isNaN(parseFloat(kpRating)) && parseFloat(kpRating) > 0) {
              rating = parseFloat(kpRating).toFixed(1);
            }
          }
        }
      } catch (e) {
        console.error('Kinopoisk rating fetch failed:', e);
      }
    } else {
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
    }

    const brandName = isKinopoisk ? 'Кинопоиск' : 'IMDb';

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${wNum} ${hNum}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${defsGradients}
        </defs>
        <rect width="100%" height="100%" fill="${bgColor}" rx="${rx}"/>
        <text x="${brandXPos}" y="${(hNum / 2) + centerYOffset}" font-family="${brandFontFamily}" font-size="${brandFontSize}" font-weight="${brandFontWeight}" letter-spacing="${brandLetterSpacing}" fill="${brandTextColor}" text-anchor="${brandTextAnchor}">${brandName}</text>
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
