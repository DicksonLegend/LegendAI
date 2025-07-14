web: gunicorn app:app

# railway.json (optional Railway configuration file)
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "gunicorn app:app",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}

# .env.example (create this for reference, don't deploy it)
GROQ_API_KEY=your_groq_api_key_here
PORT=5001
