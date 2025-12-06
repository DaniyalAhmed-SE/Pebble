// ===== State =====
let PebbleConfig = null;
let TMModel = null;
let uploadedImage = null;
let currentObjectURL = null;

// ===== DOM =====
const chatArea    = document.getElementById("chatArea");
const sendBtn     = document.getElementById("sendBtn");
const userInput   = document.getElementById("userInput");
const footerInfo  = document.getElementById("footer-info");
const imageUpload = document.getElementById("imageUpload");
const inputImage  = document.getElementById("input-image");

// ===== Utilities =====
function addMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = role === "user" ? "user-msg" : "ai-msg";
  msg.textContent = text;
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;
}

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

// ===== Config & Model =====
async function loadConfig() {
  try {
    const res = await fetch("pebble.json");
    PebbleConfig = await res.json();
    const { name, version, license } = PebbleConfig.project || {};
    if (name && version && license) {
      footerInfo.textContent = `${name} v${version} — ${license} License`;
      const v = document.getElementById("versionText");
      if (v) v.textContent = `Version ${version}`;
    }
  } catch {
    footerInfo.textContent = "Config load failed";
  }
}

async function loadModel() {
  try {
    const paths = PebbleConfig?.aiModel?.paths;
    if (!paths) throw new Error("No model paths");
    if (typeof tmImage === "undefined") throw new Error("tmImage not available");
    TMModel = await tmImage.load(paths.model, paths.metadata);
  } catch (e) {
    addMessage("ai", "Model failed to load.");
  }
}

// ===== Inference =====
async function getTopPrediction(inputEl) {
  if (!TMModel) return { className: "Model not ready", probability: 0 };
  const preds = await TMModel.predict(inputEl);
  preds.sort((a, b) => b.probability - a.probability);
  return preds[0];
}

async function handleAIReply() {
  if (TMModel && uploadedImage) {
    const top = await getTopPrediction(uploadedImage);
    const pct = (top.probability * 100).toFixed(1);
    addMessage("ai", `I think this is ${top.className} (${pct}%)`);
  } else if (!uploadedImage) {
    addMessage("ai", "Please upload an image first.");
  } else {
    addMessage("ai", "Model not ready. Try reloading.");
  }
}

// ===== Input behavior =====
function clearOnLoad() {
  userInput.value = "";
  userInput.style.height = "auto";
}

function wireAutoExpand() {
  const max = Math.max(window.innerHeight * 0.5, 200); // cap at ~50vh
  const expand = () => {
    userInput.style.height = "auto";
    const target = Math.min(userInput.scrollHeight, max);
    userInput.style.height = target + "px";
  };
  userInput.addEventListener("input", expand);
  expand(); // initialize
}

function wireSend() {
  sendBtn.addEventListener("click", async () => {
    const text = userInput.value.trim();
    if (!text) return;
    addMessage("user", text);
    userInput.value = "";
    userInput.style.height = "auto";
    if (uploadedImage) await handleAIReply();
  });

  // Enter sends; Shift+Enter newline
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) return;      // allow newline
      e.preventDefault();          // block newline
      sendBtn.click();             // send
    }
  });
}

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
      // Optionally: handleAIReply();
    };

    inputImage.src = objectURL;
    inputImage.alt = file.name;
  });
}

// ===== Init =====
window.addEventListener("DOMContentLoaded", async () => {
  clearOnLoad();
  wireAutoExpand();
  wireSend();
  wireUpload();
  await loadConfig();
  await loadModel();
});
