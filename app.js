const STORAGE_KEY = "companyInventoryApp.v1";

function createId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const demoItems = [
  {
    id: createId(),
    name: "Dell Latitude Laptops",
    category: "IT Equipment",
    quantity: 14,
    threshold: 5,
    unitValue: 780,
    location: "Head Office",
    custodian: "IT Department",
    condition: "Good",
    status: "In Stock",
    purchaseDate: "2025-09-18",
    notes: "Tagged and ready for assignment.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: createId(),
    name: "Office Chairs",
    category: "Furniture",
    quantity: 3,
    threshold: 6,
    unitValue: 95,
    location: "Store Room",
    custodian: "Admin",
    condition: "Fair",
    status: "In Stock",
    purchaseDate: "2024-11-06",
    notes: "Order more before onboarding.",
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: createId(),
    name: "HP LaserJet Printer",
    category: "Office Equipment",
    quantity: 1,
    threshold: 1,
    unitValue: 420,
    location: "Finance Office",
    custodian: "Finance",
    condition: "Needs Repair",
    status: "Maintenance",
    purchaseDate: "2023-05-21",
    notes: "Paper feed issue reported.",
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: createId(),
    name: "Safety Helmets",
    category: "Safety Gear",
    quantity: 0,
    threshold: 10,
    unitValue: 18,
    location: "Site Store",
    custodian: "Operations",
    condition: "Good",
    status: "Out of Stock",
    purchaseDate: "2025-01-09",
    notes: "Restock required for field work.",
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

const state = {
  items: [],
  settings: {
    companyName: "Company Inventory",
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
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    state.items = demoItems;
    saveState();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    state.items = Array.isArray(parsed.items) ? parsed.items : demoItems;
    state.settings = { ...state.settings, ...(parsed.settings || {}) };
  } catch {
    state.items = demoItems;
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

function handleTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = state.items.find((entry) => entry.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit") {
    openItemDialog(item);
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
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
  els.table.addEventListener("click", handleTableClick);

  els.companyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings.companyName = els.companyName.value.trim() || "Company Inventory";
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
    if (!confirm("Replace current records with the original demo data?")) return;
    state.items = demoItems.map((item) => ({ ...item, id: createId(), updatedAt: new Date().toISOString() }));
    saveState();
    renderAll();
  });
}

loadState();
bindEvents();
renderAll();
