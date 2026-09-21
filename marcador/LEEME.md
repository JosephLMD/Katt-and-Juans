# Marcador compartido de Julio corredor

El sitio vive en GitHub Pages, que sirve archivos y no guarda nada.
Este Worker es lo único que hace falta para que todos los invitados
vean el mismo marcador.

## Montarlo (unos 15 minutos)

1. Entra a **dash.cloudflare.com → Workers & Pages → Create → Worker**.
   Ponle un nombre, por ejemplo `marcador-julio`, y dale Deploy.

2. **Edit code**, borra lo que traiga y pega todo `worker.js`. Deploy.

3. Crea el almacén: **Storage & Databases → KV → Create**, nómbralo
   `marcador-julio`.

4. Vuelve al Worker → **Settings → Bindings → Add → KV namespace**
   - Variable name: `MARCADOR`  ← exactamente así
   - KV namespace: el que acabas de crear

5. En **Settings → Variables**, añade:
   - `ORIGEN` = la dirección del sitio, sin barra al final
     (por ejemplo `https://josephlmd.github.io`)
   - `LLAVE_ADMIN` = una contraseña larga inventada, **como Secret**,
     solo si quieres poder borrar entradas

6. Copia la URL del Worker (algo como
   `https://marcador-julio.jose-martinez-e4c.workers.dev` (ya puesta)) y pégala en
   `regalos.html`, en la línea que dice `var MARCADOR_URL = ''`.

Listo. Si dejas esa línea vacía, el juego sigue funcionando con el
marcador local de cada teléfono: nunca se rompe.

## Borrar una entrada

```
curl -X POST https://TU-WORKER.workers.dev/borrar \
  -H "X-Llave: TU_LLAVE_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"n":"XXX","p":1234}'
```

## Lo que ya está previsto

- Solo A–Z, máximo 3 letras, tildes y símbolos se caen solos.
- Lista de combinaciones vetadas (edítala en `VETADAS`).
- Techo de 60.000 puntos: por encima es trampa y se rechaza.
- Máximo 40 envíos por hora y por IP.
- La llave de administrador vive en Cloudflare, nunca en la página.

## Lo que NO evita

Alguien con ganas puede abrir la consola del navegador y mandar un
puntaje falso por debajo del techo. Es un juego de navegador: no hay
forma de impedirlo del todo sin arruinar la gracia. Para una boda
está bien; si aparece un listo, le borras la entrada.
