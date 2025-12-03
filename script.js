let PebbleConfig = null;
let TMModel = null;
let uploadedImage = null;
let currentObjectURL = null;

// DOM references
const chatArea = document.getElementById("chatArea");
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const footerInfo = document.getElementById("footer-info");
const imageUpload = document.getElementById("imageUpload");
const inputImage = document.getElementById("input-image");

// Add text message to chat
function addMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = role === "user" ? "user-msg" : "ai-msg";
  msg.textContent = text;
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Add image message to chat
function addImageMessage(role, src, altText = "uploaded image") {
  const msg = document.createElement("div");
  msg.className = role === "user" ? "user-msg" : "ai-msg";

  const img = document.createElement("img");
  img.src = src;
  img.alt = altText;

  msg.appendChild(img);
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
  try {
    const { paths, modelName } = PebbleConfig?.aiModel || {};
    TMModel = await tmImage.load(paths.model, paths.metadata);
    console.log("Model loaded:", modelName);
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
  if (TMModel && uploadedImage) {
    const top = await getTopPrediction(uploadedImage);
    const pct = (top.probability * 100).toFixed(1);
    addMessage("ai", `I think this is ${top.className} (${pct}%)`);
  } else if (!TMModel) {
    addMessage("ai", "Model not ready. Please wait or reload.");
  } else {
    addMessage("ai", "Please upload an image first.");
  }
}

// Wire send button
function wireSend() {
  sendBtn.addEventListener("click", async () => {
    const text = userInput.value.trim();
    if (!text) return;
    addMessage("user", text);
    userInput.value = "";
    await handleAIReply();
  });

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
}

// Wire image upload
function wireUpload() {
  imageUpload.addEventListener("change", () => {
    const file = imageUpload.files?.[0];
    if (!file) return;

    if (currentObjectURL) {
      URL.revokeObjectURL(currentObjectURL);
      currentObjectURL = null;
    }

    const objectURL = URL.createObjectURL(file);
    currentObjectURL = objectURL;

    inputImage.onload = () => {
      uploadedImage = inputImage;
      addImageMessage("user", objectURL, file.name);
      addMessage("ai", "Image uploaded. Ready to classify!");
      // Optional: auto classify immediately
      // handleAIReply();
    };

    inputImage.src = objectURL;
    inputImage.alt = file.name;
  });
}

// Init
window.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  await loadModel();
  wireSend();
  wireUpload();
});
