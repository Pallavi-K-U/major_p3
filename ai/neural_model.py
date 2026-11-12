import torch
import torch.nn as nn
import torch.nn.functional as F

class FocalLoss(nn.Module):
    """
    Focal Loss for addressing extreme class imbalance in tabular fraud detection.
    FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)
    """
    def __init__(self, alpha=0.25, gamma=2.0, reduction='mean'):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, inputs, targets):
        # inputs are raw probabilities (post-sigmoid)
        eps = 1e-7
        inputs = torch.clamp(inputs, eps, 1.0 - eps)
        
        # Calculate cross-entropy components
        bce = - (targets * torch.log(inputs) + (1 - targets) * torch.log(1 - inputs))
        
        # Focal weights
        p_t = targets * inputs + (1 - targets) * (1 - inputs)
        alpha_t = targets * self.alpha + (1 - targets) * (1 - self.alpha)
        focal_weight = alpha_t * torch.pow((1.0 - p_t), self.gamma)
        
        loss = focal_weight * bce
        
        if self.reduction == 'mean':
            return loss.mean()
        elif self.reduction == 'sum':
            return loss.sum()
        else:
            return loss


class DeepFraudMLP(nn.Module):
    """
    Multi-Layer Perceptron for Deep Tabular Fraud Risk Classification.
    Uses Batch Normalization, LeakyReLU activations, and Dropout for robust generalization.
    """
    def __init__(self, input_dim=7, hidden_dims=[64, 32, 16], dropout_rates=[0.3, 0.2]):
        super(DeepFraudMLP, self).__init__()
        
        # Layer 1: Input -> 64
        self.fc1 = nn.Linear(input_dim, hidden_dims[0])
        self.bn1 = nn.BatchNorm1d(hidden_dims[0])
        self.drop1 = nn.Dropout(dropout_rates[0])
        
        # Layer 2: 64 -> 32
        self.fc2 = nn.Linear(hidden_dims[0], hidden_dims[1])
        self.bn2 = nn.BatchNorm1d(hidden_dims[1])
        self.drop2 = nn.Dropout(dropout_rates[1])
        
        # Layer 3: 32 -> 16
        self.fc3 = nn.Linear(hidden_dims[1], hidden_dims[2])
        self.bn3 = nn.BatchNorm1d(hidden_dims[2])
        
        # Output Layer: 16 -> 1
        self.out = nn.Linear(hidden_dims[2], 1)
        self.act = nn.LeakyReLU(0.1)

    def forward(self, x):
        # Pass through Block 1
        x = self.fc1(x)
        if x.size(0) > 1:
            x = self.bn1(x)
        x = self.act(x)
        x = self.drop1(x)
        
        # Pass through Block 2
        x = self.fc2(x)
        if x.size(0) > 1:
            x = self.bn2(x)
        x = self.act(x)
        x = self.drop2(x)
        
        # Pass through Block 3
        x = self.fc3(x)
        if x.size(0) > 1:
            x = self.bn3(x)
        x = self.act(x)
        
        # Output probability
        logits = self.out(x)
        prob = torch.sigmoid(logits)
        return prob


class FraudAutoencoder(nn.Module):
    """
    Deep Autoencoder for Unsupervised Zero-Day Anomaly Detection.
    Measures reconstruction error ||X - X_hat||^2.
    """
    def __init__(self, input_dim=7, latent_dim=3):
        super(FraudAutoencoder, self).__init__()
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 16),
            nn.LeakyReLU(0.1),
            nn.Linear(16, latent_dim),
            nn.LeakyReLU(0.1)
        )
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 16),
            nn.LeakyReLU(0.1),
            nn.Linear(16, input_dim)
        )

    def forward(self, x):
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed

    def anomaly_score(self, x):
        with torch.no_grad():
            reconstructed = self.forward(x)
            mse = torch.mean((x - reconstructed) ** 2, dim=1)
            return mse
