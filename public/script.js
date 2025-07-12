const socket = io("https://anontalk-oqh5.onrender.com");

const messages = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const uploadBtn = document.getElementById("upload-button");
const fileInput = document.getElementById("file-input");
const supabase = window.supabase.createClient(
  'https://xnztglgkgfwggeljkprn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuenRnbGdrZ2Z3Z2dlbGprcHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTk3MzQsImV4cCI6MjA2Nzg3NTczNH0.F6SRfBocLNp6xCOVCChPlW7M6DG7vuF7fyU7kswVBJ8'
);

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

  
  if (msg.startsWith("[file]")) {
    const [label, link] = msg.replace("[file]", "").split("|");
    el.innerHTML = `
  📎 <strong>${label}</strong>: 
  <a href="${link}" download target="_blank" style="color: #00c896;">Download</a>
`;

  } 
  
  else {
    el.innerHTML = msg;
  }

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
uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const files = fileInput.files;
  if (!files.length) return;

  for (const file of files) {
    const fileName = `${Date.now()}_${file.name}`;

    try {
      const { error } = await supabase.storage
        .from("chat-files")
        .upload(fileName, file);

      if (error) throw error;

      const publicUrl = `https://xnztglgkgfwggeljkprn.supabase.co/storage/v1/object/public/chat-files/${fileName}`;

      let fileMsg = "";

      if (file.type.startsWith("image/")) {
        fileMsg = `🖼️ ${file.name}: <a href="${publicUrl}" target="_blank"><img src="${publicUrl}" alt="${file.name}" style="max-width:150px; display:block; margin-top:5px;"></a>`;
      } else {
        fileMsg = `📎 <strong>${file.name}</strong>: <a href="${publicUrl}" target="_blank">Download</a>`;
      }

      socket.emit("chat-message", fileMsg);
      messageInput.focus();
    } catch (err) {
      console.error("❌ Upload error:", err.message);
      alert("Upload failed: " + err.message);
    }
  }
});
