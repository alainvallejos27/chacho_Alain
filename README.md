# Cacho Boliviano

## Desarrollo local

Instala las dependencias una vez:

```powershell
npm install
```

Abre dos terminales en la carpeta del proyecto. En la primera ejecuta el servidor de salas:

```powershell
npm run server
```

En la segunda ejecuta la web:

```powershell
npm run dev
```

Abre la dirección que muestre Vite. Desde la pantalla inicial, pulsa **Crear o unirse a partida en línea**. Una persona crea la sala, comparte el código y las demás se unen; el anfitrión configura y comienza la partida.

## Producción

```powershell
npm run build
npm start
```

El servidor escucha en el puerto `3000` por defecto, o en el puerto definido por la variable `PORT`. Despliega ambos componentes en un hosting que mantenga un proceso Node.js activo y admita conexiones WebSocket. El comando de compilación es `npm run build` y el comando de inicio es `npm start`; un hosting exclusivamente estático no puede alojar las salas.

Al publicar una versión nueva, vuelve a compilar y desplegar. Para que el navegador detecte cambios del service worker y limpie su caché anterior, incrementa `CACHE_NAME` en `public/sw.js`; al detectar la versión nueva, la aplicación ofrecerá un botón **Actualizar**.

## Estado actual

Las salas se guardan en la memoria del servidor y desaparecen si se reinicia. Una sala vacía se conserva hasta 12 horas. Los clientes sincronizan el estado completo de la partida en tiempo real; por ahora, los participantes de una sala comparten el control y el servidor no valida turnos ni tiradas contra trampas. No uses esta versión para partidas competitivas con resultados de confianza.
