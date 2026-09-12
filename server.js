// ============================================================
// server.js — Express + Socket.IO 게임 서버 (인원 가변 2~4명)
// ============================================================

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const {
  createInitialGameState,
  getCurrentPlayer,
  endTurn,
  startAuction,
  placeBid,
  closeAuction,
  drawFromDeck,
  sellToBank,
  calcFinalAsset,
  proposeTrade,
  respondTrade,
  cancelTrade,
  useAbilityCard,
  getClientState,
  deepClone,
} = require('./gameLogic');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(express.static(path.join(__dirname, 'client', 'dist')));

// rooms: { [roomId]: { players: [{id, name}], roomName: string, maxPlayers: number, state: GameState | null } }
const rooms = {};

function getRoomId(socket) {
  const roomArr = Array.from(socket.rooms).filter(r => r !== socket.id);
  return roomArr[0] || null;
}

function getOpenRoomsList() {
  return Object.keys(rooms).map(id => {
    const r = rooms[id];
    return {
      id,
      roomName: r.roomName || `${r.players[0]?.name || '익명'}의 방`,
      hostName: r.players[0]?.name || '익명',
      count: r.players.length,
      maxPlayers: r.maxPlayers,
      isPlaying: !!r.state,
    };
  });
}

function broadcastRoomsList() {
  io.emit('rooms:list', getOpenRoomsList());
}

function broadcastState(roomId) {
  const room = rooms[roomId];
  if (!room || !room.state) return;

  for (const p of room.state.players) {
    const playerSocket = io.sockets.sockets.get(p.id);
    if (playerSocket) {
      const clientState = getClientState(room.state, p.id);
      playerSocket.emit('game:state', clientState);
    }
  }

  io.to(roomId).except(...room.state.players.map(p => p.id)).emit('game:state', {
    players: room.state.players.map(p => ({ id: p.id, name: p.name, money: p.money, inventoryCount: p.inventory.length })),
    phase: room.state.phase,
    turnIndex: room.state.turnIndex,
    roundIndex: room.state.roundIndex,
    log: room.state.log,
  });
}

function broadcastLobby(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  io.to(roomId).emit('lobby:update', {
    roomId,
    roomName: room.roomName,
    players: room.players,
    count: room.players.length,
    maxPlayers: room.maxPlayers,
  });
  broadcastRoomsList();
}

io.on('connection', (socket) => {
  console.log(`[+] 연결: ${socket.id}`);

  // 신규 접속자에게 현재 공개 방 목록 전달
  socket.emit('rooms:list', getOpenRoomsList());

  // ── 방 생성 (방 이름 & 인원 설정 포함) ─────────────────
  socket.on('room:create', ({ name, roomName, maxPlayers = 4 }, callback) => {
    const mp = Math.max(2, Math.min(4, Number(maxPlayers) || 4));
    const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
    const finalRoomName = roomName?.trim() || `${name}의 경매방`;

    rooms[roomId] = {
      players: [{ id: socket.id, name }],
      roomName: finalRoomName,
      maxPlayers: mp,
      state: null,
    };
    socket.join(roomId);
    console.log(`[방 생성] ${roomId} (${finalRoomName}) by ${name} (${mp}인)`);
    callback?.({ success: true, roomId });
    broadcastLobby(roomId);
  });

  socket.on('room:join', ({ roomId, name }, callback) => {
    const room = rooms[roomId];
    if (!room) return callback?.({ success: false, error: '존재하지 않는 방입니다.' });
    if (room.players.length >= room.maxPlayers) return callback?.({ success: false, error: '방이 꽉 찼습니다.' });
    if (room.state) return callback?.({ success: false, error: '이미 게임이 시작되었습니다.' });
    if (room.players.find(p => p.name === name)) return callback?.({ success: false, error: '이미 사용 중인 닉네임입니다.' });

    room.players.push({ id: socket.id, name });
    socket.join(roomId);
    console.log(`[방 참가] ${roomId} <- ${name}`);
    callback?.({ success: true, roomId });
    broadcastLobby(roomId);
  });

  socket.on('game:start', (_, callback) => {
    const roomId = getRoomId(socket);
    if (!roomId) return callback?.({ success: false, error: '방에 없습니다.' });
    const room = rooms[roomId];
    if (!room) return callback?.({ success: false, error: '방을 찾을 수 없습니다.' });
    if (room.players[0].id !== socket.id) return callback?.({ success: false, error: '방장만 시작할 수 있습니다.' });
    if (room.players.length < 2) return callback?.({ success: false, error: '최소 2명이 필요합니다.' });

    room.state = createInitialGameState(room.players);
    console.log(`[게임 시작] ${roomId} (${room.players.length}명)`);
    callback?.({ success: true });
    broadcastState(roomId);
    broadcastRoomsList();
  });

  socket.on('auction:start', ({ cardId }, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const currentPlayer = getCurrentPlayer(room.state);
    if (currentPlayer.id !== socket.id) return callback?.({ success: false, error: '현재 당신의 턴이 아닙니다.' });
    const result = startAuction(room.state, socket.id, cardId);
    if (result.error) return callback?.({ success: false, error: result.error });
    room.state = result;
    callback?.({ success: true });
    broadcastState(roomId);
  });

  socket.on('auction:bid', ({ amount }, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const result = placeBid(room.state, socket.id, amount);
    if (result.error) return callback?.({ success: false, error: result.error });
    room.state = result;
    callback?.({ success: true });
    broadcastState(roomId);
  });

  socket.on('auction:close', (_, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const currentPlayer = getCurrentPlayer(room.state);
    if (currentPlayer.id !== socket.id) return callback?.({ success: false, error: '현재 당신의 턴이 아닙니다.' });
    const result = closeAuction(room.state);
    if (result.error) return callback?.({ success: false, error: result.error });
    room.state = result;
    callback?.({ success: true });
    broadcastState(roomId);
  });

  socket.on('deck:draw', (_, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const currentPlayer = getCurrentPlayer(room.state);
    if (currentPlayer.id !== socket.id) return callback?.({ success: false, error: '현재 당신의 턴이 아닙니다.' });
    const result = drawFromDeck(room.state, socket.id);
    if (result.error) return callback?.({ success: false, error: result.error });
    room.state = result;
    callback?.({ success: true });
    broadcastState(roomId);
  });

  socket.on('bank:sell', ({ cardId }, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const currentPlayer = getCurrentPlayer(room.state);
    if (currentPlayer.id !== socket.id) return callback?.({ success: false, error: '현재 당신의 턴이 아닙니다.' });
    const result = sellToBank(room.state, socket.id, cardId);
    if (result.error) return callback?.({ success: false, error: result.error });
    room.state = result;
    callback?.({ success: true });
    broadcastState(roomId);
  });

  socket.on('trade:propose', ({ targetId, offerCards, offerMoney, requestCards, requestMoney }, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const result = proposeTrade(room.state, socket.id, targetId, offerCards, offerMoney, requestCards, requestMoney);
    if (result.error) return callback?.({ success: false, error: result.error });
    room.state = result;
    callback?.({ success: true });
    broadcastState(roomId);
  });

  socket.on('trade:respond', ({ accepted }, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const result = respondTrade(room.state, socket.id, accepted);
    if (result.error) return callback?.({ success: false, error: result.error });
    room.state = result;
    callback?.({ success: true });
    broadcastState(roomId);
  });

  socket.on('trade:cancel', (_, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const result = cancelTrade(room.state, socket.id);
    if (result.error) return callback?.({ success: false, error: result.error });
    room.state = result;
    callback?.({ success: true });
    broadcastState(roomId);
  });

  socket.on('ability:use', ({ cardId, params }, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const result = useAbilityCard(room.state, socket.id, cardId, params || {});
    if (result.error) return callback?.({ success: false, error: result.error });

    if (result._revealResult) {
      const revealData = result._revealResult;
      const targetSocket = io.sockets.sockets.get(revealData.userId);
      if (targetSocket) {
        targetSocket.emit('ability:reveal', {
          cardId: revealData.cardId,
          cardName: revealData.cardName,
          isReal: revealData.isReal,
        });
      }
      delete result._revealResult;
    }

    room.state = result;
    callback?.({ success: true });
    broadcastState(roomId);
  });

  socket.on('turn:end', (_, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms[roomId];
    if (!room?.state) return callback?.({ success: false, error: '게임이 없습니다.' });
    const currentPlayer = getCurrentPlayer(room.state);
    if (currentPlayer.id !== socket.id) return callback?.({ success: false, error: '현재 당신의 턴이 아닙니다.' });

    if (room.state.auction.active) {
      const auctionResult = closeAuction(room.state);
      if (!auctionResult.error) room.state = auctionResult;
    }

    room.state = endTurn(room.state);
    callback?.({ success: true });

    if (room.state.gameEnded) {
      const results = room.state.players.map(p => ({
        id: p.id,
        name: p.name,
        money: p.money,
        inventory: p.inventory,
        totalAsset: calcFinalAsset(p),
      })).sort((a, b) => b.totalAsset - a.totalAsset);
      io.to(roomId).emit('game:ended', { results });
    }

    broadcastState(roomId);
  });

  socket.on('disconnect', () => {
    console.log(`[-] 연결 해제: ${socket.id}`);
    for (const roomId of Object.keys(rooms)) {
      const room = rooms[roomId];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        const name = room.players[idx].name;
        room.players.splice(idx, 1);
        io.to(roomId).emit('player:left', { name, id: socket.id });
        if (room.state) {
          room.state.log.push(`⚠️ ${name}이(가) 게임을 떠났습니다.`);
          broadcastState(roomId);
        } else {
          broadcastLobby(roomId);
        }
        if (room.players.length === 0) {
          delete rooms[roomId];
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Game server running: http://localhost:${PORT}`);
});
