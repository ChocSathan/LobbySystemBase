import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware pour analyser les corps de requêtes JSON
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  createUser(socket.id);

  // Gestion des lobbies
  socket.on('createLobby', ({username}) => {
    socket.username = username;
    let code = generateLobbyCode();
    socket.join(code);
    console.log(`${username} created lobby: ${code}`);
    updateUser(socket.id, `${username}`, `${code}`, "Host");
    io.to(code).emit('lobbyCreated', { lobbyName: code });
  });

  socket.on('joinLobby', async ({ code, username }) => {
    const response = await fetch("http://127.0.0.1:8000/check_lobby_exists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: "", username: "", lobby: code, role: "" })
    });
    const data = await response.json();

    if (data.exists) {
      socket.username = username;
      socket.join(code);
      console.log(`${username} joined lobby: ${code}`);
      updateUser(socket.id, `${username}`, `${code}`, "Player");
      // Envoyer la liste des joueurs actuels du lobby
      const players = getLobbyPlayers(code);
      io.to(code).emit('joinedLobby', { lobbyName: code, players });

      // Notifier les autres membres du lobby
      socket.to(code).emit('playerJoined', username);
    } else {
      socket.emit('error', 'Lobby does not exist');
    }
  });

  socket.on('leaveLobby', async () => {
    const userData = await getUserData(socket.id);
    const lobby = userData.result.lobby;
    const username = userData.result.username;
    const role = userData.result.role;

    if (role === 'Host') {
      // Gérer le cas où l'hôte quitte le lobby
      console.log(`Host ${username} is leaving the lobby: ${lobby}`);
      // Par exemple, transférer le rôle d'hôte à un autre utilisateur
      kickAllPlayers(lobby, socket.id);
    }

    socket.leave(lobby);
    console.log(`${username} left lobby: ${lobby}`);
    socket.to(lobby).emit('playerLeft', username);
  });

  // Gestion des messages
  socket.on('chatMessage', ({message}) => {
    getUserData(socket.id).then(data => {
      const lobby = data.result.lobby;
      const username = data.result.username;
      if (!lobby || !message || !username) {
        console.warn('Invalid chatMessage data:', { lobby, message, username });
        return;
      }
      console.log('Sending message:', { lobby, message, username });
      io.to(lobby).emit('newMessage', { sender: username, message });
    }).catch(err => {
      console.error('Error fetching user data:', err);
    });
  });

  socket.on('disconnect', async () => {
    console.log('A user disconnected:', socket.id);
    const userData = await getUserData(socket.id);
    if (userData.result && userData.result.lobby !== 'home') {
      const lobby = userData.result.lobby;
      const username = userData.result.username;
      socket.to(lobby).emit('playerLeft', username);
    }
    removeUser(socket.id);
  });
});

// Helper function to get players in a lobby
function getLobbyPlayers(lobby) {
  const room = io.sockets.adapter.rooms.get(lobby);
  return room ? Array.from(room).map(socketId => {
    const socket = io.sockets.sockets.get(socketId);
    return socket ? socket.username : null;
  }).filter(username => username !== null) : [];
}

//Clear BDD
clearCSV();

// Function to get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const localIp = getLocalIpAddress();
  console.log(`Server running at http://${localIp}:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

function createUser(userId) {
  fetch("http://127.0.0.1:8000/create_user", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: userId, username: "", lobby: "home", role: "" })
  }).then(response => response.json());
}

// Route pour récupérer les joueurs par lobby
app.post('/get_user_lobby', async (req, res) => {
  const { lobby } = req.body;
  const response = await fetch("http://127.0.0.1:8000/get_user_lobby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: "", username: "", lobby, role: "" })
  });
  const data = await response.json();
  res.json(data);
});

// Route pour vérifier si un lobby existe
app.post('/check_lobby_exists', async (req, res) => {
  const { lobby } = req.body;
  const response = await fetch("http://127.0.0.1:8000/check_lobby_exists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: "", username: "", lobby, role: "" })
  });
  const data = await response.json();
  res.json(data);
});

// Function to get user by lobby
async function getUserData(userId) {
  const response = await fetch("http://127.0.0.1:8000/get_user_data", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: userId, username: "", lobby: "", role: "" })
  });
  const data = await response.json(); // Convertir la réponse en JSON
  return data; // Retourner les données récupérées
}

// Function to get user by role
async function getHost(lobbyId) {
  return fetch("http://127.0.0.1:8000/get_user_role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: "", username: "", lobby: lobbyId, role: "Host" })
});
}

// Function to update a user
function updateUser(userId, usernameId, lobbyId, roleId) {
  fetch("http://127.0.0.1:8000/update_user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: userId, username: usernameId, lobby: lobbyId, role: roleId })
  });
}

// Function to remove a user
function removeUser(userId) {
  fetch("http://127.0.0.1:8000/remove_user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: userId, username: "", lobby: "", role: "" })
  });
}

function clearCSV() {
  fetch("http://127.0.0.1:8000/clear_csv", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: "", username: "", lobby: "", role: "" })
  })
}

// Function to kick all players from a lobby
function kickAllPlayers(lobby, userId) {
  const room = io.sockets.adapter.rooms.get(lobby);
  if (room) {
    Array.from(room).forEach(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.id !== userId) {
        socket.leave(lobby);
        console.log(`Kicked ${socket.username} from lobby: ${lobby}`);
        socket.emit('kicked', 'You have been kicked from the lobby');
      }
    });
  }
}

// Function to generate a unique 5-digit code
function generateLobbyCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}