const server = require('http').createServer();
const io = require('socket.io')(server);

const PORT = 3000;

server.listen(PORT);
console.log(`Listening on port ${PORT}...`);

let room;
let readyPlayerCount = 0;
const readyPlayerIds = [];
const sids = new Map();

io.on('connection', (socket) => {

    console.log(`${socket.id} has connected to the server.`);

    socket.on('ready', handlePlayerReadyEvent);
    socket.on('unready', handlePlayerUnreadyEvent);
    socket.on('cardClicked', handleCardClickEvent);
    socket.on('playingPlayerId', handleEmitPlayingPlayerId);
    socket.on('hintChange', handleHintChange);
    socket.on('load', handleInitialLoad);
    socket.on('disconnect', handleDisconnect);
});

//SOCKET HANDLER FUNCTIONS (this=socket)

function handlePlayerReadyEvent() {
    room = 'room' + Math.floor(readyPlayerCount / 2);
    console.log('Player is now in queue...', this.id, room);
    this.join(room);
    sids.set(this.id.toString(), room);
    readyPlayerIds.push(this.id);
    readyPlayerCount++;
    console.log('Current Player Count:' + readyPlayerCount);
    //io.in(room).emit('ready', readyPlayerCount);
    io.sockets.connected[this.id].emit('mySocketId', this.id);
    if (readyPlayerCount % 2 === 0 && readyPlayerCount != 0) {
        io.to(room).emit('startGame', readyPlayerIds);
        console.log('Players:', readyPlayerIds);
        readyPlayerIds.splice(0, readyPlayerIds.length);
    }
}

function handlePlayerUnreadyEvent() {
    let socketRoom = sids.get(this.id.toString());
    readyPlayerCount -= 1;
    readyPlayerIds.splice(0, readyPlayerIds.length);
    this.to(socketRoom).emit('unready');
    this.leave(socketRoom);
    sids.delete(this.id.toString());
    console.log(`Player ${this.id} has left the queue. Ready player count:` + readyPlayerCount);
}

function handleCardClickEvent(cardData) {
    let socketRoom = sids.get(this.id.toString());
    io.to(socketRoom).emit('cardClicked', cardData);
    console.log(`Card Clicked;\nCards Data: ${JSON.stringify(cardData.cardListStatus)}\n+Round: ${cardData.round.toString()}\n+CurrentHint: ${cardData.currentHint}\n+trueWordCount: ${cardData.trueWordCount}`);
}
function handleEmitPlayingPlayerId(playerId) {
    let socketRoom = sids.get(this.id.toString());
    io.to(socketRoom).emit('playingPlayerId', playerId);
    console.log('PlayingPlayerId:' + playerId);
}

function handleHintChange(playerId) {
    let socketRoom = sids.get(this.id.toString());
    io.to(socketRoom).emit('hintChange', playerId);
    console.log('HintChanged, playerId:' + playerId);
}

function handleInitialLoad(data) {
    let socketRoom = sids.get(this.id.toString());
    io.to(socketRoom).emit('load', data);
    console.log(`loadedData:${JSON.stringify(data.cardListStatus)}`);
}

function handleDisconnect(reason) {
    console.log(`Client ${this.id} disconnected: ${reason}`);
    let socketRoom = sids.get(this.id.toString());
    io.to(socketRoom).emit('playerDisconnected')
    this.leave(socketRoom);
    sids.delete(this.id.toString());
}
