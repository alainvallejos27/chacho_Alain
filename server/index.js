const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: { origin: true },
	maxHttpBufferSize: 1_000_000
});
const rooms = new Map();
const codeAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

app.get('/health', (_request, response) => response.json({ ok: true }));
app.use(express.static(path.join(__dirname, '../dist')));
app.use((request, response, next) => {
	if (request.method === 'GET' && request.accepts('html')) {
		response.sendFile(path.join(__dirname, '../dist/index.html'));
		return;
	}
	next();
});

function createRoomCode() {
	let code;
	do {
		code = Array.from({ length: 6 }, () => codeAlphabet[crypto.randomInt(codeAlphabet.length)]).join('');
	} while (rooms.has(code));
	return code;
}

function leaveCurrentRoom(socket) {
	const previousCode = socket.data.roomCode;
	if (!previousCode) return;
	socket.leave(previousCode);
	socket.data.roomCode = null;
	const room = rooms.get(previousCode);
	if (room) io.to(previousCode).emit('room:members', io.sockets.adapter.rooms.get(previousCode)?.size ?? 0);
}

io.on('connection', socket => {
	socket.on('room:create', callback => {
		leaveCurrentRoom(socket);
		const code = createRoomCode();
		rooms.set(code, { state: null, createdAt: Date.now() });
		socket.join(code);
		socket.data.roomCode = code;
		callback?.({ ok: true, code });
		io.to(code).emit('room:members', 1);
	});

	socket.on('room:join', (rawCode, callback) => {
		const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
		const room = rooms.get(code);
		if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code) || !room) {
			callback?.({ ok: false, error: 'No encontramos esa sala. Revisa el código.' });
			return;
		}
		leaveCurrentRoom(socket);
		socket.join(code);
		socket.data.roomCode = code;
		callback?.({ ok: true, code, state: room.state, members: io.sockets.adapter.rooms.get(code)?.size ?? 1 });
		io.to(code).emit('room:members', io.sockets.adapter.rooms.get(code)?.size ?? 1);
	});

	socket.on('room:leave', code => {
		if (socket.data.roomCode === code) leaveCurrentRoom(socket);
	});

	socket.on('game:state', payload => {
		const code = socket.data.roomCode;
		if (!code || payload?.roomCode !== code || !payload.state || typeof payload.state !== 'object') return;
		const serializedState = JSON.stringify(payload.state);
		if (serializedState.length > 200_000) return;
		const room = rooms.get(code);
		if (!room) return;
		room.state = payload.state;
		socket.to(code).emit('game:state', payload.state);
	});

	socket.on('disconnect', () => {
		const code = socket.data.roomCode;
		if (code) io.to(code).emit('room:members', io.sockets.adapter.rooms.get(code)?.size ?? 0);
	});
});

setInterval(() => {
	const expiration = Date.now() - 12 * 60 * 60 * 1000;
	for (const [code, room] of rooms) {
		if (room.createdAt < expiration && !io.sockets.adapter.rooms.has(code)) rooms.delete(code);
	}
}, 60 * 60 * 1000).unref();

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, () => console.log(`Cacho Boliviano disponible en el puerto ${port}`));
