export const dynamic = 'force-dynamic';

export async function GET(req) {
    const u = new URL(req.url).searchParams.get('u') || '';
    if (!/^https:\/\/image\.tmdb\.org\//.test(u)) return new Response('forbidden', { status: 400 });
    const r = await fetch(u, { cache: 'force-cache' });
    if (!r.ok) return new Response('not found', { status: 404 });
    return new Response(r.body, {
        headers: { 'content-type': r.headers.get('content-type') || 'image/jpeg', 'cache-control': 'public, max-age=86400' },
    });
}