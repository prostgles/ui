import os
import tempfile
import logging
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration

# Options: tiny, base, small, medium, large-v2,  large-v3, whisper-large-v3-ct2, distil-whisper-large-v3
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")  
# cpu or cuda
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")  
# int8, float16
# COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")  
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "float16" if DEVICE == "cuda" else "int8")

LANGUAGE = os.environ.get("WHISPER_LANGUAGE", None)  # e.g., "en" for English, None for auto-detect

# Initialize the model (lazy loading)
model = None

def get_model():
    global model
    if model is None:
        logger.info(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE} with {COMPUTE_TYPE}. Language: {LANGUAGE}")
        model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
        logger.info("Model loaded successfully")
    return model

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    
    if audio_file.filename == '':
        return jsonify({'error': 'No audio file selected'}), 400
    

    try:
        # Parse user options from form data
        task = request.form.get('task', 'transcribe')  # transcribe or translate
        initial_prompt = request.form.get('initial_prompt', None)
        word_timestamps = request.form.get('word_timestamps', 'false').lower() == 'true'

        # Save the uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        logger.info(f"Processing audio file: {tmp_path}")
        
        # Get the model and transcribe
        whisper_model = get_model()
        segments, info = whisper_model.transcribe(
            tmp_path, 
            language=LANGUAGE,
            task=task,
            beam_size=5,
            vad_filter=True,
            initial_prompt=initial_prompt,
            word_timestamps=word_timestamps
        )
        
        # Collect all segments
        transcription = ""
        segments_list = []
        for segment in segments:
            transcription += segment.text
            segments_list.append({
                'start': round(segment.start, 2),
                'end': round(segment.end, 2),
                'text': segment.text
            })
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        logger.info(f"Transcription complete. Detected language: {info.language}")
        
        return jsonify({
            'success': True,
            'transcription': transcription.strip(),
            'language': info.language,
            'language_probability': round(info.language_probability, 2),
            'segments': segments_list
        })
        
    except Exception as e:
        logger.error(f"Error during transcription: {str(e)}")
        # Clean up temp file if it exists
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    # Preload model on startup (optional - comment out for faster startup)
    logger.info("Starting Voice Recorder STT Server...")
    get_model()  # Preload the model
    app.run(host='0.0.0.0', port=8000, debug=False)

