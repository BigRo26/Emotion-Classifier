from app import app

if __name__ == "__main__":
    print("Starting Emotion Classifier Backend...")
    print("Server will be available at: http://127.0.0.1:5000")
    print("Press Ctrl+C to stop the server")
    app.run(debug=True, host="0.0.0.0", port=5000)
