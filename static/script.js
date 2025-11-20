// =========================================================================
// JSON API Explorer — frontend logic with presets library and UI bindings
// -------------------------------------------------------------------------
// This script implements the following responsibilities:
//  - Render a left-hand presets library (categories → APIs → click to fill)
//  - Allow searching/filtering of presets
//  - Populate the explorer form (method, url, request body) from presets
//  - Provide request-body Pretty / Raw controls (they operate on the request body)
//  - Send proxied requests to the server's /api endpoint and display responses
//  - Provide mobile-friendly sidebar behavior and small UX niceties
//
// Comments throughout explain both "what" the code does and "why" design
// choices were made (trade-offs, alternatives, and expected behaviors).
// =========================================================================

// -------------------------------------------------------------------------
// Presets collection: organized by category.
// Each preset is a tiny descriptor: name, HTTP method, url and an optional
// request body string. Bodies are stored as strings so we can display them
// verbatim and let the Pretty/Raw controls operate on them.
// -------------------------------------------------------------------------
const PRESETS = {
  Animals: [
    {
      name: "Cat Facts",
      method: "GET",
      url: "https://catfact.ninja/fact",
      body: "",
    },
    {
      name: "Dog CEO (random image)",
      method: "GET",
      url: "https://dog.ceo/api/breeds/image/random",
      body: "",
    },
    {
      name: "Random Fox",
      method: "GET",
      url: "https://randomfox.ca/floof/",
      body: "",
    },
    {
      name: "Random Bird",
      method: "GET",
      url: "https://some-random-api.ml/birds/mallard",
      body: "",
    },
  ],
  Fun: [
    {
      name: "Advice Slip",
      method: "GET",
      url: "https://api.adviceslip.com/advice",
      body: "",
    },
    {
      name: "Chuck Norris Joke",
      method: "GET",
      url: "https://api.chucknorris.io/jokes/random",
      body: "",
    },
    {
      name: "Kanye Rest",
      method: "GET",
      url: "https://api.kanye.rest/",
      body: "",
    },
    {
      name: "Bored API",
      method: "GET",
      url: "https://www.boredapi.com/api/activity",
      body: "",
    },
  ],
  Space: [
    {
      name: "SpaceX Latest Launch",
      method: "GET",
      url: "https://api.spacexdata.com/v4/launches/latest",
      body: "",
    },
    {
      name: "NASA APOD (DEMO_KEY)",
      method: "GET",
      url: "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY",
      body: "",
    },
  ],
  Weather: [
    {
      name: "Open-Meteo (Berlin hourly temp)",
      method: "GET",
      url: "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m",
      body: "",
    },
    {
      name: "Weather (HTTPBin sample)",
      method: "GET",
      url: "https://httpbin.org/get",
      body: "",
    },
  ],
  Crypto: [
    {
      name: "Coindesk BTC Price",
      method: "GET",
      url: "https://api.coindesk.com/v1/bpi/currentprice.json",
      body: "",
    },
    {
      name: "Binance BTCUSDT",
      method: "GET",
      url: "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      body: "",
    },
  ],
  Media: [
    {
      name: "OMDB (example)",
      method: "GET",
      url: "https://www.omdbapi.com/?apikey=demo&t=Inception",
      body: "",
    },
    {
      name: "Random Dog Image (shibe.online)",
      method: "GET",
      url: "https://shibe.online/api/shibes?count=1",
      body: "",
    },
  ],
  Tech: [
    {
      name: "GitHub User (octocat)",
      method: "GET",
      url: "https://api.github.com/users/octocat",
      body: "",
    },
    {
      name: "IPify (your IP)",
      method: "GET",
      url: "https://api.ipify.org?format=json",
      body: "",
    },
  ],
  Utility: [
    {
      name: "HTTPBin UUID",
      method: "GET",
      url: "https://httpbin.org/uuid",
      body: "",
    },
    {
      name: "HTTPBin Anything (POST)",
      method: "POST",
      url: "https://httpbin.org/anything",
      body: '{"hello":"world"}',
    },
    {
      name: "HTTPBin Headers",
      method: "GET",
      url: "https://httpbin.org/headers",
      body: "",
    },
  ],
  Random: [
    {
      name: "Random User",
      method: "GET",
      url: "https://randomuser.me/api/",
      body: "",
    },
    {
      name: "Public APIs list",
      method: "GET",
      url: "https://api.publicapis.org/entries",
      body: "",
    },
    {
      name: "Dog CEO list all",
      method: "GET",
      url: "https://dog.ceo/api/breeds/list/all",
      body: "",
    },
  ],
};

// -------------------------------------------------------------------------
// DOM references: caching DOM nodes improves performance and keeps code tidy.
// These are the primary elements the UI interacts with.
// -------------------------------------------------------------------------
const categoriesEl = document.getElementById("categories");
const categoriesMobileEl = document.getElementById("categoriesMobile");
const apiSearch = document.getElementById("apiSearch");
const apiSearchMobile = document.getElementById("apiSearchMobile");
const methodSelect = document.getElementById("methodSelect");
const urlInput = document.getElementById("urlInput");
const bodyInput = document.getElementById("bodyInput");
const sendBtnMain = document.getElementById("sendBtnMain");
const sendBtnInline = document.getElementById("sendBtnInline");
const responseOutput = document.getElementById("responseOutput");
const presetInfo = document.getElementById("presetInfo");
const examplesEl = document.getElementById("examples");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const loadingIndicator = document.getElementById("loadingIndicator");
const openSidebarBtn = document.getElementById("openSidebar");
const closeSidebarBtn = document.getElementById("closeSidebar");
const mobileSidebar = document.getElementById("mobileSidebar");
const overlay = document.getElementById("overlay");

// -------------------------------------------------------------------------
// Response state holders:
// - We keep both the raw text and a parsed JSON object (if parsing succeeds).
// - This separation is useful because we allow the request body to be
//   manipulated independently of how we present responses.
// -------------------------------------------------------------------------
let responseRawText = "";
let responseJsonObj = null;

// -------------------------------------------------------------------------
// Small helper: create an element with attributes and optional children.
// This is a tiny DOM utility to keep renderCategories concise and readable.
// -------------------------------------------------------------------------
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") e.className = attrs[k];
    else if (k === "text") e.textContent = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  if (!Array.isArray(children)) children = [children];
  children.forEach((c) => {
    if (c) e.appendChild(c);
  });
  return e;
}

// -------------------------------------------------------------------------
// renderCategories builds the collapsible category list into `container`.
// Behavior notes:
// - Each category is collapsed by default to avoid overwhelming the user.
// - Clicking the category header toggles visibility of its APIs.
// - Clicking an API applies its preset to the form.
// -------------------------------------------------------------------------
function renderCategories(container) {
  container.innerHTML = "";
  Object.keys(PRESETS).forEach((cat) => {
    const catWrap = el("div", { class: "border-b pb-2" });

    const header = el("div", {
      class: "flex items-center justify-between cursor-pointer select-none",
    });
    const title = el("div", {
      class: "font-semibold text-sm text-gray-700 dark:text-gray-200",
      text: cat,
    });
    const toggle = el("span", { class: "collapse-toggle text-xs", text: "▸" });
    header.appendChild(title);
    header.appendChild(toggle);

    const list = el("div", { class: "mt-2 space-y-2 hidden" });

    PRESETS[cat].forEach((api) => {
      const item = el("button", {
        class:
          "w-full text-left api-card p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700",
      });
      item.innerHTML = `
        <div class="text-sm font-medium">${api.name}</div>
        <div class="text-xs text-gray-500">${api.method} — ${api.url}</div>
      `;
      item.addEventListener("click", () => applyPreset(api));
      list.appendChild(item);
    });

    // collapse/expand behavior bound to the whole header for better UX
    let open = false;
    header.addEventListener("click", () => {
      open = !open;
      list.classList.toggle("hidden", !open);
      toggle.textContent = open ? "▾" : "▸";
    });

    catWrap.appendChild(header);
    catWrap.appendChild(list);
    container.appendChild(catWrap);
  });
}

// -------------------------------------------------------------------------
// applyPreset populates the form fields with the preset values. It also
// updates the preset info and examples area. The "examples" area shows the
// preset's request body (if present) as a human-friendly snippet.
// -------------------------------------------------------------------------
function applyPreset(api) {
  methodSelect.value = api.method || "GET";
  urlInput.value = api.url || "";
  bodyInput.value = api.body || "";
  presetInfo.textContent = `${api.name} — ${api.method} ${api.url}`;
  examplesEl.innerHTML = "";
  if (api.body) {
    const pre = document.createElement("pre");
    pre.textContent = formatJsonSafe(api.body);
    examplesEl.appendChild(pre);
  }
  // Scroll the main viewport to the top so the user sees the form
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// -------------------------------------------------------------------------
// formatJsonSafe attempts to parse and pretty-print a JSON string. If the
// input is not valid JSON it returns the original string. This is helpful
// when showing examples or when the user pastes pre-formatted JSON.
// -------------------------------------------------------------------------
function formatJsonSafe(s) {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

// -------------------------------------------------------------------------
// searchAndFilter performs an incremental search across categories and API
// entries. It hides categories that contain no matches, improving discoverability.
// Complexity: O(total number of preset entries) per keystroke – acceptable for ~30 items.
// -------------------------------------------------------------------------
function searchAndFilter(q, container) {
  q = q.trim().toLowerCase();
  const cats = container.querySelectorAll("div.border-b");
  cats.forEach((cat) => {
    const title = cat.querySelector("div > div").textContent.toLowerCase();
    const items = cat.querySelectorAll("div.mt-2 > button");
    let any = false;
    items.forEach((btn) => {
      const txt = btn.textContent.toLowerCase();
      const visible =
        q === "" || txt.indexOf(q) !== -1 || title.indexOf(q) !== -1;
      btn.style.display = visible ? "" : "none";
      if (visible) any = true;
    });
    cat.style.display = any ? "" : "none";
  });
}

// -------------------------------------------------------------------------
// sendRequest marshals the current form into a JSON payload and POSTs it
// to /api. The server proxies the request to the target URL and returns the
// upstream response body which we then display to the user.
// -------------------------------------------------------------------------
async function sendRequest() {
  const method = methodSelect.value;
  const url = urlInput.value.trim();
  const body = bodyInput.value.trim();

  if (!url) {
    responseOutput.textContent = "Please enter a URL.";
    return;
  }

  // Show tiny loading indicator — better UX for slow networks
  loadingIndicator.classList.remove("hidden");
  responseOutput.textContent = "";

  const payload = { method, url, body };

  try {
    const resp = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Read body as text — we attempt to parse JSON but must be robust to plain text or HTML
    const text = await resp.text();
    responseRawText = text;
    responseJsonObj = null;

    // Try to parse as JSON; if successful, pretty-print it
    try {
      const parsed = JSON.parse(text);
      responseJsonObj = parsed;
      responseOutput.textContent = JSON.stringify(parsed, null, 2);
    } catch {
      // Non-JSON responses are shown raw
      responseOutput.textContent = text;
    }
  } catch (err) {
    responseOutput.textContent = `Error: ${err.message}`;
  } finally {
    loadingIndicator.classList.add("hidden");
  }
}

// -------------------------------------------------------------------------
// Pretty / Raw buttons behaviour (REQUEST BODY only, per selection B):
// - Pretty: attempt to parse bodyInput as JSON and pretty-print it.
// - Raw: minify the body (remove whitespace) to produce compact JSON.
// Rationale: developers often switch between tidy and compact request bodies.
// -------------------------------------------------------------------------
const prettyBtn = document.getElementById("prettyBtn");
const rawBtn = document.getElementById("rawBtn");

prettyBtn.addEventListener("click", () => {
  const s = bodyInput.value.trim();
  if (!s) return;
  try {
    const parsed = JSON.parse(s);
    bodyInput.value = JSON.stringify(parsed, null, 2);
  } catch (err) {
    // If body is not valid JSON, do nothing — preserve user's content.
    alert("Unable to pretty-format: request body is not valid JSON.");
  }
});

rawBtn.addEventListener("click", () => {
  const s = bodyInput.value.trim();
  if (!s) return;
  try {
    const parsed = JSON.parse(s);
    bodyInput.value = JSON.stringify(parsed); // compact representation
  } catch (err) {
    // If not valid JSON, do nothing.
    alert("Unable to minify: request body is not valid JSON.");
  }
});

// -------------------------------------------------------------------------
// Small UX helpers: copy current request to clipboard, clear form, keyboard
// shortcuts. These improve ergonomics when testing many APIs quickly.
// -------------------------------------------------------------------------
copyBtn.addEventListener("click", () => {
  const data = `${methodSelect.value} ${urlInput.value}\n\n${bodyInput.value}`;
  navigator.clipboard.writeText(data).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1000);
  });
});

clearBtn.addEventListener("click", () => {
  methodSelect.value = "GET";
  urlInput.value = "";
  bodyInput.value = "";
  responseOutput.textContent = "";
  presetInfo.textContent = "Click an API from the left to see details.";
  examplesEl.innerHTML = "";
});

// -------------------------------------------------------------------------
// Wire send buttons and keyboard shortcuts
// - The main "Send" in header and inline mobile "Send" both call sendRequest.
// - Ctrl+Enter in the request body also sends the request: a common developer habit.
// -------------------------------------------------------------------------
sendBtnMain.addEventListener("click", sendRequest);
sendBtnInline.addEventListener("click", sendRequest);
bodyInput.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") sendRequest();
});

// -------------------------------------------------------------------------
// Search bindings: desktop and mobile search inputs update the visible presets.
// -------------------------------------------------------------------------
apiSearch.addEventListener("input", (e) =>
  searchAndFilter(e.target.value, categoriesEl)
);
if (apiSearchMobile)
  apiSearchMobile.addEventListener("input", (e) =>
    searchAndFilter(e.target.value, categoriesMobileEl)
  );

// -------------------------------------------------------------------------
// Render the categories into both desktop and mobile containers.
// This keeps the UI consistent across viewports and avoids duplicating preset data.
// -------------------------------------------------------------------------
renderCategories(categoriesEl);
renderCategories(categoriesMobileEl);

// -------------------------------------------------------------------------
// Mobile sidebar controls: open/close and overlay behavior.
// This is intentionally simple (no heavy animations) to keep the UI snappy.
// -------------------------------------------------------------------------
if (openSidebarBtn) {
  openSidebarBtn.addEventListener("click", () => {
    mobileSidebar.classList.add("open");
    overlay.style.display = "block";
  });
}
if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener("click", () => {
    mobileSidebar.classList.remove("open");
    overlay.style.display = "none";
  });
}
overlay.addEventListener("click", () => {
  mobileSidebar.classList.remove("open");
  overlay.style.display = "none";
});

// -------------------------------------------------------------------------
// Initial sample preset to make the UI feel alive on first load.
// -------------------------------------------------------------------------
applyPreset({
  name: "JSONPlaceholder (sample)",
  method: "GET",
  url: "https://jsonplaceholder.typicode.com/posts/1",
  body: "",
});
