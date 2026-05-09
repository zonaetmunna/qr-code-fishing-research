# Machine Learning Research Context

The intelligence of the QR Code Phishing Detection system relies heavily on a custom Convolutional Neural Network (CNN). This document outlines the research, training, and architectural specifications defined in the `research/qr_code.ipynb` Colab notebook.

## Dataset and Preprocessing

### The Data Source
The model was trained on a dataset of over 200,000 QR codes stored in Google Drive, evenly split into `benign` (label 0) and `malicious` (label 1) directories.

### Preprocessing Pipeline
To ensure the CNN receives standardized inputs, all images pass through the `preprocess_image` pipeline:
1.  **Format Conversion**: Images are converted to RGB color space.
2.  **Dimensionality**: All images are resized to a fixed shape of `128x128` pixels (`IMG_WIDTH=128`, `IMG_HEIGHT=128`).
3.  **Normalization**: Pixel values (0-255) are divided by 255.0 to scale them to a range of `[0.0, 1.0]`. This normalization drastically improves the stability and convergence speed of the neural network during training.

## CNN Model Architecture

The neural network is built using TensorFlow's Keras API (`models.Sequential`). It follows a standard feature-extraction to classification pipeline.

### Feature Extraction (Convolutional Layers)
1.  **Conv2D (32 filters, 3x3)** + ReLU Activation -> `MaxPooling2D (2x2)`
2.  **Conv2D (64 filters, 3x3)** + ReLU Activation -> `MaxPooling2D (2x2)`
3.  **Conv2D (128 filters, 3x3)** + ReLU Activation -> `MaxPooling2D (2x2)`

These layers are responsible for identifying spatial hierarchies and patterns in the QR codes that distinguish malicious generation software artifacts from benign ones.

### Classification (Dense Layers)
*   **Flatten**: Converts the 3D feature maps into a 1D vector.
*   **Dense (128 neurons)** + ReLU Activation.
*   **Dropout (0.5)**: Disables 50% of the neurons randomly during training to prevent overfitting.
*   **Output Dense (1 neuron)** + Sigmoid Activation. The sigmoid function squashes the final output into a probability between 0 and 1, representing the likelihood of the QR code being malicious.

## Training Configuration

*   **Optimizer**: Adam (Adaptive Moment Estimation).
*   **Loss Function**: `binary_crossentropy` (standard for binary classification problems).
*   **Callbacks**: 
    *   `EarlyStopping`: Halts training if validation loss fails to improve for 5 consecutive epochs, restoring the best weights.
    *   `ReduceLROnPlateau`: Reduces the learning rate dynamically if the model hits a plateau, allowing for finer convergence.
