// Elements
const home = document.getElementById("home");
const usernameSection = document.getElementById("username-section");
const lobby = document.getElementById("lobby");
const joinCodeInput = document.getElementById("join-code");
const lobbyNameDisplay = document.getElementById("lobby-name-display");
const playerList = document.getElementById("player-list");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const usernameInput = document.getElementById("username");

const createLobbyBtn = document.getElementById("create-lobby-btn");
const joinLobbyBtn = document.getElementById("join-lobby-btn");
const submitUsernameBtn = document.getElementById("submit-username-btn");
const leaveLobbyBtn = document.getElementById("leave-lobby-btn");
const sendMessageBtn = document.getElementById("send-message-btn");

// Variables
let currentLobby = null;
let username = null;
let lobbyAction = null; // 'create' or 'join'

// Rejoindre ou créer un lobby
createLobbyBtn.addEventListener('click', () => {
  lobbyAction = 'create';
  removeChatMessages();
  switchToUsernameSection();
});

joinLobbyBtn.addEventListener('click', async () => {
  const code = joinCodeInput.value.trim();
  if (code) {
    // Vérifier l'existence du lobby
    const response = await fetch('/check_lobby_exists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ lobby: code })
    });
    const data = await response.json();

    if (data.exists) {
      lobbyAction = 'join';
      currentLobby = code;
      updateURLWithLobbyCode(code);
      switchToUsernameSection();
    } else {
      alert('Lobby does not exist');
    }
  } else {
    console.warn('Lobby code is required');
  }
});

submitUsernameBtn.addEventListener('click', () => {
  username = usernameInput.value.trim();
  if (username) {
    if (lobbyAction === 'create') {
      socket.emit('createLobby', { username });
    } else if (lobbyAction === 'join') {
      socket.emit('joinLobby', { code: currentLobby, username });
    }
  } else {
    console.warn('Username is required');
  }
});

sendMessageBtn.addEventListener('click', () => {
  const message = chatInput.value.trim();
  if (message && currentLobby && username) {
    socket.emit('chatMessage', { message });
    chatInput.value = '';
  } else {
    console.warn('Cannot send message: missing lobby, message, or username');
  }
});

leaveLobbyBtn.addEventListener('click', () => {
  if (currentLobby) {
    socket.emit('leaveLobby', {});
    currentLobby = null;
    switchToHome();
    removeChatMessages();
  } else {
    console.warn('Cannot leave lobby: no current lobby');
  }
});

// Gestion des événements Socket.IO
socket.on('lobbyCreated', async ({ lobbyName }) => {
  currentLobby = lobbyName;
  updateURLWithLobbyCode(lobbyName);
  const players = await fetchPlayers(lobbyName);
  updatePlayerList(players);
  switchToLobby(lobbyName);
});

socket.on('joinedLobby', async ({ lobbyName }) => {
  currentLobby = lobbyName;
  updateURLWithLobbyCode(lobbyName);
  const players = await fetchPlayers(lobbyName);
  updatePlayerList(players);
  switchToLobby(lobbyName);
});

socket.on('newMessage', ({ sender, message }) => {
  if (sender && message) {
    const li = document.createElement('li');
    li.textContent = `${sender}: ${message}`;
    chatMessages.appendChild(li);
  } else {
    console.warn('Invalid message received:', { sender, message });
  }
});

socket.on('playerJoined', async (player) => {
  const players = await fetchPlayers(currentLobby);
  updatePlayerList(players);
});

socket.on('playerLeft', (player) => {
  removePlayerFromList(player);
});

socket.on('error', (message) => {
  alert(message);
  switchToHome(); // Retour à l'écran d'accueil en cas d'erreur
});

socket.on('kicked', () => {
  alert('Ce Lobby a été fermé par l\'hôte');
  socket.emit('leaveLobby', {});
  currentLobby = null;
  switchToHome();
  removeChatMessages();
});

// Helper functions
function switchToUsernameSection() {
  home.classList.add("hidden");
  usernameSection.classList.remove("hidden");
}

function switchToLobby(lobbyName) {
  usernameSection.classList.add("hidden");
  lobby.classList.remove("hidden");
  lobbyNameDisplay.textContent = lobbyName;
}

function switchToHome() {
  home.classList.remove("hidden");
  usernameSection.classList.add("hidden");
  lobby.classList.add("hidden");
}

function updatePlayerList(players) {
  playerList.innerHTML = "";
  players.forEach(([ username, role ]) => addPlayerToList(username, role));
}

function addPlayerToList(player, role = "Player") {
  const li = document.createElement("li");
  li.textContent = player;
  if (role === "Host") {
    li.style.color = "red";
  }
  playerList.appendChild(li);
}

function removePlayerFromList(player) {
  const items = [...playerList.children];
  const item = items.find((li) => li.textContent === player);
  if (item) playerList.removeChild(item);
}

function addChatMessage(message) {
  const li = document.createElement("li");
  li.textContent = message;
  chatMessages.appendChild(li);
}

function removeChatMessages() {
  chatMessages.innerHTML = "";
}

function SendMessage(event) {
  if (event.key === "Enter") {
    sendMessageBtn.click();
  }
}

async function SendLobbyCode(event) {
  if (event.key === "Enter") {
    joinLobbyBtn.click();
  }
}

function SendUsername(event) {
  if (event.key === "Enter") {
    submitUsernameBtn.click();
  }
}

async function fetchPlayers(lobbyName) {
  const response = await fetch(`/get_user_lobby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: "", username: "", lobby: lobbyName, role: "" })
  });
  const data = await response.json();
  return data.result;
}

// Function to join lobby via URL
function joinLobbyFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const lobbyCode = urlParams.get('lobby');
  if (lobbyCode) {
    joinCodeInput.value = lobbyCode;
    joinLobbyBtn.click();
  }
}

function updateURLWithLobbyCode(lobbyCode) {
  const newURL = `${window.location.origin}?lobby=${lobbyCode}`;
  window.history.pushState({ path: newURL }, '', newURL);
}

// Call the function on page load
window.addEventListener('load', joinLobbyFromURL);