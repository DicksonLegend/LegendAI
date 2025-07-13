from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
from groq import Groq
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Configure CORS properly for your Live Server
CORS(app, origins=["http://127.0.0.1:5501", "http://localhost:5501"], 
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up the Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Check if API key is loaded
if not GROQ_API_KEY:
    logger.error("Groq API key not found in environment variables")
    raise ValueError("Groq API key is required")

print(f"API Key loaded: {GROQ_API_KEY is not None}")

# Import Groq
try:
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    logger.info("Groq client initialized successfully")
except ImportError:
    logger.error("Groq library not installed. Run: pip install groq")
    raise

# Model configuration - Available Groq models
MODEL_NAME = "llama3-8b-8192"  # You can also use: "llama3-70b-8192", "mixtral-8x7b-32768", "gemma-7b-it"

@app.route("/", methods=["GET"])
def home():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "AI Chatbot API is running",
        "model": MODEL_NAME,
        "api_key_loaded": GROQ_API_KEY is not None,
        "provider": "Groq"
    })

@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    """Main chat endpoint"""
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    try:
        # Log the incoming request
        logger.info(f"Received request: {request.method} {request.url}")
        logger.info(f"Request headers: {dict(request.headers)}")
        
        # Validate request
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
            "reply": reply,
            "status": "success"
        })

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        
        # Return a more specific error message for debugging
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
                "details": str(e) if app.debug else "Internal server error"
            }), 500

@app.route("/test", methods=["GET"])
def test_groq():
    """Test endpoint to check Groq connection"""
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

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

if __name__ == "__main__":
    # Check if running in debug mode
    debug_mode = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    
    logger.info(f"Starting Flask app in {'debug' if debug_mode else 'production'} mode")
    logger.info(f"Using Groq model: {MODEL_NAME}")
    
    app.run(debug=debug_mode, host="127.0.0.1", port=5001)