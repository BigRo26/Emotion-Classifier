import os
from create_spectrogram import get_spectrogram
from torchvision.models import inception_v3, Inception_V3_Weights
from torch import nn
import torch
from PIL import Image
import torchvision.transforms as transforms
import torchvision
import torch.nn.functional as F

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = inception_v3(Inception_V3_Weights.DEFAULT)
model.to(device)

num_ftrs = model.fc.in_features
model.fc = nn.Linear(in_features=num_ftrs, out_features=7)

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "emotion_classifier.pth")
model.load_state_dict(torch.load(_MODEL_PATH, map_location="cpu"), strict=False)

class_names = ['anger', 'anxiety', 'boredom', 'disgust', 'happiness', 'neutral', 'sadness']

data_transforms = {
    "train": transforms.Compose([
        transforms.Resize(224),
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ]),
    "test": transforms.Compose([
        transforms.Resize(224),
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ])
}

def predict(audio):
    img_path = get_spectrogram(audio)
    pil_img = Image.open(img_path).convert("RGB") # Ensure image is in RGB format
    img_tensor = data_transforms["test"](pil_img).unsqueeze(0) # Add batch dimension
    img_tensor = img_tensor.to(device) # Move tensor to the correct device

    model.to(device) 
    model.eval() 
    with torch.inference_mode():
        pred = model(img_tensor)
        # If the model returns InceptionOutputs, get the main output
        if isinstance(pred, torchvision.models.inception.InceptionOutputs):
            pred = pred.logits
        pred_prob = torch.softmax(pred, dim=1) # Get prediction probabilities
        pred_label_idx = torch.argmax(pred_prob, dim=1).item() # Get the predicted class index
        pred_label = class_names[pred_label_idx] # Get the predicted class name

    return pred_label, pred_prob