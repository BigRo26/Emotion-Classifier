from flask import Flask, request, jsonify, send_file
from model import predict
from create_spectrogram import get_spectrogram
from flask_cors import CORS
import os
import tempfile
import uuid
import datetime

app = Flask(__name__)
CORS(app)

# Create a temporary directory for spectrograms
SPECTROGRAM_DIR = os.path.join(os.path.dirname(__file__), "spectrograms")
os.makedirs(SPECTROGRAM_DIR, exist_ok=True)

@app.before_request
def log_request_info():
    """Log all incoming requests for debugging"""
    print(f"Request: {request.method} {request.url}")
    print(f"Headers: {dict(request.headers)}")
    if request.method == 'POST':
        print(f"Form data keys: {list(request.form.keys())}")
        print(f"Files: {list(request.files.keys())}")

@app.route("/")
def home():
    return jsonify({
        "message": "Emotion Classifier Backend is running!",
        "endpoints": {
            "predict": "/predict",
            "spectrogram": "/spectrogram/<filename>",
            "health": "/health"
        }
    })

@app.route("/health")
def health_check():
    """Health check endpoint for debugging"""
    return jsonify({
        "status": "healthy",
        "timestamp": str(datetime.datetime.now()),
        "message": "Backend is running and accessible"
    })

@app.route("/predict", methods=["POST"])
def predict_emotion():
    print(f"Processing predict request with method: {request.method}")
    print(f"Request content type: {request.content_type}")
    
    if "audio" not in request.files:
        print("No audio file in request.files")
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files["audio"]
    if audio_file.filename == "":
        print("Empty filename")
        return jsonify({"error": "No audio file selected"}), 400
    
    try:
        print(f"Processing audio file: {audio_file.filename}")
        # Save uploaded file temporarily
        temp_filename = f"temp_{uuid.uuid4()}_{audio_file.filename}"
        temp_path = os.path.join(SPECTROGRAM_DIR, temp_filename)
        audio_file.save(temp_path)
        
        print(f"Saved temporary file: {temp_path}")
        
        # Create spectrogram
        spectrogram_path = get_spectrogram(temp_path)
        print(f"Created spectrogram: {spectrogram_path}")
        
        # Get prediction
        emotion, confidence = predict(temp_path)
        print(f"Prediction result: {emotion}, confidence: {confidence}")
        
        # Get spectrogram filename for frontend
        spectrogram_filename = os.path.basename(spectrogram_path)
        
        # Clean up temporary audio file
        os.remove(temp_path)
        
        result = {
            "emotion": emotion,
            "confidence": float(confidence.max().item()),
            "spectrogram": f"/spectrogram/{spectrogram_filename}",
            "all_probabilities": {
                'anger': float(confidence[0][0].item()),
                'anxiety': float(confidence[0][1].item()),
                'boredom': float(confidence[0][2].item()),
                'disgust': float(confidence[0][3].item()),
                'happiness': float(confidence[0][4].item()),
                'neutral': float(confidence[0][5].item()),
                'sadness': float(confidence[0][6].item())
            }
        }
        
        print(f"Returning result: {result}")
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in predict_emotion: {e}")
        import traceback
        traceback.print_exc()
        # Clean up on error
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        # Return structured error with hint for common cases
        return jsonify({
            "error": str(e),
            "hint": (
                "If this is an MP3 and decoding failed, install FFmpeg or use WAV/OGG/FLAC. "
                "Also ensure the uploaded file is valid audio."
            )
        }), 500

@app.route("/spectrogram/<filename>")
def get_spectrogram_file(filename):
    """Serve spectrogram images"""
    try:
        return send_file(os.path.join(SPECTROGRAM_DIR, filename))
    except FileNotFoundError:
        return jsonify({"error": "Spectrogram not found"}), 404

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)