# Neural Network Receptive Field Calculator

A web-based tool to design and visualize neural networks with receptive field calculations.

## Overview

This application allows you to design a neural network by adding different types of layers (Conv2D, MaxPool, 1x1) and automatically calculates the receptive field of each layer. It includes a 3D visualization of the neural network architecture and its receptive fields.

The receptive field calculations are based on the methodology described in the article: [Computing Receptive Fields of Convolutional Neural Networks](https://distill.pub/2019/computing-receptive-fields/).

## Features

- Design your neural network by adding different layer types
- Customize kernel size, stride, and padding for each layer
- Automatic calculation of receptive fields
- Interactive 3D visualization of the network architecture
- Dark mode support
- Responsive design for different screen sizes

## Layer Types

The application supports the following layer types:

1. **Conv2D** - Convolutional layer with customizable kernel size, stride, and padding

   - Default: kernel size = 3, stride = 1, padding = 1

2. **MaxPool** - Max pooling layer

   - Default: kernel size = 2, stride = 2, padding = 0

3. **1x1 Layer** - 1x1 convolutional layer (used for dimension reduction)
   - Default: kernel size = 1, stride = 1, padding = 0

## Receptive Field Calculation

The application calculates the following properties for each layer:

- **Input** - Input feature map size
- **Rin** - Receptive field size at input
- **Jin** - Jump/stride-product at input
- **s** - Stride of the current layer
- **p** - Padding of the current layer
- **Out** - Output feature map size
- **Rout** - Receptive field size at output
- **Jout** - Jump/stride-product at output
- **k** - Kernel size

## Usage

1. Open the application in a web browser
2. Select a layer type from the dropdown menu
3. Adjust the kernel size, stride, and padding as needed
4. Click "Add Layer" to add the layer to your network
5. The receptive field calculations will be displayed in the table
6. The 3D visualization will update to show your network architecture

## Getting Started

1. Clone this repository
2. Open `index.html` in a web browser

## Technologies Used

- HTML5
- CSS3
- JavaScript
- [Three.js](https://threejs.org/) for 3D visualization

## License

MIT
