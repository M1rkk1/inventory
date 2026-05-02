const STORAGE_KEY = "gammaInventory.v1";
const AUTH_KEY = "gammaInventory.auth.v1";
const SESSION_KEY = "gammaInventory.session";

function createId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const initialItems = [];

const state = {
  items: [],
  settings: {
    companyName: "Gamma Inventory",
    currency: "$",
  },
  filters: {
    search: "",
    category: "all",
    status: "all",
  },
};

const els = {
  pageTitle: document.querySelector("#pageTitle"),
  views: document.querySelectorAll(".view"),
  navItems: document.querySelectorAll(".nav-item"),
  search: document.querySelector("#globalSearch"),
  categoryFilter: document.querySelector("#categoryFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  table: document.querySelector("#inventoryTable"),
  addItemBtn: document.querySelector("#addItemBtn"),
  dialog: document.querySelector("#itemDialog"),
  form: document.querySelector("#itemForm"),
  modalTitle: document.querySelector("#modalTitle"),
  closeModalBtn: document.querySelector("#closeModalBtn"),
  cancelBtn: document.querySelector("#cancelBtn"),
  sellDialog: document.querySelector("#sellDialog"),
  sellForm: document.querySelector("#sellForm"),
  sellItemId: document.querySelector("#sellItemId"),
  sellItemName: document.querySelector("#sellItemName"),
  sellItemDetails: document.querySelector("#sellItemDetails"),
  sellQuantity: document.querySelector("#sellQuantity"),
  sellNote: document.querySelector("#sellNote"),
  sellMessage: document.querySelector("#sellMessage"),
  closeSellModalBtn: document.querySelector("#closeSellModalBtn"),
  cancelSellBtn: document.querySelector("#cancelSellBtn"),
  totalItems: document.querySelector("#totalItems"),
  totalQuantity: document.querySelector("#totalQuantity"),
  lowStockCount: document.querySelector("#lowStockCount"),
  stockValue: document.querySelector("#stockValue"),
  attentionList: document.querySelector("#attentionList"),
  activityList: document.querySelector("#activityList"),
  categoryReport: document.querySelector("#categoryReport"),
  locationReport: document.querySelector("#locationReport"),
  companyForm: document.querySelector("#companyForm"),
  companyName: document.querySelector("#companyName"),
  currencyInput: document.querySelector("#currencyInput"),
  exportBtn: document.querySelector("#exportBtn"),
  exportSettingsBtn: document.querySelector("#exportSettingsBtn"),
  importFile: document.querySelector("#importFile"),
  resetBtn: document.querySelector("#resetBtn"),
  categorySuggestions: document.querySelector("#categorySuggestions"),
  authForm: document.querySelector("#authForm"),
  authTitle: document.querySelector("#authTitle"),
  authMode: document.querySelector("#authMode"),
  authCopy: document.querySelector("#authCopy"),
  authMessage: document.querySelector("#authMessage"),
  authSubmit: document.querySelector("#authSubmit"),
  passcodeInput: document.querySelector("#passcodeInput"),
  confirmPasscodeWrap: document.querySelector("#confirmPasscodeWrap"),
  confirmPasscodeInput: document.querySelector("#confirmPasscodeInput"),
  lockBtn: document.querySelector("#lockBtn"),
  chatToggle: document.querySelector("#chatToggle"),
  chatPanel: document.querySelector("#chatPanel"),
  closeChatBtn: document.querySelector("#closeChatBtn"),
  chatMessages: document.querySelector("#chatMessages"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
};

function isSetupMode() {
  return !localStorage.getItem(AUTH_KEY);
}

function encodeText(value) {
  return new TextEncoder().encode(value);
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fallbackHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fallback-${(hash >>> 0).toString(16)}`;
}

async function hashPasscode(passcode, salt) {
  if (!window.crypto?.subtle) return fallbackHash(`${salt}:${passcode}`);

  const key = await crypto.subtle.importKey("raw", encodeText(passcode), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encodeText(salt),
      iterations: 120000,
      hash: "SHA-256",
    },
    key,
    256
  );
  return toHex(bits);
}

function createSalt() {
  if (!window.crypto?.getRandomValues) return createId();
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  return toHex(values);
}

function updateAuthMode() {
  const setup = isSetupMode();
  els.authMode.textContent = setup ? "Create Admin Access" : "Secure Access";
  els.authTitle.textContent = setup ? "Create your passcode" : "Sign in to continue";
  els.authCopy.textContent = setup
    ? "Create an admin passcode for this device. Use at least 6 characters."
    : "Enter the admin passcode for this device.";
  els.authSubmit.innerHTML = setup
    ? `<span class="icon" data-icon="shield-check"></span>Create Passcode`
    : `<span class="icon" data-icon="lock-keyhole"></span>Unlock`;
  els.confirmPasscodeWrap.hidden = !setup;
  els.confirmPasscodeInput.required = setup;
  els.passcodeInput.autocomplete = setup ? "new-password" : "current-password";
  renderIcons();
}

function unlockApp() {
  sessionStorage.setItem(SESSION_KEY, "unlocked");
  document.body.classList.remove("locked");
  document.body.classList.add("unlocked");
  els.passcodeInput.value = "";
  els.confirmPasscodeInput.value = "";
  els.authMessage.textContent = "";
  renderAll();
}

function lockApp() {
  sessionStorage.removeItem(SESSION_KEY);
  document.body.classList.add("locked");
  document.body.classList.remove("unlocked");
  updateAuthMode();
  els.passcodeInput.focus();
}

async function handleAuth(event) {
  event.preventDefault();
  const passcode = els.passcodeInput.value;
  const confirmation = els.confirmPasscodeInput.value;

  if (passcode.length < 6) {
    els.authMessage.textContent = "Use at least 6 characters.";
    return;
  }

  if (isSetupMode()) {
    if (passcode !== confirmation) {
      els.authMessage.textContent = "Passcodes do not match.";
      return;
    }

    const salt = createSalt();
    const hash = await hashPasscode(passcode, salt);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ salt, hash, createdAt: new Date().toISOString() }));
    unlockApp();
    return;
  }

  const auth = JSON.parse(localStorage.getItem(AUTH_KEY));
  const hash = await hashPasscode(passcode, auth.salt);
  if (hash !== auth.hash) {
    els.authMessage.textContent = "That passcode is not correct.";
    return;
  }

  unlockApp();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    state.items = initialItems;
    saveState();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    state.items = Array.isArray(parsed.items) ? parsed.items : initialItems;
    state.settings = { ...state.settings, ...(parsed.settings || {}) };
  } catch {
    state.items = initialItems;
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      items: state.items,
      settings: state.settings,
    })
  );
}

function formatMoney(value) {
  return `${state.settings.currency || "$"}${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function derivedStatus(item) {
  if (item.quantity === 0) return "Out of Stock";
  if (item.quantity <= item.threshold) return "Low Stock";
  return item.status || "In Stock";
}

function getFilteredItems() {
  const query = state.filters.search.trim().toLowerCase();
  return state.items.filter((item) => {
    const status = derivedStatus(item);
    const matchesSearch = [
      item.name,
      item.category,
      item.location,
      item.custodian,
      item.condition,
      item.notes,
      status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);

    const matchesCategory = state.filters.category === "all" || item.category === state.filters.category;
    const matchesStatus = state.filters.status === "all" || status === state.filters.status || item.status === state.filters.status;

    return matchesSearch && matchesCategory && matchesStatus;
  });
}

function statusClass(status) {
  if (status === "Out of Stock" || status === "Maintenance") return "danger";
  if (status === "Low Stock") return "warn";
  return "";
}

function renderIcons() {
  if (window.lucide) {
    document.querySelectorAll("[data-icon]").forEach((icon) => {
      icon.setAttribute("data-lucide", icon.dataset.icon);
    });
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2,
      },
    });
  }
}

function renderFilters() {
  const categories = [...new Set(state.items.map((item) => item.category).filter(Boolean))].sort();
  els.categoryFilter.innerHTML = `<option value="all">All categories</option>`;
  els.categorySuggestions.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.append(option);

    const suggestion = document.createElement("option");
    suggestion.value = category;
    els.categorySuggestions.append(suggestion);
  });

  els.categoryFilter.value = state.filters.category;
}

function renderTable() {
  const items = getFilteredItems();
  els.table.innerHTML = "";

  if (!items.length) {
    const empty = document.querySelector("#emptyStateTemplate").content.cloneNode(true);
    els.table.append(empty);
    renderIcons();
    return;
  }

  items.forEach((item) => {
    const status = derivedStatus(item);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Item">
        <div class="item-title">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.condition || "Good")} condition</span>
        </div>
      </td>
      <td data-label="Category">${escapeHtml(item.category)}</td>
      <td data-label="Qty">${Number(item.quantity).toLocaleString()}</td>
      <td data-label="Location">${escapeHtml(item.location || "Unassigned")}</td>
      <td data-label="Custodian">${escapeHtml(item.custodian || "Unassigned")}</td>
      <td data-label="Status"><span class="badge ${statusClass(status)}">${status}</span></td>
      <td data-label="Value">${formatMoney(item.quantity * item.unitValue)}</td>
      <td data-label="Actions">
        <div class="row-actions">
          <button class="icon-button" type="button" data-action="sell" data-id="${item.id}" aria-label="Sell ${escapeHtml(item.name)}" ${item.quantity <= 0 ? "disabled" : ""}>
            <span class="icon" data-icon="shopping-cart"></span>
          </button>
          <button class="icon-button" type="button" data-action="edit" data-id="${item.id}" aria-label="Edit ${escapeHtml(item.name)}">
            <span class="icon" data-icon="pencil"></span>
          </button>
          <button class="icon-button" type="button" data-action="duplicate" data-id="${item.id}" aria-label="Duplicate ${escapeHtml(item.name)}">
            <span class="icon" data-icon="copy"></span>
          </button>
          <button class="icon-button" type="button" data-action="delete" data-id="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">
            <span class="icon" data-icon="trash-2"></span>
          </button>
        </div>
      </td>
    `;
    els.table.append(row);
  });

  renderIcons();
}

function renderStats() {
  if (!state.items.length) {
    els.totalItems.textContent = "Ready";
    els.totalQuantity.textContent = "Add stock";
    els.lowStockCount.textContent = "Clear";
    els.stockValue.textContent = "No value";
    return;
  }

  const totalQuantity = state.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalValue = state.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitValue || 0), 0);
  const lowStock = state.items.filter((item) => ["Low Stock", "Out of Stock"].includes(derivedStatus(item))).length;

  els.totalItems.textContent = state.items.length.toLocaleString();
  els.totalQuantity.textContent = totalQuantity.toLocaleString();
  els.lowStockCount.textContent = lowStock.toLocaleString();
  els.stockValue.textContent = formatMoney(totalValue);
}

function renderAttention() {
  const attention = state.items
    .filter((item) => ["Low Stock", "Out of Stock", "Maintenance"].includes(derivedStatus(item)) || item.status === "Maintenance")
    .slice(0, 5);

  els.attentionList.innerHTML = attention.length
    ? ""
    : `<div class="empty-state"><span class="icon" data-icon="circle-check"></span><strong>Everything looks steady</strong><p>No low-stock or maintenance items.</p></div>`;

  attention.forEach((item) => {
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `
      <strong>${escapeHtml(item.name)} <span class="badge ${statusClass(derivedStatus(item))}">${derivedStatus(item)}</span></strong>
      <span>${Number(item.quantity).toLocaleString()} on hand · ${escapeHtml(item.location || "No location")}</span>
    `;
    els.attentionList.append(node);
  });
}

function renderActivity() {
  const activity = [...state.items]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6);

  els.activityList.innerHTML = activity.length
    ? ""
    : `<div class="empty-state"><span class="icon" data-icon="history"></span><strong>No activity yet</strong><p>Saved item changes will appear here.</p></div>`;

  activity.forEach((item) => {
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `
      <strong>${escapeHtml(item.name)} <span>${new Date(item.updatedAt).toLocaleDateString()}</span></strong>
      <span>${escapeHtml(item.category)} · ${derivedStatus(item)}</span>
    `;
    els.activityList.append(node);
  });
}

function groupBy(field) {
  return state.items.reduce((map, item) => {
    const key = item[field] || "Unassigned";
    map[key] = (map[key] || 0) + Number(item.quantity || 0);
    return map;
  }, {});
}

function renderBars(container, data) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  container.innerHTML = entries.length
    ? ""
    : `<div class="empty-state"><span class="icon" data-icon="chart-no-axes-column"></span><strong>No records</strong><p>Add inventory to build a report.</p></div>`;

  entries.forEach(([label, value]) => {
    const node = document.createElement("div");
    node.className = "bar-row";
    node.innerHTML = `
      <strong>${escapeHtml(label)} <span>${Number(value).toLocaleString()}</span></strong>
      <div class="bar-track"><div class="bar-fill" style="width: ${(value / max) * 100}%"></div></div>
    `;
    container.append(node);
  });
}

function renderReports() {
  renderBars(els.categoryReport, groupBy("category"));
  renderBars(els.locationReport, groupBy("location"));
}

function renderSettings() {
  els.companyName.value = state.settings.companyName;
  els.currencyInput.value = state.settings.currency;
  document.title = state.settings.companyName;
  document.querySelector(".brand strong").textContent = state.settings.companyName;
}

function renderAll() {
  renderFilters();
  renderStats();
  renderTable();
  renderAttention();
  renderActivity();
  renderReports();
  renderSettings();
  renderIcons();
}

function openItemDialog(item = null) {
  els.form.reset();
  els.modalTitle.textContent = item ? "Edit Item" : "Add Item";
  document.querySelector("#itemId").value = item?.id || "";
  document.querySelector("#itemName").value = item?.name || "";
  document.querySelector("#itemCategory").value = item?.category || "";
  document.querySelector("#itemQuantity").value = item?.quantity ?? 1;
  document.querySelector("#itemThreshold").value = item?.threshold ?? 1;
  document.querySelector("#itemValue").value = item?.unitValue ?? 0;
  document.querySelector("#purchaseDate").value = item?.purchaseDate || "";
  document.querySelector("#itemLocation").value = item?.location || "";
  document.querySelector("#itemCustodian").value = item?.custodian || "";
  document.querySelector("#itemCondition").value = item?.condition || "Good";
  document.querySelector("#itemStatus").value = item?.status || "In Stock";
  document.querySelector("#itemNotes").value = item?.notes || "";
  els.dialog.showModal();
}

function openSellDialog(item) {
  els.sellForm.reset();
  els.sellMessage.textContent = "";
  els.sellItemId.value = item.id;
  els.sellItemName.textContent = item.name;
  els.sellItemDetails.textContent = `${Number(item.quantity).toLocaleString()} available - ${formatMoney(item.unitValue)} each`;
  els.sellQuantity.max = String(item.quantity);
  els.sellQuantity.value = item.quantity > 0 ? 1 : 0;
  els.sellDialog.showModal();
}

function saveItem(event) {
  event.preventDefault();
  const id = document.querySelector("#itemId").value || createId();
  const existing = state.items.find((item) => item.id === id);
  const next = {
    id,
    name: document.querySelector("#itemName").value.trim(),
    category: document.querySelector("#itemCategory").value.trim(),
    quantity: Number(document.querySelector("#itemQuantity").value || 0),
    threshold: Number(document.querySelector("#itemThreshold").value || 0),
    unitValue: Number(document.querySelector("#itemValue").value || 0),
    purchaseDate: document.querySelector("#purchaseDate").value,
    location: document.querySelector("#itemLocation").value.trim(),
    custodian: document.querySelector("#itemCustodian").value.trim(),
    condition: document.querySelector("#itemCondition").value,
    status: document.querySelector("#itemStatus").value,
    notes: document.querySelector("#itemNotes").value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    state.items.unshift(next);
  }

  saveState();
  renderAll();
  els.dialog.close();
}

function recordSale(event) {
  event.preventDefault();
  const item = state.items.find((entry) => entry.id === els.sellItemId.value);
  if (!item) return;

  const quantitySold = Number(els.sellQuantity.value || 0);
  if (!Number.isInteger(quantitySold) || quantitySold < 1) {
    els.sellMessage.textContent = "Enter a whole number of items sold.";
    return;
  }

  if (quantitySold > item.quantity) {
    els.sellMessage.textContent = `Only ${Number(item.quantity).toLocaleString()} available.`;
    return;
  }

  item.quantity -= quantitySold;
  item.sales = [
    ...(Array.isArray(item.sales) ? item.sales : []),
    {
      id: createId(),
      quantity: quantitySold,
      unitValue: Number(item.unitValue || 0),
      totalValue: quantitySold * Number(item.unitValue || 0),
      note: els.sellNote.value.trim(),
      soldAt: new Date().toISOString(),
    },
  ];
  item.updatedAt = new Date().toISOString();
  if (item.quantity === 0) {
    item.status = "Out of Stock";
  }

  saveState();
  renderAll();
  els.sellDialog.close();
}

function handleTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = state.items.find((entry) => entry.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit") {
    openItemDialog(item);
  }

  if (button.dataset.action === "sell") {
    openSellDialog(item);
  }

  if (button.dataset.action === "duplicate") {
    state.items.unshift({
      ...item,
      id: createId(),
      name: `${item.name} Copy`,
      updatedAt: new Date().toISOString(),
    });
    saveState();
    renderAll();
  }

  if (button.dataset.action === "delete" && confirm(`Delete ${item.name}?`)) {
    state.items = state.items.filter((entry) => entry.id !== item.id);
    saveState();
    renderAll();
  }
}

function switchView(viewName) {
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  els.pageTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
}

function exportData() {
  const payload = JSON.stringify({ items: state.items, settings: state.settings }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `inventory-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.items)) throw new Error("Missing items");
      state.items = parsed.items;
      state.settings = { ...state.settings, ...(parsed.settings || {}) };
      saveState();
      renderAll();
      alert("Inventory data imported successfully.");
    } catch {
      alert("That file could not be imported. Please choose a valid inventory backup.");
    }
  };
  reader.readAsText(file);
}

function addChatMessage(role, text) {
  const message = document.createElement("div");
  message.className = `chat-message ${role}`;
  message.textContent = text;
  els.chatMessages.append(message);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function inventorySummary() {
  const totalItems = state.items.length;
  const totalQuantity = state.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalValue = state.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitValue || 0), 0);
  const lowStock = state.items.filter((item) => ["Low Stock", "Out of Stock"].includes(derivedStatus(item)));
  const maintenance = state.items.filter((item) => item.status === "Maintenance" || derivedStatus(item) === "Maintenance");
  const sales = state.items.flatMap((item) =>
    (Array.isArray(item.sales) ? item.sales : []).map((sale) => ({
      ...sale,
      itemName: item.name,
    }))
  );
  const soldQuantity = sales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
  const soldValue = sales.reduce((sum, sale) => sum + Number(sale.totalValue || 0), 0);
  return { totalItems, totalQuantity, totalValue, lowStock, maintenance, sales, soldQuantity, soldValue };
}

function answerLocally(question) {
  const text = question.toLowerCase();
  const summary = inventorySummary();

  if (!state.items.length) {
    if (text.includes("add") || text.includes("item") || text.includes("start")) {
      return "Start by clicking Add Item, then enter the item name, category, quantity, location, custodian, and low-stock alert. I will begin summarizing your records once items are saved.";
    }
    return "Gamma Inventory is ready, but there are no saved records yet. Add your first item and I can help with stock summaries, low-stock checks, locations, categories, and audit prep.";
  }

  if (text.includes("low") || text.includes("out of stock") || text.includes("attention")) {
    if (!summary.lowStock.length) return "No saved items are currently low or out of stock.";
    return `Items needing stock attention: ${summary.lowStock.map((item) => `${item.name} (${derivedStatus(item)}, ${item.quantity} left)`).join("; ")}.`;
  }

  if (text.includes("maintenance") || text.includes("repair")) {
    if (!summary.maintenance.length) return "No saved items are currently marked for maintenance.";
    return `Maintenance items: ${summary.maintenance.map((item) => `${item.name} at ${item.location || "no location"}`).join("; ")}.`;
  }

  if (text.includes("total") || text.includes("summary") || text.includes("value")) {
    return `Current summary: ${summary.totalItems} item records, ${summary.totalQuantity} total units, and ${formatMoney(summary.totalValue)} in recorded stock value.`;
  }

  if (text.includes("sale") || text.includes("sold") || text.includes("sell")) {
    if (!summary.sales.length) return "No sales have been recorded yet. Use the cart button on an item row to record a sale.";
    const recentSales = summary.sales
      .sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt))
      .slice(0, 5)
      .map((sale) => `${sale.itemName}: ${sale.quantity} sold for ${formatMoney(sale.totalValue)}`)
      .join("; ");
    return `Sales summary: ${summary.soldQuantity} units sold, worth ${formatMoney(summary.soldValue)}. Recent sales: ${recentSales}.`;
  }

  if (text.includes("category")) {
    const grouped = groupBy("category");
    return `Category quantities: ${Object.entries(grouped)
      .map(([category, quantity]) => `${category}: ${quantity}`)
      .join("; ")}.`;
  }

  if (text.includes("location") || text.includes("where")) {
    const grouped = groupBy("location");
    return `Location quantities: ${Object.entries(grouped)
      .map(([location, quantity]) => `${location}: ${quantity}`)
      .join("; ")}.`;
  }

  if (text.includes("export") || text.includes("backup")) {
    return "Use Export to download a JSON backup of the inventory. Keep backups somewhere safe before clearing records or moving devices.";
  }

  if (text.includes("search") || text.includes("find")) {
    return "Use the search box at the top to find items by name, category, location, custodian, condition, status, or notes.";
  }

  return "I can help with low stock, maintenance items, category totals, location totals, stock value, backups, and how to use the app. Try asking: what needs attention?";
}

async function askGammaAI(question) {
  const endpoint = window.GAMMA_AI_ENDPOINT;
  if (!endpoint) return answerLocally(question);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        inventory: state.items,
        settings: state.settings,
      }),
    });

    if (!response.ok) throw new Error("AI endpoint failed");
    const data = await response.json();
    return data.answer || answerLocally(question);
  } catch {
    return `${answerLocally(question)} The external AI service is not reachable, so I answered from the saved inventory data.`;
  }
}

function toggleChat(open = els.chatPanel.hidden) {
  els.chatPanel.hidden = !open;
  els.chatToggle.setAttribute("aria-expanded", String(open));
  if (open && !els.chatMessages.children.length) {
    addChatMessage("assistant", "Hi, I am Gamma AI. Ask me about stock, low inventory, maintenance, categories, locations, backups, or app steps.");
  }
  if (open) els.chatInput.focus();
}

function registerServiceWorker() {
  const canRegister = "serviceWorker" in navigator && ["http:", "https:"].includes(window.location.protocol);
  if (!canRegister) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      console.info("Gamma Inventory service worker registration was skipped.");
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  els.authForm.addEventListener("submit", handleAuth);
  els.lockBtn.addEventListener("click", lockApp);
  els.navItems.forEach((item) => item.addEventListener("click", () => switchView(item.dataset.view)));
  document.querySelectorAll("[data-view-shortcut]").forEach((item) => {
    item.addEventListener("click", () => switchView(item.dataset.viewShortcut));
  });

  els.search.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    renderTable();
  });

  els.categoryFilter.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    renderTable();
  });

  els.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    renderTable();
  });

  els.addItemBtn.addEventListener("click", () => openItemDialog());
  els.closeModalBtn.addEventListener("click", () => els.dialog.close());
  els.cancelBtn.addEventListener("click", () => els.dialog.close());
  els.form.addEventListener("submit", saveItem);
  els.closeSellModalBtn.addEventListener("click", () => els.sellDialog.close());
  els.cancelSellBtn.addEventListener("click", () => els.sellDialog.close());
  els.sellForm.addEventListener("submit", recordSale);
  els.table.addEventListener("click", handleTableClick);

  els.companyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings.companyName = els.companyName.value.trim() || "Gamma Inventory";
    state.settings.currency = els.currencyInput.value.trim() || "$";
    saveState();
    renderAll();
  });

  els.exportBtn.addEventListener("click", exportData);
  els.exportSettingsBtn.addEventListener("click", exportData);
  els.importFile.addEventListener("change", (event) => {
    if (event.target.files[0]) importData(event.target.files[0]);
    event.target.value = "";
  });

  els.resetBtn.addEventListener("click", () => {
    if (!confirm("Clear all inventory records from this browser? Export a backup first if you need to keep them.")) return;
    state.items = [];
    saveState();
    renderAll();
  });

  els.chatToggle.addEventListener("click", () => toggleChat());
  els.closeChatBtn.addEventListener("click", () => toggleChat(false));
  els.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.chatInput.value.trim();
    if (!question) return;
    els.chatInput.value = "";
    addChatMessage("user", question);
    addChatMessage("assistant", await askGammaAI(question));
  });
}

loadState();
bindEvents();
registerServiceWorker();
updateAuthMode();
if (sessionStorage.getItem(SESSION_KEY) === "unlocked") {
  unlockApp();
} else {
  renderIcons();
  els.passcodeInput.focus();
}
