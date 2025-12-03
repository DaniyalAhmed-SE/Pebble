let PebbleConfig = null;
let TMModel = null;

// DOM references
const chatArea = document.getElementById("chatArea");
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const footerInfo = document.getElementById("footer-info");

// Add message to chat
function addMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = role === "user" ? "user-msg" : "ai-msg";
  msg.textContent = text;
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Load config
async function loadConfig() {
  try {
    const res = await fetch("pebble.json");
    PebbleConfig = await res.json();
    if (footerInfo && PebbleConfig?.project) {
      const { name, version, license } = PebbleConfig.project;
      footerInfo.textContent = `${name} v${version} — ${license} License`;
    }
  } catch (e) {
    console.error("Failed to load pebble.json", e);
    if (footerInfo) footerInfo.textContent = "Config load failed";
  }
}

// Load Teachable Machine model
async function loadModel() {
  if (!PebbleConfig?.aiModel?.paths) return;
  const { model, metadata } = PebbleConfig.aiModel.paths;
  try {
    TMModel = await tmImage.load(model, metadata);
    console.log("Model loaded:", PebbleConfig.aiModel.modelName);
  } catch (e) {
    console.error("Failed to load model", e);
    addMessage("ai", "Model failed to load.");
  }
}

// Predict top class
async function getTopPrediction(inputEl) {
  if (!TMModel) return { className: "Model not ready", probability: 0 };
  const preds = await TMModel.predict(inputEl);
  preds.sort((a, b) => b.probability - a.probability);
  return preds[0];
}

// Handle AI reply
async function handleAIReply() {
  const img = document.getElementById("input-image");
  if (TMModel && img) {
    const top = await getTopPrediction(img);
    addMessage("ai", `I think this is ${top.className} (${(top.probability * 100).toFixed(1)}%)`);
  } else {
    addMessage("ai", "Pebble: AI reply not ready yet.");
  }
}

// Wire send button
function wireSend() {
  sendBtn.addEventListener("click", async () => {
    const text = userInput.value.trim();
    if (!text) return;
    addMessage("user", text);
    userInput.value = "";
    chatArea.scrollTop = chatArea.scrollHeight;

    // AI reply
    await handleAIReply();
  });

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
}

// Init
window.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  await loadModel();
  wireSend();
});
