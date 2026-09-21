/**
 * Marcador de "Julio corredor" · Cloudflare Worker + KV
 * ─────────────────────────────────────────────────────────────────────
 * Dos rutas:
 *   GET  /top     → el top 10, en JSON
 *   POST /score   → {n:"ABC", p:1234}
 *
 * Por qué hace falta: GitHub Pages sirve archivos y no guarda nada.
 * Esto es lo más pequeño que puede guardar algo de verdad.
 *
 * Todo lo que llega del navegador se valida AQUÍ otra vez. Lo que el
 * navegador diga no vale: cualquiera puede abrir la consola y mandar
 * lo que se le antoje.
 */

const TOPE = 10;            // cuántos caben en el marcador
const MAX_PUNTOS = 60000;   // techo de credibilidad: más que eso es trampa
const MAX_POR_IP = 40;      // envíos por hora y por IP

/* Tres letras dan para poco, pero dan. Esto vive en la página de una
   boda y lo van a ver las dos familias. */
const VETADAS = new Set([
  'ASS','TIT','FUC','FUK','SEX','CUM','XXX','PTO','PTA','HPT','MRD',
  'GAY','NAZ','KKK','PPO','CLM','CLT','VRG','PJA','PIC','TET','CUL'
]);

const CABECERAS = (origen) => ({
  'Access-Control-Allow-Origin': origen,
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8'
});

function limpiaNombre(v) {
  const n = String(v || '').toUpperCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')      // quita tildes
    .replace(/[^A-Z]/g, '').slice(0, 3);
  if (n.length < 1) return null;
  if (VETADAS.has(n)) return null;
  return n;
}

export default {
  async fetch(peticion, entorno) {
    const url = new URL(peticion.url);
    // ORIGEN: pon aquí la dirección real del sitio, sin barra final.
    const permitido = entorno.ORIGEN || '*';
    const cab = CABECERAS(permitido);

    if (peticion.method === 'OPTIONS') return new Response(null, { headers: cab });

    if (url.pathname === '/top' && peticion.method === 'GET') {
      const lista = JSON.parse(await entorno.MARCADOR.get('top') || '[]');
      return new Response(JSON.stringify(lista), { headers: cab });
    }

    if (url.pathname === '/score' && peticion.method === 'POST') {
      // freno sencillo por IP, para que nadie inunde el marcador
      const ip = peticion.headers.get('CF-Connecting-IP') || 'sin-ip';
      const clave = 'ip:' + ip;
      const usados = parseInt(await entorno.MARCADOR.get(clave) || '0', 10);
      if (usados >= MAX_POR_IP) {
        return new Response(JSON.stringify({ error: 'demasiados envíos' }),
          { status: 429, headers: cab });
      }

      let cuerpo;
      try { cuerpo = await peticion.json(); }
      catch { return new Response(JSON.stringify({ error: 'json inválido' }),
        { status: 400, headers: cab }); }

      const n = limpiaNombre(cuerpo.n);
      const p = Math.floor(Number(cuerpo.p));
      if (!n || !Number.isFinite(p) || p <= 0 || p > MAX_PUNTOS) {
        return new Response(JSON.stringify({ error: 'datos inválidos' }),
          { status: 400, headers: cab });
      }

      const lista = JSON.parse(await entorno.MARCADOR.get('top') || '[]');
      lista.push({ n, p, t: Date.now() });
      lista.sort((a, b) => b.p - a.p);
      const recortada = lista.slice(0, TOPE);
      await entorno.MARCADOR.put('top', JSON.stringify(recortada));
      await entorno.MARCADOR.put(clave, String(usados + 1), { expirationTtl: 3600 });

      return new Response(JSON.stringify(recortada), { headers: cab });
    }

    /* Borrar una entrada, por si alguien se pasa de gracioso.
       Requiere la clave secreta LLAVE_ADMIN, que se guarda en
       Cloudflare y NUNCA en la página. */
    if (url.pathname === '/borrar' && peticion.method === 'POST') {
      if (!entorno.LLAVE_ADMIN ||
          peticion.headers.get('X-Llave') !== entorno.LLAVE_ADMIN) {
        return new Response(JSON.stringify({ error: 'no' }), { status: 403, headers: cab });
      }
      const { n, p } = await peticion.json();
      const lista = JSON.parse(await entorno.MARCADOR.get('top') || '[]');
      const fuera = lista.filter(r => !(r.n === n && r.p === p));
      await entorno.MARCADOR.put('top', JSON.stringify(fuera));
      return new Response(JSON.stringify(fuera), { headers: cab });
    }

    return new Response(JSON.stringify({ error: 'ruta desconocida' }),
      { status: 404, headers: cab });
  }
};
