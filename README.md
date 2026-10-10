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

Abre la dirección que muestre Vite. Desde el lobby, pulsa **Jugar Local / Práctica** para iniciar una partida local, **Crear Sala Online** para crear y compartir un código, o **Unirse a Partida Online** para entrar con un código. El anfitrión configura y comienza la partida en línea.

## Estructura del frontend

`index.html` contiene únicamente los metadatos y el punto de montaje `#app`. `src/main.ts` importa los estilos e inicia `src/app.ts`, que monta las vistas y el router. Cada vista genera su propio marcado; el controlador de juego conserva los eventos y reglas existentes, mientras que los tipos compartidos, la lógica pura, la persistencia, Socket.io, audio y funciones PWA están en módulos separados.

Tailwind CSS se compila localmente con el plugin de Vite. Comprueba el proyecto con `npm run build` y `npx tsc --noEmit`.

Las vistas usan `render()`, `mount(container)` y `unmount()`; el router monta una sola vista y limpia la anterior. Para conectar autenticación, un proveedor debe escuchar `cacho:auth:login` y `cacho:auth:register`, cancelar el evento con `preventDefault()` y responder mediante `event.detail.resolve(user)` o `event.detail.reject(error)`. El dashboard administrativo recibe `cacho:admin:users`, `cacho:admin:rooms` y `cacho:admin:stats`; sus acciones se emiten como eventos `cacho:admin:*`, que el servicio conectado debe cancelar para confirmar que fueron atendidas. Sin proveedor, la interfaz informa que la operación no está configurada en lugar de simular un éxito.

## Producción

```powershell
npm run build
npm start
```

El servidor escucha en el puerto `3000` por defecto, o en el puerto definido por la variable `PORT`. Despliega ambos componentes en un hosting que mantenga un proceso Node.js activo y admita conexiones WebSocket. El comando de compilación es `npm run build` y el comando de inicio es `npm start`; un hosting exclusivamente estático no puede alojar las salas.

Al publicar una versión nueva, vuelve a compilar y desplegar. Para que el navegador detecte cambios del service worker y limpie su caché anterior, incrementa `CACHE_NAME` en `public/sw.js`; al detectar la versión nueva, la aplicación ofrecerá un botón **Actualizar**.

## Estado actual

Las salas se guardan en la memoria del servidor y desaparecen si se reinicia. Una sala vacía se conserva hasta 12 horas. Los clientes sincronizan el estado completo de la partida en tiempo real; por ahora, los participantes de una sala comparten el control y el servidor no valida turnos ni tiradas contra trampas. No uses esta versión para partidas competitivas con resultados de confianza.
