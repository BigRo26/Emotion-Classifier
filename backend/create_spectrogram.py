import os
import numpy as np
import matplotlib
matplotlib.use('Agg')  
import matplotlib.pyplot as plt
import librosa
import librosa.display

def get_spectrogram(audio_path, output_dir=None):
    try:
        y, sr = librosa.load(audio_path, sr=None, mono=True)
    except Exception as e:
        raise RuntimeError(
            f"Failed to decode audio file '{os.path.basename(audio_path)}'. "
            "If you're using MP3, please install FFmpeg or upload a WAV/OGG/FLAC file. "
            f"Underlying error: {repr(e)}"
        )

    mel_spectrogram = librosa.feature.melspectrogram(y=y, sr=sr)
    mel_spectrogram_db = librosa.power_to_db(mel_spectrogram, ref=np.max)

    plt.figure(figsize=(10, 4))
    librosa.display.specshow(mel_spectrogram_db, x_axis='time', y_axis='mel', sr=sr)
    plt.axis("off")
    plt.tight_layout()

    # Save PNG next to the provided audio file by default 
    spectrogram_dir = output_dir or os.path.dirname(audio_path)
    os.makedirs(spectrogram_dir, exist_ok=True)
    
    # Generate unique filename
    base_name = os.path.splitext(os.path.basename(audio_path))[0]
    spectrogram_filename = f"{base_name}_spectrogram.png"
    spectrogram_path = os.path.join(spectrogram_dir, spectrogram_filename)
    
    plt.savefig(spectrogram_path, bbox_inches="tight", pad_inches=0, dpi=150)
    plt.close()
    
    return spectrogram_path

