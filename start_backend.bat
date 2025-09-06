@echo off
echo Starting Emotion Classifier Backend...
echo.
cd backend
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting server...
python run.py
pause
