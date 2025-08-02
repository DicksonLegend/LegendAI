import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='.')

# Configure CORS for production - Railway deployment
CORS(app, origins=["*"])  # For Railway, we need to allow all origins

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up the Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    logger.error("Groq API key not found in environment variables")
    raise ValueError("Groq API key is required")

# Initialize Groq client with error handling
client = None
MODEL_NAME = "llama3-8b-8192"

def initialize_groq_client():
    global client
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        logger.info("Groq client initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")
        return False

# Try to initialize the client
if not initialize_groq_client():
    logger.warning("Groq client not initialized - some endpoints may not work")

# Serve static files (HTML, CSS, JS)
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory('.', path)
    except Exception as e:
        logger.error(f"Error serving static file {path}: {e}")
        return jsonify({"error": "File not found"}), 404

@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    """Main chat endpoint"""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    # Check if client is initialized
    if client is None:
        logger.error("Groq client not initialized")
        return jsonify({
            "error": "AI service not available. Please check configuration.",
            "details": "Groq client initialization failed"
        }), 503
    
    try:
        logger.info(f"Received request: {request.method} {request.url}")
        
        if not request.is_json:
            logger.warning("Non-JSON request received")
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json()
        logger.info(f"Request data: {data}")
        
        user_message = data.get("message", "").strip()

        if not user_message:
            logger.warning("Empty message received")
            return jsonify({"error": "Message is required and cannot be empty"}), 400

        if len(user_message) > 2000:
            logger.warning(f"Message too long: {len(user_message)} characters")
            return jsonify({"error": "Message too long. Please keep it under 2000 characters."}), 400

        logger.info(f"Processing message: {user_message[:50]}...")

        # Generate response from Groq
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system", 
                    "content": "You are LegendAI, a helpful and friendly AI assistant. You are knowledgeable, supportive, and always ready to help users with their questions. Keep your responses conversational and engaging."
                },
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1000,
            top_p=0.8,
            frequency_penalty=0,
            presence_penalty=0
        )

        reply = response.choices[0].message.content.strip()
        logger.info("Successfully generated response from Groq")
        
        return jsonify({
            "response": reply,
            "status": "success"
        })

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        
        if "api_key" in str(e).lower():
            return jsonify({
                "error": "Groq API key issue. Please check your API key.",
                "details": str(e)
            }), 500
        elif "rate_limit" in str(e).lower():
            return jsonify({
                "error": "Rate limit exceeded. Please try again later.",
                "details": str(e)
            }), 429
        elif "model" in str(e).lower():
            return jsonify({
                "error": "Model not available. Please check your model access.",
                "details": str(e)
            }), 500
        else:
            return jsonify({
                "error": "An internal error occurred. Please try again later.",
                "details": str(e)
            }), 500

@app.route("/test", methods=["GET"])
def test_groq():
    """Test endpoint to check Groq connection"""
    if client is None:
        return jsonify({
            "status": "error",
            "message": "Groq client not initialized",
            "error": "Client initialization failed"
        }), 500
    
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "user", "content": "Hello, this is a test message."}
            ],
            max_tokens=50
        )
        
        return jsonify({
            "status": "success",
            "message": "Groq connection working",
            "test_response": response.choices[0].message.content.strip(),
            "model": MODEL_NAME
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Groq connection failed",
            "error": str(e)
        }), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for Railway"""
    return jsonify({
        "status": "healthy",
        "service": "LegendAI",
        "model": MODEL_NAME,
        "api_key_loaded": GROQ_API_KEY is not None,
        "client_initialized": client is not None
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

if __name__ == "__main__":
    # Use Railway's PORT environment variable
    port = int(os.environ.get("PORT", 5001))
    # Bind to 0.0.0.0 for Railway (not 127.0.0.1)
    app.run(host="0.0.0.0", port=port, debug=False)
