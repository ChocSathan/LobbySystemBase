const socket = io();

socket.on("connect", () => {
  console.log("Connected to the server");
});

socket.on("disconnect", () => {
  console.log("Disconnected from the server");
});

window.addEventListener('beforeunload', () => {
  if (socket.connected) {
    socket.emit('leaveLobby', {});
  }
});
