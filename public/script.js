const socket = io("https://anontalk-oqh5.onrender.com");

const messages = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

let username = null;

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    const db = firebase.firestore();
    const userDocRef = db.collection("users").doc(user.uid);
    const doc = await userDocRef.get();

    if (doc.exists) {
      username = doc.data().username;
    } else {
      username = "Anon_" + Math.floor(1000 + Math.random() * 9000);
      await userDocRef.set({ username, createdAt: new Date() });
    }

    socket.emit("register-user", username);

 
    const chatHeader = document.getElementById("chat-header");
    if (chatHeader) chatHeader.innerText = `💬 AnonTalk | ${username}`;
  } else {
    console.error("⚠️ Not logged in to Firebase");
  }
});

let typing = false;
let typingTimeout;

socket.on("assign-name", (name) => {
  username = name;
  document.getElementById("username").innerText = name;
  document.getElementById("user-title").innerText = name;
});




socket.on("chat-message", ({ name, message }) => {
  addMessage(`${name}: ${message}`, name === username ? "self" : "");
  if (name !== username) {
    document.getElementById("ping").play();
  }
});


socket.on("system-message", (msg) => {
  addMessage(msg, "system");
});


socket.on("typing", (name) => {
  showTyping(`${name} is typing...`);
});


socket.on("user-count", (count) => {
  const span = document.getElementById("user-count");
  if (span) span.innerText = `— ${count} online`;
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg === "") return;
  socket.emit("chat-message", msg);
  messageInput.value = "";
  stopTyping();
});


messageInput.addEventListener("input", () => {
  if (!typing) {
    typing = true;
    socket.emit("typing");
    typingTimeout = setTimeout(stopTyping, 1000);
  } else {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 1000);
  }
});

function stopTyping() {
  typing = false;
}

function addMessage(msg, type = "") {
  const el = document.createElement("div");
  el.classList.add("message");

  if (type === "self") {
    el.classList.add("self");
  } else if (type === "system") {
    el.classList.add("system");
  }

  el.innerText = msg;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
}


function showTyping(msg) {
  let typingEl = document.querySelector(".typing-indicator");
  if (!typingEl) {
    typingEl = document.createElement("div");
    typingEl.className = "message typing-indicator";
    messages.appendChild(typingEl);
  }
  typingEl.innerText = msg;
  setTimeout(() => typingEl.remove(), 1500);
}

document.getElementById("theme-toggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
});


const emojiPanel = document.getElementById("emoji-panel");
const emojiButton = document.getElementById("emoji-button");

const emojis = ["😀", "😂", "😍", "🤔", "😎", "😭", "😡", "🥳", "👍", "🙏", "💡", "💬", "🔥", "💯", "🎉"];

emojiButton.addEventListener("click", () => {
  if (emojiPanel.style.display === "none") {
    emojiPanel.innerHTML = "";
    emojis.forEach((emoji) => {
      const span = document.createElement("span");
      span.innerText = emoji;
      span.style.cursor = "pointer";
      span.style.margin = "5px";
      span.style.fontSize = "20px";
      span.addEventListener("click", () => {
        messageInput.value += emoji;
        emojiPanel.style.display = "none";
      });
      emojiPanel.appendChild(span);
    });
    emojiPanel.style.display = "block";
  } else {
    emojiPanel.style.display = "none";
  }
});

document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiButton) {
    emojiPanel.style.display = "none";
  }
});
