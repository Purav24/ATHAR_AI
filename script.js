
/* =============================================
   ATHAR — FRONTEND INTERACTIONS
============================================= */

const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

menuToggle.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "✕" : "☰";
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  });
});

/* Scroll reveal animations */

document.body.classList.add("js-reveal");

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

/* AI chat */

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const sendButton = document.getElementById("sendButton");
const suggestions = document.getElementById("suggestions");
const clearChat = document.getElementById("clearChat");

const conversation = [];
let isSending = false;

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = role === "user"
    ? "message user-message"
    : "message assistant-message";

  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = role === "user" ? "YOU" : "ATHAR AI";

  const paragraph = document.createElement("p");
  // Use textContent, not innerHTML, for untrusted AI output.
  paragraph.textContent = text;

  message.append(label, paragraph);
  chatMessages.appendChild(message);
  scrollChatToBottom();

  return message;
}

function showTyping() {
  const typing = document.createElement("div");
  typing.className = "typing-indicator";
  typing.textContent = "ATHAR AI IS THINKING ...";
  typing.setAttribute("aria-label", "ATHAR AI is generating a response");
  chatMessages.appendChild(typing);
  scrollChatToBottom();
  return typing;
}

async function sendMessage(rawMessage) {
  const message = rawMessage.trim();

  if (!message || isSending) return;

  isSending = true;
  sendButton.disabled = true;
  chatInput.disabled = true;

  addMessage("user", message);
  conversation.push({ role: "user", content: message });

  chatInput.value = "";
  chatInput.style.height = "auto";

  const typing = showTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "The AI service is unavailable.");
    }

    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("ATHAR AI returned an empty response.");
    }

    conversation.push({ role: "assistant", content: data.reply });
    addMessage("assistant", data.reply);
  } catch (error) {
    addMessage(
      "assistant",
      `I couldn't complete that request. ${error.message} Please check that the Python server is running and try again.`
    );
  } finally {
    typing.remove();
    isSending = false;
    sendButton.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(chatInput.value);
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

clearChat.addEventListener("click", () => {
  if (isSending) return;

  conversation.length = 0;
  chatMessages.replaceChildren();

  addMessage(
    "assistant",
    "A new conversation begins. What would you like to explore about Emirati heritage or preserving cultural knowledge through AI?"
  );

  chatInput.focus();
});

/* Initial input focus is intentionally not automatic. */
