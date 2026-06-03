<div align="center">

# 🎮 Tic-Tac-Toe Online

### Play with friends online or challenge yourself offline — built with Node.js & Socket.IO

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-tickiton.onrender.com-6C63FF?style=for-the-badge)](https://tickiton.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-≥18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7.2-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![Express](https://img.shields.io/badge/Express-4.18.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)

</div>

---

## 🎲 How to Play

### Online Mode
1. Open the app and click **"Play Online"**
2. Share the generated **Room ID** with your friend
3. Friend joins with the same Room ID
4. Take turns — first to get 3 in a row wins! 🏆

### Offline Mode
1. Click **"Play Offline"**
2. Two players share the same device
3. Players alternate turns on the same screen

---

## 🌐 Live Demo

> **[https://tickiton.onrender.com](https://tickiton.onrender.com)**

> ⚠️ Hosted on Render's free tier — the server may take **~30 seconds to spin up** on the first visit after inactivity. Just wait a moment!

---

## ✨ Features

- 🌐 **Online Multiplayer** — Real-time 2-player matches via WebSockets (Socket.IO)
- 🤖 **Offline Mode** — Play against an AI or a friend locally
- ⚡ **Real-time Sync** — Moves broadcast instantly with zero page refresh
- 📱 **Responsive UI** — Works smoothly on both desktop and mobile
- 🎯 **Win Detection** — Automatic win/draw detection with highlights
- 🔄 **Rematch System** — Instant rematch without reloading

---

## 🛠️ Tech Stack

| Layer      | Technology          |
|------------|---------------------|
| Runtime    | Node.js ≥ 18        |
| Server     | Express.js 4.18     |
| Realtime   | Socket.IO 4.7       |
| Frontend   | Vanilla JS, CSS3, HTML5 |
| Hosting    | Render.com          |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have **Node.js ≥ 18** installed:
```bash
node -v   # should print v18.x.x or higher
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/eddiebrock911/Tic-Tac-Toe-Online-off-.git

# 2. Navigate into the project
cd Tic-Tac-Toe-Online-off-

# 3. Install dependencies
npm install
```

### Running the App

```bash
# Production
npm start

# Development (hot reload with nodemon)
npm run dev
```

Then open your browser at → **http://localhost:3000**

---

## 📁 Project Structure

```
Tic-Tac-Toe-Online-off-/
├── index.html        # Game UI / Frontend
├── style.css         # Styling & animations
├── script.js         # Client-side game logic + Socket.IO client
├── server.js         # Express server + Socket.IO event handlers
├── package.json      # Project metadata & dependencies
└── README.md
```

---


## 🤝 Contributing

Contributions are welcome! Here's how:

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
# Open a Pull Request 🚀
```

---

## 📬 Author

**Ankit** — [@eddiebrock911](https://github.com/eddiebrock911)

---

<div align="center">

Made with ❤️ and a lot of ✕ and ○

⭐ **Star this repo if you found it fun!**

</div>
