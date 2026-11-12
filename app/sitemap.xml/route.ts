export const dynamic = 'force-dynamic';

export async function GET() {
  const pages = ['/', '/main', '/main/rhet+', '/main/account', '/main/advanced', '/main/ai', '/main/contact-us', '/main/cut', '/main/pricing', '/main/rhetorify', '/account/login', '/privacy', '/terms'];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `
  <url>
    <loc>${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${page}</loc>
  </url>`
  )
  .join('')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
