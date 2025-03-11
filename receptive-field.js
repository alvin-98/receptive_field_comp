/**
 * Receptive Field Calculator
 * Based on: https://distill.pub/2019/computing-receptive-fields/
 *
 * This module provides functions to calculate receptive fields in convolutional neural networks.
 */

class ReceptiveFieldCalculator {
  constructor(inputSize = 128) {
    this.layers = [];
    this.groups = [];
    // Initialize with input layer
    this.addInputLayer(inputSize);

    // Force the correct output calculation for the input layer
    const inputLayer = this.layers[0];
    inputLayer.output =
      Math.floor(
        (inputLayer.input + 2 * inputLayer.p - inputLayer.k) / inputLayer.s
      ) + 1;
  }

  /**
   * Add the input layer to the network
   * @param {number} size - The input size
   */
  addInputLayer(size) {
    const k = 3; // Default kernel size for input layer
    const jin = 1;
    const rin = 1;
    const p = 0; // padding
    const s = 1; // stride

    // Calculate the receptive field size: r_out = r_in + (k - 1) * j_in
    const rout = rin + (k - 1) * jin; // This should be 3 for k=3

    // Calculate output size using the standard formula:
    const output = Math.floor((size + 2 * p - k) / s) + 1;

    const inputLayer = {
      name: "INPUT LAYER",
      customName: "",
      type: "input",
      input: size,
      rin: rin, // receptive field size at input
      jin: jin, // jump/stride-product at input
      s: s, // stride
      p: p, // padding
      k: k, // kernel size for input layer
      output: output, // Properly calculated output size
      rout: rout, // receptive field size at output (should be 3)
      jout: jin, // jump/stride-product at output
      group: null, // group this layer belongs to
    };

    this.layers = [inputLayer];
    return inputLayer;
  }

  /**
   * Update the input size of the first layer
   * @param {number} size - The new input size
   */
  updateInputSize(size) {
    if (size <= 0) return false;

    const p = this.layers[0].p;
    const k = this.layers[0].k;
    const s = this.layers[0].s;

    this.layers[0].input = size;
    // Calculate output size using the standard formula
    this.layers[0].output = Math.floor((size + 2 * p - k) / s) + 1;

    // Recalculate the network to propagate changes
    this.recalculateNetwork();
    return true;
  }

  /**
   * Add a new layer to the network and calculate its receptive field
   * @param {object} layerConfig - The layer configuration
   * @returns {object} The calculated layer properties
   */
  addLayer(layerConfig) {
    const prevLayer = this.layers[this.layers.length - 1];
    const newLayer = this.calculateLayerProperties(prevLayer, layerConfig);
    this.layers.push(newLayer);
    return newLayer;
  }

  /**
   * Calculate layer properties based on previous layer and current layer config
   * @param {object} prevLayer - The previous layer
   * @param {object} config - The current layer config
   * @returns {object} The calculated layer properties
   */
  calculateLayerProperties(prevLayer, config) {
    const { type, kernelSize, stride, padding, customName } = config;
    const layerName =
      customName || this.getLayerName(type, this.countLayersByType(type));

    // Input properties are inherited from previous layer's output
    const input = prevLayer.output;
    const rin = prevLayer.rout;
    const jin = prevLayer.jout;

    // Current layer's stride and padding
    const s = stride;
    const p = padding;
    const k = type === "maxpool" || type === "conv2d" ? kernelSize : 1;

    // Calculate output properties
    // Output size: Math.floor((input + 2*padding - kernelSize) / stride) + 1
    const output = Math.floor((input + 2 * p - k) / s) + 1;

    // Receptive field size at output: rin + (k - 1) * jin
    const rout = rin + (k - 1) * jin;

    // Jump at output: jin * s
    const jout = jin * s;

    return {
      name: layerName,
      customName: customName || "",
      type,
      input,
      rin,
      jin,
      s,
      p,
      k,
      output,
      rout,
      jout,
      group: null,
    };
  }

  /**
   * Get a formatted name for the layer
   * @param {string} type - The layer type
   * @param {number} count - The count of layers of this type
   * @returns {string} The formatted layer name
   */
  getLayerName(type, count) {
    switch (type) {
      case "conv2d":
        return `CONV BLOCK ${count}`;
      case "maxpool":
        return `MAXPOOL TRANSITION BLOCK`;
      case "1x1":
        return `TRANSITION BLOCK`;
      default:
        return `LAYER ${this.layers.length}`;
    }
  }

  /**
   * Count the number of layers of a specific type
   * @param {string} type - The layer type to count
   * @returns {number} The count of layers of the specified type
   */
  countLayersByType(type) {
    if (type === "conv2d") {
      // Count existing conv blocks and get the highest number
      const convBlocks = this.layers.filter((layer) =>
        layer.name.startsWith("CONV BLOCK")
      );

      if (convBlocks.length === 0) return 1;

      // Extract the highest block number
      const blockNumbers = convBlocks.map((layer) => {
        const match = layer.name.match(/CONV BLOCK (\d+)/);
        return match ? parseInt(match[1]) : 0;
      });

      return Math.max(...blockNumbers) + 1;
    }

    return 1;
  }

  /**
   * Update the name of a layer
   * @param {number} index - The index of the layer to rename
   * @param {string} newName - The new name for the layer
   */
  updateLayerName(index, newName) {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].customName = newName;
      return true;
    }
    return false;
  }

  /**
   * Create a group of layers
   * @param {number} startIndex - The start index of the group
   * @param {number} endIndex - The end index of the group
   * @param {string} groupName - The name of the group
   */
  createGroup(startIndex, endIndex, groupName) {
    if (
      startIndex < 0 ||
      endIndex >= this.layers.length ||
      startIndex > endIndex
    ) {
      return false;
    }

    // Check if any layers in the range are already in a group
    for (let i = startIndex; i <= endIndex; i++) {
      if (this.layers[i].group !== null) {
        // Remove from existing group
        this.removeLayerFromGroup(i);
      }
    }

    // Create a new group
    const groupId = Date.now().toString();
    const newGroup = {
      id: groupId,
      name: groupName,
      startIndex,
      endIndex,
    };

    this.groups.push(newGroup);

    // Assign layers to the group
    for (let i = startIndex; i <= endIndex; i++) {
      this.layers[i].group = groupId;
    }

    return true;
  }

  /**
   * Remove a layer from its group
   * @param {number} index - The index of the layer to remove from its group
   */
  removeLayerFromGroup(index) {
    if (index < 0 || index >= this.layers.length) return false;

    const layer = this.layers[index];
    if (layer.group === null) return false;

    const groupId = layer.group;
    const groupIndex = this.groups.findIndex((g) => g.id === groupId);

    if (groupIndex === -1) return false;

    // Handle different cases
    const group = this.groups[groupIndex];

    // Single layer in group - remove the group
    if (group.startIndex === group.endIndex) {
      this.groups.splice(groupIndex, 1);
    }
    // First layer in group - adjust start index
    else if (index === group.startIndex) {
      group.startIndex += 1;
    }
    // Last layer in group - adjust end index
    else if (index === group.endIndex) {
      group.endIndex -= 1;
    }
    // Middle of group - split into two groups
    else {
      const newGroupId = Date.now().toString();
      const newGroup = {
        id: newGroupId,
        name: group.name,
        startIndex: index + 1,
        endIndex: group.endIndex,
      };

      // Adjust original group
      group.endIndex = index - 1;

      // Update layers in the new group
      for (let i = newGroup.startIndex; i <= newGroup.endIndex; i++) {
        this.layers[i].group = newGroupId;
      }

      this.groups.push(newGroup);
    }

    // Remove this layer from any group
    layer.group = null;

    return true;
  }

  /**
   * Get a group by ID
   * @param {string} groupId - The group ID
   * @returns {object|null} The group object or null if not found
   */
  getGroupById(groupId) {
    return this.groups.find((group) => group.id === groupId) || null;
  }

  /**
   * Remove a layer at the specified index
   * @param {number} index - The index of the layer to remove
   */
  removeLayer(index) {
    // Don't allow removing the input layer
    if (index === 0) return false;

    if (index >= 0 && index < this.layers.length) {
      // Check if this layer is in a group
      if (this.layers[index].group !== null) {
        this.removeLayerFromGroup(index);
      }

      // Adjust group indices for all layers after this one
      this.groups.forEach((group) => {
        if (group.startIndex > index) {
          group.startIndex -= 1;
        }
        if (group.endIndex > index) {
          group.endIndex -= 1;
        }
      });

      // Clean up any empty groups
      this.groups = this.groups.filter(
        (group) => group.startIndex <= group.endIndex
      );

      // Remove the layer
      this.layers.splice(index, 1);

      return true;
    }

    return false;
  }

  /**
   * Recalculate all layer properties after changes
   */
  recalculateNetwork() {
    const inputLayer = this.layers[0];

    // Explicitly recalculate the input layer's output
    inputLayer.output =
      Math.floor(
        (inputLayer.input + 2 * inputLayer.p - inputLayer.k) / inputLayer.s
      ) + 1;

    for (let i = 1; i < this.layers.length; i++) {
      const prevLayer = this.layers[i - 1];
      const currentLayer = this.layers[i];

      const config = {
        type: currentLayer.type,
        kernelSize: currentLayer.k,
        stride: currentLayer.s,
        padding: currentLayer.p,
        customName: currentLayer.customName,
      };

      const updatedLayer = this.calculateLayerProperties(prevLayer, config);

      // Preserve the group and custom name
      updatedLayer.group = currentLayer.group;

      this.layers[i] = { ...currentLayer, ...updatedLayer };
    }

    return this.layers;
  }

  /**
   * Get all network layers
   * @returns {Array} The array of network layers
   */
  getLayers() {
    return this.layers;
  }

  /**
   * Get all layer groups
   * @returns {Array} The array of layer groups
   */
  getGroups() {
    return this.groups;
  }

  /**
   * Get the global receptive field for a specific layer
   * @param {number} layerIndex - Index of the layer
   * @returns {number} The global receptive field size
   */
  getGlobalReceptiveField(layerIndex) {
    if (layerIndex < 0 || layerIndex >= this.layers.length) {
      return 0;
    }

    return this.layers[layerIndex].rout;
  }

  /**
   * Reorder a layer by moving it from one position to another
   * @param {number} fromIndex - The current index of the layer
   * @param {number} toIndex - The new index where the layer should be moved
   * @returns {boolean} - Whether the reordering was successful
   */
  reorderLayer(fromIndex, toIndex) {
    // Don't allow reordering the input layer (index 0)
    if (fromIndex === 0 || toIndex === 0) {
      return false;
    }

    // Validate indices
    if (
      fromIndex < 0 ||
      fromIndex >= this.layers.length ||
      toIndex < 0 ||
      toIndex >= this.layers.length ||
      fromIndex === toIndex
    ) {
      return false;
    }

    // Move the layer
    const [movedLayer] = this.layers.splice(fromIndex, 1);
    this.layers.splice(toIndex, 0, movedLayer);

    // Update group information
    this.updateGroupsAfterReordering(fromIndex, toIndex);

    // Recalculate the entire network
    this.recalculateNetwork();

    return true;
  }

  /**
   * Update group information after layers have been reordered
   * @param {number} fromIndex - The original index of the moved layer
   * @param {number} toIndex - The new index of the moved layer
   */
  updateGroupsAfterReordering(fromIndex, toIndex) {
    // Update all group indices
    for (let i = 0; i < this.groups.length; i++) {
      const group = this.groups[i];

      // Check if the moved layer was part of this group
      const wasInGroup =
        fromIndex >= group.startIndex && fromIndex <= group.endIndex;

      // Adjust group indices based on where the layer was moved from and to
      if (fromIndex < group.startIndex) {
        // Layer was moved from before the group
        if (toIndex < group.startIndex) {
          // Moved within the range before the group - no change needed
        } else if (toIndex <= group.endIndex) {
          // Moved into the group from before
          group.startIndex--;
        } else {
          // Moved to after the group from before
          group.startIndex--;
          group.endIndex--;
        }
      } else if (fromIndex <= group.endIndex) {
        // Layer was inside the group
        if (toIndex < group.startIndex) {
          // Moved out of the group to before it
          group.startIndex++;
          group.endIndex++;
        } else if (toIndex <= group.endIndex) {
          // Moved within the group - no change needed
        } else {
          // Moved out of the group to after it
          group.endIndex--;
        }
      } else {
        // Layer was after the group
        if (toIndex < group.startIndex) {
          // Moved to before the group from after
          group.startIndex++;
          group.endIndex++;
        } else if (toIndex <= group.endIndex) {
          // Moved into the group from after
          group.endIndex++;
        } else {
          // Moved within the range after the group - no change needed
        }
      }
    }

    // Update group associations
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];

      // Reset group association first
      layer.group = null;

      // Check if this layer is part of any group
      for (const group of this.groups) {
        if (i >= group.startIndex && i <= group.endIndex) {
          layer.group = group.id;
          break;
        }
      }
    }
  }

  /**
   * Update an existing layer's properties
   * @param {number} index - The index of the layer to update
   * @param {object} layerConfig - Configuration for the layer update
   * @returns {boolean} - Whether the update was successful
   */
  updateLayer(index, layerConfig) {
    // Validate the index
    if (index < 0 || index >= this.layers.length) {
      return false;
    }

    // Special handling for input layer
    if (index === 0) {
      return this.updateInputLayer(layerConfig);
    }

    const { kernelSize, stride, padding, customName } = layerConfig;
    const layer = this.layers[index];

    // Update the layer properties
    if (kernelSize !== undefined) {
      layer.k = kernelSize;
    }

    if (stride !== undefined) {
      layer.s = stride;
    }

    if (padding !== undefined) {
      layer.p = padding;
    }

    if (customName !== undefined && customName.trim() !== "") {
      layer.customName = customName.trim();
    }

    // Recalculate the network starting from this layer
    this.recalculateNetwork();

    return true;
  }

  /**
   * Update the input layer properties
   * @param {object} layerConfig - Configuration for the input layer update
   * @returns {boolean} - Whether the update was successful
   */
  updateInputLayer(layerConfig) {
    const { kernelSize, input, padding, stride, customName } = layerConfig;
    const inputLayer = this.layers[0];

    // Update input size if provided
    if (input !== undefined && input > 0) {
      inputLayer.input = input;
    }

    // Update kernel size if provided
    if (kernelSize !== undefined && kernelSize > 0) {
      inputLayer.k = kernelSize;
    }

    // Update padding if provided
    if (padding !== undefined && padding >= 0) {
      inputLayer.p = padding;
    }

    // Update stride if provided
    if (stride !== undefined && stride > 0) {
      inputLayer.s = stride;
    }

    // Update custom name if provided
    if (customName !== undefined && customName.trim() !== "") {
      inputLayer.customName = customName.trim();
    }

    // Recalculate the output size based on the new parameters
    inputLayer.output =
      Math.floor(
        (inputLayer.input + 2 * inputLayer.p - inputLayer.k) / inputLayer.s
      ) + 1;

    // Recalculate the receptive field size
    inputLayer.rout = inputLayer.rin + (inputLayer.k - 1) * inputLayer.jin;

    // Recalculate the network
    this.recalculateNetwork();

    return true;
  }
}
