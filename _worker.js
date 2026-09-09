// ── 카톡공유 사진 크롭 프록시 ──
// 사용법: /crop?src=<원본이미지URL(인코딩)>&w=800&h=800&g=top
//   - src: 자를 원본 이미지 URL (구글드라이브 썸네일 URL 등)
//   - w,h: 결과 이미지 가로/세로 (기본 800x800, 정사각형)
//   - g  : 크롭 기준점(gravity). top=상단 우선(머리 안 잘리게), center=중앙(기본), auto=자동감지
//
// Cloudflare "Image Resizing" 기능이 계정에 켜져있어야 실제로 크롭이 적용됩니다.
// 꺼져있거나 실패하면 원본 이미지를 그대로 반환합니다 (사이트가 깨지지 않도록 안전장치).
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/crop') {
      const src = url.searchParams.get('src');
      if (!src) {
        return new Response('src 파라미터가 필요합니다 (예: /crop?src=https://...)', { status: 400 });
      }

      const w = parseInt(url.searchParams.get('w') || '800', 10);
      const h = parseInt(url.searchParams.get('h') || '800', 10);
      const gravity = url.searchParams.get('g') || 'top';

      try {
        const resized = await fetch(src, {
          cf: {
            image: {
              width: w,
              height: h,
              fit: 'cover',
              gravity: gravity,
              format: 'auto'
            }
          }
        });

        if (resized.ok) {
          const headers = new Headers(resized.headers);
          headers.set('Cache-Control', 'public, max-age=86400');
          headers.set('Access-Control-Allow-Origin', '*');
          return new Response(resized.body, { status: resized.status, headers });
        }
      } catch (e) {
        // Image Resizing이 꺼져있거나 처리 중 오류 → 아래에서 원본으로 폴백
      }

      // 폴백: 크롭 실패 시 원본 이미지를 그대로 반환 (사진이 아예 안 뜨는 것보단 낫도록)
      try {
        const fallback = await fetch(src);
        const fbHeaders = new Headers(fallback.headers);
        fbHeaders.set('Access-Control-Allow-Origin', '*');
        return new Response(fallback.body, { status: fallback.status, headers: fbHeaders });
      } catch (e2) {
        return new Response('이미지를 불러올 수 없습니다: ' + e2.message, { status: 502 });
      }
    }

    // /crop이 아닌 모든 요청은 기존 정적 파일(index.html, assets 등) 그대로 서빙
    return env.ASSETS.fetch(request);
  }
};
