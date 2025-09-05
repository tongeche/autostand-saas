// Netlify Function: GET /.netlify/functions/health
export const handler = async () => {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true, at: new Date().toISOString() })
  };
};
