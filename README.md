project/
├── backend/
│   ├── app.js                   # Point d'entrée du serveur
|   └── bdd/
|       ├── _pycache_/           # Cache python
|       ├── main.py              # Gestion de la base de données
│       └── users.csv            # Base de données comprenants les utilisateurs 
├── frontend/
│   ├── public/
│   │   ├── css/
│   │   │   └── style.css        # Styles de l'interface utilisateur
│   │   ├── js/
│   │   │   ├── app.js           # Logique principale côté client
│   │   │   └── socket.js        # Gestion des événements WebSocket côté client
│   │   ├── index.html           # Page principale
│   │   └── lobby.html           # Interface du lobby
│   └── assets/
│       ├── images/              # Images utilisées dans le frontend
│       └── fonts/               # Polices personnalisées
├── node_modules/                # Modules pour node.js
├── package.json                 # Dépendances et scripts du projet
├── package-lock.json            # Verrouillage des versions des dépendances
└── README.md                    # Documentation du projetDpYLNgmTeKHNp14zAAAB,,home,

TO START API
$ cd project/backend/bdd 
$ uvicorn main:app --reload

TO START SERVER
$ cd project
$ npm start