/**
 * Neural Network Receptive Field Calculator
 * Main application logic
 */

// DOM Elements
const layerTypeSelect = document.getElementById("layer-type");
const layerNameInput = document.getElementById("layer-name");
const kernelSizeInput = document.getElementById("kernel-size");
const strideInput = document.getElementById("stride");
const paddingInput = document.getElementById("padding");
const addLayerBtn = document.getElementById("add-layer-btn");
const modalAddLayerBtn = document.getElementById("modal-add-layer");
const networkTableBody = document.getElementById("network-layers");
const inputSizeElement = document.getElementById("input-size");
const inputOutElement = document.getElementById("input-out");
const visualizationContainer = document.getElementById("visualization");

// Input Size Editing
const inputSizeCell = document.getElementById("input-size-cell");
const inputSizeEdit = document.getElementById("input-size-edit");
const editInputSize = document.getElementById("edit-input-size");
const saveInputSize = document.getElementById("save-input-size");
const cancelInputSize = document.getElementById("cancel-input-size");

// Modals
const addLayerModal = document.getElementById("add-layer-modal");
const createGroupModal = document.getElementById("create-group-modal");
const repeatLayerModal = document.getElementById("repeat-layer-modal");
const closeModalButtons = document.querySelectorAll(".close-modal");
const createGroupBtn = document.getElementById("create-group-btn");
const groupNameInput = document.getElementById("group-name");
const repeatLayerNameInput = document.getElementById("repeat-layer-name");
const confirmRepeatLayerBtn = document.getElementById("confirm-repeat-layer");
const selectedLayersList = document
  .getElementById("selected-layers-list")
  .querySelector("ul");
const editLayerModal = document.getElementById("edit-layer-modal");
const editLayerNameInput = document.getElementById("edit-layer-name");
const editKernelSizeInput = document.getElementById("edit-kernel-size");
const editStrideInput = document.getElementById("edit-stride");
const editPaddingInput = document.getElementById("edit-padding");
const confirmEditLayerBtn = document.getElementById("confirm-edit-layer");

// Context Menu
const contextMenu = document.getElementById("context-menu");
const contextAddToGroup = document.getElementById("context-add-to-group");
const contextRepeat = document.getElementById("context-repeat");
const contextRename = document.getElementById("context-rename");
const contextRemove = document.getElementById("context-remove");

// Initialize the receptive field calculator
const calculator = new ReceptiveFieldCalculator(128);

// Debug the initial calculator state
console.log("Initial calculator state:", calculator.getLayers()[0]);

// State variables
let selectedLayers = [];
let lastSelectedLayerIndex = null;
let rightClickedLayerIndex = null;
let layerToRepeatIndex = null;
let layerToEditIndex = -1;

// Initialize the 3D visualization
let scene, camera, renderer, controls;
let cubes = [];

// Initialize the input size inline editing
function initInputSizeEditing() {
  // Click handler for the input size cell
  inputSizeCell.addEventListener("click", showInputSizeEditor);

  // Save button handler
  saveInputSize.addEventListener("click", () => {
    const newSize = parseInt(editInputSize.value);
    saveInputSizeValue(newSize);
  });

  // Cancel button handler
  cancelInputSize.addEventListener("click", hideInputSizeEditor);

  // Enter key handler
  editInputSize.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const newSize = parseInt(editInputSize.value);
      saveInputSizeValue(newSize);
    } else if (e.key === "Escape") {
      hideInputSizeEditor();
    }
  });

  // Close the editor when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#input-size-cell") &&
      !e.target.closest("#input-size-edit") &&
      inputSizeEdit.style.display !== "none"
    ) {
      hideInputSizeEditor();
    }
  });
}

// Show the input size editor
function showInputSizeEditor(e) {
  // Don't show if clicking on another element within the cell
  if (e.target.closest(".edit-icon") || e.target.closest("#input-size-edit")) {
    return;
  }

  // Set the current value
  editInputSize.value = inputSizeElement.textContent;

  // Position the editor
  const rect = inputSizeCell.getBoundingClientRect();
  inputSizeEdit.style.top = `${rect.bottom}px`;
  inputSizeEdit.style.left = `${rect.left}px`;

  // Show the editor
  inputSizeEdit.style.display = "flex";

  // Focus the input
  editInputSize.focus();
}

// Hide the input size editor
function hideInputSizeEditor() {
  inputSizeEdit.style.display = "none";
}

// Save the new input size value
function saveInputSizeValue(newSize) {
  if (isNaN(newSize) || newSize < 1) {
    alert("Please enter a valid input size (positive integer).");
    return;
  }

  // Update the calculator
  calculator.updateInputSize(newSize);

  // Update the UI
  inputSizeElement.textContent = newSize;
  inputOutElement.textContent = newSize;

  // Update visualization
  updateVisualization();

  // Hide the editor
  hideInputSizeEditor();
}

// Initialize the modals
function initModals() {
  // Add Layer Button - Show modal
  addLayerBtn.addEventListener("click", () => {
    updateLayerDefaults();
    showModal(addLayerModal);
  });

  // Modal add layer button
  modalAddLayerBtn.addEventListener("click", addNewLayer);

  // Create group button
  createGroupBtn.addEventListener("click", createNewGroup);

  // Repeat layer button
  confirmRepeatLayerBtn.addEventListener("click", confirmRepeatLayer);

  // Edit Layer modal
  confirmEditLayerBtn.addEventListener("click", confirmEditLayer);

  // Close buttons
  closeModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeAllModals();
    });
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (
      e.target === addLayerModal ||
      e.target === createGroupModal ||
      e.target === repeatLayerModal ||
      e.target === editLayerModal
    ) {
      closeAllModals();
    }
  });
}

// Initialize context menu
function initContextMenu() {
  // Hide context menu on document click
  document.addEventListener("click", (e) => {
    // Don't hide the context menu if clicking on a context menu item
    if (!e.target.closest("#context-menu")) {
      hideContextMenu();
    }
  });

  // Prevent default right-click behavior on table rows
  networkTableBody.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  // Context menu actions
  contextAddToGroup.addEventListener("click", () => {
    if (rightClickedLayerIndex !== null && rightClickedLayerIndex > 0) {
      selectedLayers = [rightClickedLayerIndex];
      showGroupCreationModal();
    }
    hideContextMenu();
  });

  contextRepeat.addEventListener("click", () => {
    if (rightClickedLayerIndex !== null && rightClickedLayerIndex > 0) {
      showRepeatLayerModal();
    }
    hideContextMenu();
  });

  contextRename.addEventListener("click", () => {
    if (rightClickedLayerIndex !== null) {
      // Allow renaming for input layer too (index 0)
      const row = document.querySelector(
        `tr[data-layer-index="${rightClickedLayerIndex}"]`
      );
      editLayerName(rightClickedLayerIndex, row);
    }
    hideContextMenu();
  });

  contextRemove.addEventListener("click", () => {
    if (rightClickedLayerIndex !== null && rightClickedLayerIndex > 0) {
      removeLayer(rightClickedLayerIndex);
    }
    hideContextMenu();
  });

  // Edit Layer option
  document.getElementById("context-edit").addEventListener("click", () => {
    if (rightClickedLayerIndex !== null) {
      showEditLayerModal(rightClickedLayerIndex);
    }
    hideContextMenu();
  });
}

// Show a modal
function showModal(modal) {
  modal.classList.add("show");
}

// Close all modals
function closeAllModals() {
  // Hide all modals
  addLayerModal.classList.remove("show");
  createGroupModal.classList.remove("show");
  repeatLayerModal.classList.remove("show");
  editLayerModal.classList.remove("show");

  // Clear input fields
  layerNameInput.value = "";
  groupNameInput.value = "";
  repeatLayerNameInput.value = "";
  editLayerNameInput.value = "";
  editKernelSizeInput.value = "";
  editStrideInput.value = "";
  editPaddingInput.value = "";

  // Remove dynamically added input size field if it exists
  const inputSizeGroup = document.getElementById("edit-input-size-group");
  if (inputSizeGroup) {
    inputSizeGroup.remove();
  }

  // Reset context menu related variables
  rightClickedLayerIndex = null;
  layerToEditIndex = -1;
  layerToRepeatIndex = -1;
}

// Show context menu
function showContextMenu(e, layerIndex) {
  e.preventDefault();
  rightClickedLayerIndex = layerIndex;

  console.log("Context menu requested for layer index:", layerIndex);

  // Position the context menu
  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.style.display = "block";

  // Disable certain options for the input layer
  const isInputLayer = layerIndex === 0;
  document.getElementById("context-add-to-group").style.display = isInputLayer
    ? "none"
    : "block";
  document.getElementById("context-remove").style.display = isInputLayer
    ? "none"
    : "block";
  document.getElementById("context-repeat").style.display = isInputLayer
    ? "none"
    : "block";

  // Rename should be available for all layers including the input layer
  // Edit should be available for all layers including the input layer

  return false;
}

// Hide context menu
function hideContextMenu() {
  contextMenu.style.display = "none";
  // We don't reset rightClickedLayerIndex here anymore,
  // so it remains available for modal operations
}

// Show group creation modal
function showGroupCreationModal() {
  // Update selected layers list
  selectedLayersList.innerHTML = "";

  const layers = calculator.getLayers();
  selectedLayers.forEach((index) => {
    if (index > 0 && index < layers.length) {
      const layer = layers[index];
      const displayName = layer.customName || layer.name;
      const li = document.createElement("li");
      li.textContent = `${displayName}`;
      selectedLayersList.appendChild(li);
    }
  });

  // Show the modal
  showModal(createGroupModal);
}

// Show repeat layer modal
function showRepeatLayerModal() {
  // Store the layer index we want to repeat
  layerToRepeatIndex = rightClickedLayerIndex;

  // Get the layer to repeat
  const layer = calculator.getLayers()[layerToRepeatIndex];

  // Set a default suggested name
  repeatLayerNameInput.value = `${layer.customName || layer.name} (copy)`;

  // Show the modal
  showModal(repeatLayerModal);

  // Focus the input
  repeatLayerNameInput.focus();
}

// Confirm repeat layer action
function confirmRepeatLayer() {
  console.log("Repeating layer with index:", layerToRepeatIndex);

  // Check if we have a valid layer to repeat
  if (layerToRepeatIndex === null || layerToRepeatIndex <= 0) {
    alert("No valid layer selected to repeat.");
    return;
  }

  const newName = repeatLayerNameInput.value.trim();

  if (!newName) {
    alert("Please enter a name for the repeated layer.");
    return;
  }

  // Get the layer to repeat using our stored index
  const layers = calculator.getLayers();
  if (layerToRepeatIndex >= layers.length) {
    alert("The selected layer no longer exists.");
    closeAllModals();
    return;
  }

  const layer = layers[layerToRepeatIndex];
  console.log("Layer to repeat:", layer);

  // Create a new layer with the same configuration but different name
  const layerConfig = {
    type: layer.type,
    kernelSize: layer.k,
    stride: layer.s,
    padding: layer.p,
    customName: newName,
  };

  console.log("New layer config:", layerConfig);

  // Add the new layer
  const newLayer = calculator.addLayer(layerConfig);
  console.log("New layer added:", newLayer);

  // Update the UI
  renderNetworkTable();
  updateVisualization();

  // Reset the layer to repeat
  layerToRepeatIndex = null;

  // Close the modal
  closeAllModals();
}

// Update form defaults based on selected layer type
function updateLayerDefaults() {
  const layerType = layerTypeSelect.value;

  if (layerType === "conv2d") {
    kernelSizeInput.value = 3;
    strideInput.value = 1;
    paddingInput.value = 1;
  } else if (layerType === "maxpool") {
    kernelSizeInput.value = 2;
    strideInput.value = 2;
    paddingInput.value = 0;
  } else if (layerType === "1x1") {
    kernelSizeInput.value = 1;
    strideInput.value = 1;
    paddingInput.value = 0;
  }
}

// Handle layer type change
function handleLayerTypeChange() {
  layerTypeSelect.addEventListener("change", updateLayerDefaults);
}

// Add a new layer to the network
function addNewLayer() {
  const layerType = layerTypeSelect.value;
  const customName = layerNameInput.value.trim();
  const kernelSize = parseInt(kernelSizeInput.value);
  const stride = parseInt(strideInput.value);
  const padding = parseInt(paddingInput.value);

  // Validate inputs
  if (
    isNaN(kernelSize) ||
    isNaN(stride) ||
    isNaN(padding) ||
    kernelSize < 1 ||
    stride < 1 ||
    padding < 0
  ) {
    alert("Please enter valid values for kernel size, stride, and padding.");
    return;
  }

  // Create layer configuration
  const layerConfig = {
    type: layerType,
    kernelSize,
    stride,
    padding,
    customName,
  };

  // Add the layer using the calculator
  const newLayer = calculator.addLayer(layerConfig);

  // Update the UI
  renderNetworkTable();

  // Update the visualization
  updateVisualization();

  // Close the modal
  closeAllModals();
}

// Create a new group
function createNewGroup() {
  const groupName = groupNameInput.value.trim();

  if (!groupName) {
    alert("Please enter a group name.");
    return;
  }

  if (selectedLayers.length < 1) {
    alert("Please select at least one layer to group.");
    return;
  }

  // Sort selected layers
  selectedLayers.sort((a, b) => a - b);

  const startIndex = selectedLayers[0];
  const endIndex = selectedLayers[selectedLayers.length - 1];

  // Check for continuous selection
  if (endIndex - startIndex + 1 !== selectedLayers.length) {
    alert("Selected layers must be continuous. Please select adjacent layers.");
    return;
  }

  calculator.createGroup(startIndex, endIndex, groupName);
  renderNetworkTable();

  // Clear selection and close modal
  selectedLayers = [];
  closeAllModals();
}

// Toggle layer selection
function toggleLayerSelection(index, isShiftKey) {
  if (index === 0) return; // Don't select the input layer

  const idx = selectedLayers.indexOf(index);
  const row = document.querySelector(`tr[data-layer-index="${index}"]`);

  if (isShiftKey && lastSelectedLayerIndex !== null) {
    // Range selection
    const start = Math.min(lastSelectedLayerIndex, index);
    const end = Math.max(lastSelectedLayerIndex, index);

    // First deselect all
    clearLayerSelection();

    // Then select the range
    for (let i = start; i <= end; i++) {
      if (i > 0) {
        // Don't select input layer
        selectedLayers.push(i);
        const rangeRow = document.querySelector(`tr[data-layer-index="${i}"]`);
        if (rangeRow) rangeRow.classList.add("selected");
      }
    }
  } else {
    // Toggle single selection
    if (idx === -1) {
      selectedLayers.push(index);
      row.classList.add("selected");
    } else {
      selectedLayers.splice(idx, 1);
      row.classList.remove("selected");
    }
  }

  lastSelectedLayerIndex = index;
}

// Clear all layer selections
function clearLayerSelection() {
  document.querySelectorAll("tr.selected").forEach((row) => {
    row.classList.remove("selected");
  });
  selectedLayers = [];
}

// Render the network table with all layers
function renderNetworkTable() {
  const layers = calculator.getLayers();
  const groups = calculator.getGroups();

  console.log("Rendering network table with input layer:", layers[0]);

  // Clear existing table content
  networkTableBody.innerHTML = "";

  // Add all layers
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (i === 0) {
      // Create the input layer row manually
      const tr = document.createElement("tr");
      tr.setAttribute("data-layer-index", 0);
      tr.classList.add("input-layer");

      // Display custom name if available
      const displayName = layer.customName || "INPUT LAYER";

      tr.innerHTML = `
        <td class="layer-name-cell">
          <span>${displayName}</span>
        </td>
        <td class="editable-cell" id="input-size-cell">
          <span id="input-size">${layer.input}</span>
          <div class="edit-icon"><i class="fas fa-edit"></i></div>
        </td>
        <td>${layer.rin}</td>
        <td>${layer.jin}</td>
        <td>${layer.s}</td>
        <td>${layer.p}</td>
        <td id="input-out">${layer.output}</td>
        <td id="input-rout">${layer.rout}</td>
        <td>${layer.jout}</td>
        <td>${layer.k}</td>
        <td>-</td>
      `;

      networkTableBody.appendChild(tr);

      // Reattach the input size editing event listener
      const inputSizeCell = tr.querySelector("#input-size-cell");
      if (inputSizeCell) {
        inputSizeCell.addEventListener("click", showInputSizeEditor);
      }

      // Add right-click event for context menu
      tr.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Input layer right-clicked");
        showContextMenu(e, 0);
        return false;
      });
    } else {
      addLayerToTable(layer, i);
    }
  }
}

// Add a single layer to the network table
function addLayerToTable(layer, index) {
  const tr = document.createElement("tr");
  tr.setAttribute("data-layer-index", index);

  // Make rows draggable except for the input layer
  if (index > 0) {
    tr.setAttribute("draggable", "true");

    // Add drag event listeners
    tr.addEventListener("dragstart", handleDragStart);
    tr.addEventListener("dragend", handleDragEnd);
    tr.addEventListener("dragover", handleDragOver);
    tr.addEventListener("dragenter", handleDragEnter);
    tr.addEventListener("dragleave", handleDragLeave);
    tr.addEventListener("drop", handleDrop);
  }

  // Check if this layer is part of a group
  if (layer.group !== null) {
    const group = calculator.getGroupById(layer.group);
    if (group) {
      tr.classList.add("grouped");
      if (index === group.startIndex) {
        tr.classList.add("grouped-start");
      }
      if (index === group.endIndex) {
        tr.classList.add("grouped-end");
      }
    }
  }

  // Display name (custom or default)
  const displayName = layer.customName || layer.name;

  // If layer is the start of a group, prefix with group name
  let nameDisplay = displayName;
  if (layer.group !== null) {
    const group = calculator.getGroupById(layer.group);
    if (group && index === group.startIndex) {
      nameDisplay = `<strong>${group.name}</strong>:<br>${displayName}`;
    }
  }

  // Add drag handle for non-input layers
  const dragHandleHtml =
    index > 0 ? '<i class="fas fa-grip-vertical drag-handle"></i> ' : "";

  // Add all layer properties
  tr.innerHTML = `
    <td class="layer-name-cell">
      <span>${dragHandleHtml}${nameDisplay}</span>
    </td>
    <td>${layer.input}</td>
    <td>${layer.rin}</td>
    <td>${layer.jin}</td>
    <td>${layer.s}</td>
    <td>${layer.p}</td>
    <td>${layer.output}</td>
    <td>${layer.rout}</td>
    <td>${layer.jout}</td>
    <td>${layer.k}</td>
    <td>
      <button class="action-btn remove-btn" data-index="${index}">Remove</button>
    </td>
  `;

  // Add event listener for the remove button
  const removeBtn = tr.querySelector(".remove-btn");
  removeBtn.addEventListener("click", function () {
    const layerIndex = parseInt(this.getAttribute("data-index"));
    removeLayer(layerIndex);
  });

  // Add click event for selection
  tr.addEventListener("click", (e) => {
    if (!e.target.closest("button") && !e.target.closest(".drag-handle")) {
      toggleLayerSelection(index, e.shiftKey);
    }
  });

  // Add right-click event for context menu
  tr.addEventListener("contextmenu", (e) => {
    showContextMenu(e, index);
  });

  // Add the row to the table
  networkTableBody.appendChild(tr);
}

// Drag-and-drop event handlers
let dragSourceElement = null;
let dragSourceIndex = -1;

function handleDragStart(e) {
  // Don't allow dragging the input layer
  const layerIndex = parseInt(this.getAttribute("data-layer-index"));
  if (layerIndex === 0) {
    e.preventDefault();
    return false;
  }

  dragSourceElement = this;
  dragSourceIndex = layerIndex;

  // Set data transfer properties
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", layerIndex);

  // Add a class to style the dragged row
  this.classList.add("dragging");

  return true;
}

function handleDragEnd(e) {
  // Remove all drop effect classes
  document
    .querySelectorAll(".drop-above, .drop-below, .dragging")
    .forEach((el) => {
      el.classList.remove("drop-above", "drop-below", "dragging");
    });

  dragSourceElement = null;
  dragSourceIndex = -1;
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault(); // Allow drop
  }

  e.dataTransfer.dropEffect = "move";
  return false;
}

function handleDragEnter(e) {
  // Don't allow dropping onto the input layer
  const layerIndex = parseInt(this.getAttribute("data-layer-index"));
  if (layerIndex === 0) {
    return false;
  }

  // Add drop indicator - determine if we should show indicator above or below
  const rect = this.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;

  if (e.clientY < midY) {
    this.classList.add("drop-above");
    this.classList.remove("drop-below");
  } else {
    this.classList.add("drop-below");
    this.classList.remove("drop-above");
  }
}

function handleDragLeave(e) {
  this.classList.remove("drop-above", "drop-below");
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation(); // Stops browser from redirecting
  }

  // Don't do anything if the dragged element is dropped on itself
  if (dragSourceElement === this) {
    return false;
  }

  // Don't allow dropping on the input layer
  const targetIndex = parseInt(this.getAttribute("data-layer-index"));
  if (targetIndex === 0) {
    return false;
  }

  // Determine whether to insert above or below this row
  const rect = this.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;

  let dropIndex;
  if (e.clientY < midY) {
    // Drop above this row
    dropIndex = targetIndex;
  } else {
    // Drop below this row
    dropIndex = targetIndex + 1;
  }

  // If dropping below the source, decrement the drop index
  if (dropIndex > dragSourceIndex) {
    dropIndex--;
  }

  // Reorder the layer in the calculator
  if (calculator.reorderLayer(dragSourceIndex, dropIndex)) {
    // Update the UI
    renderNetworkTable();
    updateVisualization();
  }

  return false;
}

// Show add layer modal after a specific layer
function showAddLayerAfterModal(afterIndex) {
  updateLayerDefaults();
  showModal(addLayerModal);
}

// Edit a layer's name
function editLayerName(index, row) {
  const layer = calculator.getLayers()[index];
  const currentName = layer.customName || layer.name;
  const defaultName = index === 0 ? "INPUT LAYER" : layer.name;

  // Create an inline edit form
  const nameCell = row.querySelector(".layer-name-cell");
  const currentHTML = nameCell.innerHTML;

  // Replace cell content with an edit form
  nameCell.innerHTML = `
    <div class="edit-name-form">
        <input type="text" class="name-input" value="${
          layer.customName || ""
        }" placeholder="${defaultName}">
        <button class="btn secondary save-name">Save</button>
        <button class="btn secondary cancel-edit">Cancel</button>
    </div>
  `;

  // Add event listeners
  const saveBtn = nameCell.querySelector(".save-name");
  const cancelBtn = nameCell.querySelector(".cancel-edit");
  const nameInput = nameCell.querySelector(".name-input");

  saveBtn.addEventListener("click", () => {
    calculator.updateLayerName(index, nameInput.value.trim());
    renderNetworkTable();
    updateVisualization(); // Update visualization to reflect new name
  });

  cancelBtn.addEventListener("click", () => {
    nameCell.innerHTML = currentHTML;

    // Re-add the right-click event listener for the input layer
    if (index === 0) {
      row.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e, 0);
        return false;
      });
    }
  });

  // Focus the input
  nameInput.focus();
}

// Remove a layer from its group
function ungroupLayer(index) {
  if (calculator.removeLayerFromGroup(index)) {
    renderNetworkTable();
  }
}

// Remove a layer from the network
function removeLayer(index) {
  if (calculator.removeLayer(index)) {
    calculator.recalculateNetwork();
    renderNetworkTable();
    updateVisualization();

    // Clear selection if needed
    const selIdx = selectedLayers.indexOf(index);
    if (selIdx !== -1) {
      selectedLayers.splice(selIdx, 1);
    }

    // Update indexes in selectedLayers array
    selectedLayers = selectedLayers.map((idx) => (idx > index ? idx - 1 : idx));

    // Clear if empty
    if (selectedLayers.length === 0) {
      lastSelectedLayerIndex = null;
    }
  }
}

// Initialize the 3D visualization with Three.js
function initVisualization() {
  // Create a scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a); // Updated dark background color

  // Create a camera
  camera = new THREE.PerspectiveCamera(
    75, // field of view
    visualizationContainer.clientWidth / visualizationContainer.clientHeight, // aspect ratio
    0.1, // near clipping plane
    1000 // far clipping plane
  );
  camera.position.z = 200;

  // Create a renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(
    visualizationContainer.clientWidth,
    visualizationContainer.clientHeight
  );
  visualizationContainer.appendChild(renderer.domElement);

  // Add OrbitControls for interactivity
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Initial visualization
  updateVisualization();

  // Start animation loop
  animate();

  // Handle window resize
  window.addEventListener("resize", onWindowResize);
}

// Handle window resize
function onWindowResize() {
  camera.aspect =
    visualizationContainer.clientWidth / visualizationContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(
    visualizationContainer.clientWidth,
    visualizationContainer.clientHeight
  );
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Update the visualization based on current network
function updateVisualization() {
  // Clear existing visualization
  while (scene.children.length > 0) {
    const object = scene.children[0];
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
    scene.remove(object);
  }

  // Rebuild the visualization
  const layers = calculator.getLayers();
  const totalLayers = layers.length;

  // Add each layer
  for (let i = 0; i < totalLayers; i++) {
    const layer = layers[i];
    const x = i * 20 - (totalLayers - 1) * 10; // Shift to center the visualization

    // Calculate a color based on the layer type and position
    let color;
    if (i === 0) {
      // Input layer
      color = new THREE.Color(0x6366f1); // Indigo
    } else if (layer.type === "maxpool") {
      color = new THREE.Color(0xec4899); // Pink
    } else if (layer.group !== null) {
      // Layer is part of a group - use a gradient based on position
      const group = calculator.getGroupById(layer.group);
      const groupLength = group.endIndex - group.startIndex + 1;
      const positionInGroup = i - group.startIndex;
      const gradientPosition = positionInGroup / groupLength;

      // Create a gradient from blue to purple
      const startColor = new THREE.Color(0x60a5fa); // Blue
      const endColor = new THREE.Color(0xa78bfa); // Purple
      color = startColor.clone().lerp(endColor, gradientPosition);
    } else if (layer.type === "1x1") {
      color = new THREE.Color(0x34d399); // Emerald
    } else {
      // Regular conv layer
      color = new THREE.Color(0x3b82f6); // Blue
    }

    // Layer dimensions based on input/output size
    const height = layer.input * 0.05;
    const width = layer.output * 0.05;
    const depth = 5;

    // Create the layer representation
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      emissive: color.clone().multiplyScalar(0.2),
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, 0, 0);
    scene.add(cube);

    // Add an edge outline to the cube
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: color.clone().multiplyScalar(1.2),
      linewidth: 1,
    });
    const edgeLines = new THREE.LineSegments(edges, lineMaterial);
    cube.add(edgeLines);

    // Add text label
    const displayName = layer.customName || layer.name;
    addText(displayName, x, height / 2 + 3, 0);

    // Add receptive field label
    addText(`RF: ${layer.rout}`, x, -height / 2 - 3, 0);
  }
}

// Helper function to add text to the scene
function addText(text, x, y, z) {
  // This is a placeholder - Three.js text requires additional setup with font loading
  // For a complete implementation, consider using CSS2DRenderer for HTML-based labels
  // or TextGeometry with a preloaded font
}

// Show the edit layer modal for a specific layer
function showEditLayerModal(layerIndex) {
  // Store the index of the layer being edited
  layerToEditIndex = layerIndex;

  // Get the layer
  const layer = calculator.getLayers()[layerIndex];

  // Populate the form with the layer's current values
  editLayerNameInput.value = layer.customName || "";
  editKernelSizeInput.value = layer.k;
  editStrideInput.value = layer.s;
  editPaddingInput.value = layer.p;

  // Special handling for input layer
  if (layerIndex === 0) {
    // Add input size field for the input layer
    const inputSizeFormGroup = document.createElement("div");
    inputSizeFormGroup.className = "form-group";
    inputSizeFormGroup.id = "edit-input-size-group";
    inputSizeFormGroup.innerHTML = `
      <label for="edit-input-size-value">Input Size:</label>
      <input type="number" id="edit-input-size-value" min="1" value="${layer.input}" />
    `;

    // Insert it as the first field in the form
    const modalBody = editLayerModal.querySelector(".modal-body");
    const firstField = modalBody.querySelector(".form-group");
    modalBody.insertBefore(inputSizeFormGroup, firstField);

    editLayerModal.querySelector(".modal-header h3").textContent =
      "Edit Input Layer";
  } else {
    // Remove input size field if it exists
    const inputSizeGroup = document.getElementById("edit-input-size-group");
    if (inputSizeGroup) {
      inputSizeGroup.remove();
    }

    editLayerModal.querySelector(".modal-header h3").textContent = "Edit Layer";
  }

  // Show the modal
  showModal(editLayerModal);
}

// Save the edited layer
function confirmEditLayer() {
  // Validate the layer index
  if (
    layerToEditIndex < 0 ||
    layerToEditIndex >= calculator.getLayers().length
  ) {
    alert("Invalid layer selection.");
    return;
  }

  // Get the form values
  const customName = editLayerNameInput.value.trim();
  const kernelSize = parseInt(editKernelSizeInput.value);
  const stride = parseInt(editStrideInput.value);
  const padding = parseInt(editPaddingInput.value);

  // Validate numeric inputs
  if (isNaN(kernelSize) || kernelSize < 1) {
    alert("Kernel size must be a positive number.");
    return;
  }

  if (isNaN(stride) || stride < 1) {
    alert("Stride must be a positive number.");
    return;
  }

  if (isNaN(padding) || padding < 0) {
    alert("Padding must be a non-negative number.");
    return;
  }

  // Create config object with common properties
  const config = {
    customName,
    kernelSize,
    stride,
    padding,
  };

  // Add input size for the input layer
  if (layerToEditIndex === 0) {
    const inputSizeInput = document.getElementById("edit-input-size-value");
    const inputSize = parseInt(inputSizeInput.value);

    if (isNaN(inputSize) || inputSize < 1) {
      alert("Input size must be a positive number.");
      return;
    }

    config.input = inputSize;
  }

  // Update the layer
  if (calculator.updateLayer(layerToEditIndex, config)) {
    // Refresh the UI
    renderNetworkTable();
    updateVisualization();

    // Close the modal
    closeAllModals();

    // Reset the edit index
    layerToEditIndex = -1;
  } else {
    alert("Failed to update the layer.");
  }
}

// Initialize the application
function init() {
  initInputSizeEditing();
  handleLayerTypeChange();
  initModals();
  initContextMenu();
  initVisualization();

  // Force calculator to recalculate and update the input layer display
  const inputLayer = calculator.getLayers()[0];
  inputSizeElement.textContent = inputLayer.input;
  inputOutElement.textContent = inputLayer.output;
  document.getElementById("input-rout").textContent = inputLayer.rout;

  // Directly attach right-click handler to the input layer row
  document
    .getElementById("input-layer-row")
    .addEventListener("contextmenu", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Input layer right-clicked via direct handler");
      showContextMenu(e, 0);
      return false;
    });

  // Add document click to clear selections when clicking outside the table
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#network-table") &&
      !e.target.closest("#create-group-modal")
    ) {
      clearLayerSelection();
    }
  });

  // Log a message to confirm initialization is complete
  console.log(
    "Application initialized. Right-click handlers should be active."
  );
}

// Start the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", init);
