// ============================================================
// RBD Application - Reliability Block Diagram Editor
// Architecture: Vanilla JS, in-memory state, render-from-state
// Pattern: Matches hfa-bowtie and hfa-hta applications
// ============================================================

// STATE MANAGEMENT
// ============================================================

let state = {
  version: 1,
  meta: {
    title: "RBD Diagram",
    theme: "light",
    seq: { component: 0 }
  },
  components: [],
  connections: [],
  computed: {
    systemReliability: 1.0,
    criticalPath: []
  }
};

// Transient UI state (not persisted)
const ui = {
  selectedIds: new Set(),
  editSession: null
};

// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  wireEventListeners();
  render(state);
});

// COMPONENT OPERATIONS
// ============================================================

function addComponent(name, description = "") {
  const id = generateComponentId();
  const component = {
    id,
    name: name.trim() || "Unnamed",
    description,
    type: "node",
    reliability: {
      failureRate: 0.001,
      availability: 0.999,
      confidence: 0.8
    },
    row: state.components.length + 1,
    col: 1,
    domId: `comp-${state.meta.seq.component++}-${id}`
  };

  commit(s => s.components.push(component));
  ui.selectedIds.clear();
  ui.selectedIds.add(id);
  render(state);
}

function deleteComponent(componentId) {
  commit(s => {
    s.components = s.components.filter(c => c.id !== componentId);
    s.connections = s.connections.filter(
      conn => conn.fromComponentId !== componentId && conn.toComponentId !== componentId
    );
  });
  ui.selectedIds.delete(componentId);
}

function updateComponentField(componentId, fieldPath, value) {
  commit(s => {
    const comp = s.components.find(c => c.id === componentId);
    if (!comp) return;

    const keys = fieldPath.split(".");
    let obj = comp;

    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }

    const lastKey = keys[keys.length - 1];
    const numValue = parseFloat(value);

    // Validation
    if (isNaN(numValue)) {
      throw new Error("Invalid number");
    }

    if (fieldPath.includes("availability")) {
      if (numValue < 0 || numValue > 100) {
        throw new Error("Availability must be between 0 and 100 (%)");
      }
      obj[lastKey] = numValue / 100; // Store as decimal
    } else if (fieldPath.includes("failureRate")) {
      if (numValue < 0) {
        throw new Error("Failure rate cannot be negative");
      }
      obj[lastKey] = numValue;
    } else if (fieldPath.includes("confidence")) {
      if (numValue < 0 || numValue > 100) {
        throw new Error("Confidence must be between 0 and 100 (%)");
      }
      obj[lastKey] = numValue;
    } else {
      obj[lastKey] = numValue;
    }
  });
}

function generateComponentId() {
  const used = new Set(state.components.map(c => c.id));
  const candidates = ["B1", "B2", "B3", "B4", "B5", "A", "C1", "C2", "C3"];

  for (const cand of candidates) {
    if (!used.has(cand)) return cand;
  }

  // Fallback: generate incremental ID
  let counter = state.components.length + 1;
  while (used.has(`C${counter}`)) counter++;
  return `C${counter}`;
}

// STATE VALIDATION & CALCULATION
// ============================================================

function validateState(s) {
  const errors = [];

  s.components.forEach((comp, idx) => {
    if (!comp.id) errors.push(`Component ${idx}: missing id`);
    if (!comp.name) errors.push(`Component ${idx}: missing name`);

    const rel = comp.reliability;
    if (rel.failureRate < 0) {
      errors.push(`${comp.id}: failure rate cannot be negative`);
    }
    if (rel.availability < 0 || rel.availability > 1) {
      errors.push(`${comp.id}: availability must be between 0 and 1`);
    }
  });

  if (errors.length > 0) {
    console.warn("Validation issues:", errors);
  }
}

function calculateReliability(s) {
  // For MVP: simple series calculation (R_sys = R1 * R2 * R3...)
  // Each component's reliability is its availability
  let systemRel = 1.0;

  for (const comp of s.components) {
    systemRel *= comp.reliability.availability;
  }

  s.computed = {
    systemReliability: systemRel,
    criticalPath: s.components.map(c => c.id)
  };
}

// STATE MUTATION - commit() pattern
// ============================================================

function commit(mutator) {
  try {
    mutator(state);
    validateState(state);
    calculateReliability(state);
  } catch (error) {
    console.error("Commit failed:", error);
    throw error;
  }
}

// RENDERING
// ============================================================

function render(s) {
  renderComponentsGrid(s);
  renderReliabilityPanel(s);
  renderSummary(s);
}

function renderComponentsGrid(s) {
  const container = document.getElementById("components-grid");

  // Sync existing components
  s.components.forEach(comp => {
    syncComponentElement(comp);
  });

  // Remove deleted components
  const keptIds = new Set(s.components.map(c => c.domId));
  container.querySelectorAll(".component-card").forEach(el => {
    if (!keptIds.has(el.id)) {
      el.remove();
    }
  });
}

function syncComponentElement(component) {
  const container = document.getElementById("components-grid");
  let el = document.getElementById(component.domId);

  if (!el) {
    el = createComponentCardElement(component);
    container.appendChild(el);
  }

  // Update content (except when editing)
  const idTag = el.querySelector("[data-role='id']");
  const nameTag = el.querySelector("[data-role='name']");
  const summaryTag = el.querySelector(".reliability-summary");

  if (idTag && document.activeElement !== idTag) {
    idTag.textContent = component.id;
  }
  if (nameTag && document.activeElement !== nameTag) {
    nameTag.textContent = component.name;
  }

  // Update reliability summary
  const rate = component.reliability.failureRate;
  const avail = (component.reliability.availability * 100).toFixed(1);
  summaryTag.innerHTML = `
    <p><strong>Failure Rate:</strong> ${rate.toFixed(4)} / hr</p>
    <p><strong>Availability:</strong> ${avail}%</p>
  `;

  // Update selection state
  el.classList.toggle("is-selected", ui.selectedIds.has(component.id));
  el.setAttribute("data-component-id", component.id);
}

function createComponentCardElement(component) {
  const el = document.createElement("article");
  el.className = "component-card";
  el.id = component.domId;
  el.setAttribute("data-component-id", component.id);

  const idTag = document.createElement("div");
  idTag.className = "id-tag";
  idTag.setAttribute("data-role", "id");
  idTag.textContent = component.id;
  idTag.setAttribute("data-field", "id");

  const nameTag = document.createElement("h3");
  nameTag.className = "name";
  nameTag.setAttribute("data-role", "name");
  nameTag.textContent = component.name;
  nameTag.setAttribute("data-field", "name");

  const summary = document.createElement("div");
  summary.className = "reliability-summary";

  el.append(idTag, nameTag, summary);
  return el;
}

function renderReliabilityPanel(s) {
  const fieldsContainer = document.getElementById("reliability-fields");
  const emptyState = document.getElementById("no-selection");

  if (ui.selectedIds.size === 0) {
    fieldsContainer.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  fieldsContainer.style.display = "flex";
  emptyState.style.display = "none";

  // Get the first selected component (MVP: single select focus)
  const selectedId = Array.from(ui.selectedIds)[0];
  const component = s.components.find(c => c.id === selectedId);

  if (!component) return;

  const rel = component.reliability;

  // Update failure rate
  const frField = document.getElementById("field-failure-rate");
  if (document.activeElement !== frField) {
    frField.value = rel.failureRate.toFixed(4);
  }
  frField.setAttribute("data-component-id", component.id);

  // Update MTTF (calculated)
  const mttfField = document.getElementById("field-mttf");
  const mttf = rel.failureRate > 0 ? (1 / rel.failureRate).toFixed(0) : "--";
  mttfField.textContent = mttf === "--" ? "--" : `${mttf} hours`;

  // Update availability
  const avField = document.getElementById("field-availability");
  if (document.activeElement !== avField) {
    avField.value = (rel.availability * 100).toFixed(2);
  }
  avField.setAttribute("data-component-id", component.id);

  // Update confidence
  const confField = document.getElementById("field-confidence");
  if (document.activeElement !== confField) {
    confField.value = (rel.confidence * 100).toFixed(0);
  }
  confField.setAttribute("data-component-id", component.id);
}

function renderSummary(s) {
  const sysAvail = document.getElementById("sys-availability");
  const critPath = document.getElementById("critical-path");
  const compCount = document.getElementById("component-count");

  const sysRel = s.computed.systemReliability;
  sysAvail.textContent = `${(sysRel * 100).toFixed(2)}%`;

  const pathStr = s.computed.criticalPath.join(" → ") || "--";
  critPath.textContent = pathStr;

  compCount.textContent = s.components.length;
}

// PERSISTENCE
// ============================================================

function exportState() {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  const now = new Date().toISOString().slice(0, 10);
  link.download = `rbd-${now}.json`;
  link.click();

  URL.revokeObjectURL(url);
  showMessage("Diagram exported successfully", "success");
}

function importState(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);

      // Basic validation
      if (!imported.components || !Array.isArray(imported.components)) {
        throw new Error("Invalid file format: missing components array");
      }

      // Validate each component
      imported.components.forEach(comp => {
        if (!comp.id || !comp.name) {
          throw new Error("Invalid component: missing id or name");
        }
        if (!comp.reliability) {
          throw new Error(`Component ${comp.id}: missing reliability data`);
        }
      });

      // Reset UI state and load new state
      state = imported;
      ui.selectedIds.clear();
      validateState(state);
      calculateReliability(state);
      render(state);

      showMessage("Diagram imported successfully", "success");
    } catch (error) {
      showMessage(`Import failed: ${error.message}`, "error");
      console.error("Import error:", error);
    }
  };

  reader.readAsText(file);
}

// MESSAGE & NOTIFICATIONS
// ============================================================

function showMessage(text, type = "success") {
  const toast = document.getElementById("message-toast");
  toast.textContent = text;
  toast.className = `message-toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// EVENT WIRING
// ============================================================

function wireEventListeners() {
  // Add component button
  document.getElementById("add-component-btn").addEventListener("click", () => {
    const name = prompt("Enter component name:");
    if (name) {
      addComponent(name);
    }
  });

  // Export button
  document.getElementById("export-btn").addEventListener("click", exportState);

  // Import button
  document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  // Import file input
  document.getElementById("import-file").addEventListener("change", (evt) => {
    const file = evt.target.files?.[0];
    if (file) {
      importState(file);
      evt.target.value = ""; // Reset file input
    }
  });

  // Component card click (selection)
  document.addEventListener("click", (evt) => {
    const card = evt.target.closest(".component-card");
    if (!card) return;

    const componentId = card.getAttribute("data-component-id");
    if (!componentId) return;

    if (evt.ctrlKey || evt.metaKey) {
      // Cmd/Ctrl+Click: toggle in selection
      if (ui.selectedIds.has(componentId)) {
        ui.selectedIds.delete(componentId);
      } else {
        ui.selectedIds.add(componentId);
      }
    } else {
      // Single click: select only this component
      ui.selectedIds.clear();
      ui.selectedIds.add(componentId);
    }
    render(state);
  });

  // Reliability field changes
  const reliabilityFields = [
    { el: document.getElementById("field-failure-rate"), path: "reliability.failureRate" },
    { el: document.getElementById("field-availability"), path: "reliability.availability" },
    { el: document.getElementById("field-confidence"), path: "reliability.confidence" }
  ];

  reliabilityFields.forEach(({ el, path }) => {
    el.addEventListener("blur", (evt) => {
      const componentId = el.getAttribute("data-component-id");
      if (componentId) {
        try {
          const value = evt.target.value;
          if (value !== "") {
            updateComponentField(componentId, path, value);
            render(state);
          }
        } catch (error) {
          showMessage(error.message, "error");
          render(state); // Re-render to reset field
        }
      }
    });

    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        el.blur();
      } else if (evt.key === "Escape") {
        render(state); // Re-render to reset field
      }
    });
  });

  // Delete key to remove selected components
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Delete" && ui.selectedIds.size > 0) {
      const count = ui.selectedIds.size;
      if (confirm(`Remove ${count} component(s)? This cannot be undone.`)) {
        const toDelete = Array.from(ui.selectedIds);
        toDelete.forEach(id => deleteComponent(id));
        render(state);
      }
      evt.preventDefault();
    }

    if (evt.key === "Escape") {
      ui.selectedIds.clear();
      render(state);
    }
  });
}

// Load initial state from example if available
if (window.location.pathname.includes("examples")) {
  // Could load example data here
}
