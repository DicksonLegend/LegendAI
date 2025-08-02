# LegendAI - Your Personal AI Assistant 🤖

![LegendAI](https://img.shields.io/badge/LegendAI-Personal%20Assistant-blue)
![Python](https://img.shields.io/badge/Python-3.11-green)
![Flask](https://img.shields.io/badge/Flask-3.0.0-red)
![License](https://img.shields.io/badge/License-MIT-yellow)

LegendAI is a modern, responsive AI chatbot built with Flask and powered by Groq's advanced language models. It features a sleek interface with voice capabilities, dark/light themes, and persistent chat sessions.

## ✨ Features

### 🎯 Core Features
- **AI-Powered Conversations**: Powered by Groq's Llama3-8b model for intelligent responses
- **Real-time Chat**: Instant messaging with typing indicators
- **Multiple Chat Sessions**: Create, manage, and switch between different conversations
- **Persistent Storage**: Chat history saved locally using browser storage

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface inspired by modern chat applications
- **Dark/Light Theme**: Toggle between themes with persistent preference storage
- **Mobile Responsive**: Optimized for desktop, tablet, and mobile devices
- **Voice Integration**: Text-to-speech and speech-to-text capabilities

### 🔧 Technical Features
- **Flask Backend**: Robust Python web server with RESTful API
- **CORS Enabled**: Cross-origin resource sharing for flexible deployment
- **Error Handling**: Comprehensive error handling and logging
- **Production Ready**: Configured for deployment on Railway and other platforms

## 🚀 Live Demo

Visit the live application: [LegendAI on Railway](https://web-production-298a.up.railway.app)

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## 🛠️ Installation

### Prerequisites

- Python 3.11+
- pip (Python package manager)
- Groq API key ([Get one here](https://console.groq.com/))

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/DicksonLegend/LegendAI.git
   cd LegendAI
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Open your browser**
   Navigate to `http://localhost:5001`

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GROQ_API_KEY` | Your Groq API key for AI model access | Yes | None |
| `PORT` | Port for the Flask application | No | 5001 |

### Groq API Setup

1. Visit [Groq Console](https://console.groq.com/)
2. Create an account or sign in
3. Generate an API key
4. Add the key to your `.env` file

## 📖 Usage

### Basic Chat

1. Open the application in your browser
2. Type your message in the input field
3. Press Enter or click the send button
4. LegendAI will respond with helpful information

### Voice Features

- **Voice Input**: Click the microphone button to speak your message
- **Text-to-Speech**: Click the speaker button on any AI response to hear it spoken
- **Voice Settings**: Customize speech rate, pitch, and voice selection

### Chat Management

- **New Chat**: Click "New Chat" to start a fresh conversation
- **Chat History**: Previous conversations are saved and accessible from the sidebar
- **Rename Chats**: Right-click on any chat to rename it
- **Delete Chats**: Remove unwanted conversations

### Themes

- Toggle between light and dark themes using the moon/sun icon
- Theme preference is automatically saved

## 🔌 API Endpoints

### POST /chat
Send a message to the AI assistant.

**Request Body:**
```json
{
  "message": "Your message here"
}
```

**Response:**
```json
{
  "response": "AI response here",
  "status": "success"
}
```

### GET /health
Check the health status of the application.

**Response:**
```json
{
  "status": "healthy",
  "service": "LegendAI",
  "model": "llama3-8b-8192",
  "api_key_loaded": true,
  "client_initialized": true
}
```

### GET /test
Test the Groq API connection.

**Response:**
```json
{
  "status": "success",
  "message": "Groq connection working",
  "test_response": "Test response from AI",
  "model": "llama3-8b-8192"
}
```

## 🚀 Deployment

### Railway Deployment

This project is configured for easy deployment on Railway.

1. **Fork the repository**
2. **Connect to Railway**
   - Visit [Railway](https://railway.app)
   - Create a new project from GitHub
   - Select your forked repository

3. **Set environment variables**
   - Add `GROQ_API_KEY` in Railway's environment variables

4. **Deploy**
   - Railway will automatically deploy using the `Procfile`

### Other Platforms

The application can be deployed on any platform that supports Python Flask applications:

- **Heroku**: Use the included `Procfile`
- **Vercel**: Configure with a `vercel.json` file
- **DigitalOcean**: Deploy using App Platform
- **AWS/GCP/Azure**: Use their respective Python hosting services

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5001
CMD ["gunicorn", "app:app", "--host", "0.0.0.0", "--port", "5001"]
```

Build and run:
```bash
docker build -t legendai .
docker run -p 5001:5001 --env-file .env legendai
```

## 💻 Development

### Project Structure

```
LegendAI/
├── app.py              # Flask backend application
├── index.html          # Main HTML file
├── script.js           # Frontend JavaScript
├── styles.css          # CSS styling
├── requirements.txt    # Python dependencies
├── Procfile           # Railway deployment config
├── runtime.txt        # Python version specification
├── .env               # Environment variables (not in repo)
└── README.md          # This file
```

### Frontend Technologies

- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript**: Vanilla JS for interactivity
- **Font Awesome**: Icon library
- **Web Speech API**: Voice recognition and synthesis

### Backend Technologies

- **Flask**: Lightweight Python web framework
- **Groq SDK**: Integration with Groq's AI models
- **Flask-CORS**: Cross-origin resource sharing
- **Gunicorn**: WSGI HTTP Server for production

### Development Commands

```bash
# Install development dependencies
pip install -r requirements.txt

# Run in development mode
python app.py

# Run with auto-reload (for development)
flask --app app run --debug

# Check code style
flake8 app.py

# Run tests (if you add them)
python -m pytest
```

### Adding New Features

1. **Frontend**: Modify `script.js` for new functionality
2. **Styling**: Update `styles.css` for visual changes
3. **Backend**: Add new routes in `app.py`
4. **Dependencies**: Update `requirements.txt` for new packages

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Contribution Guidelines

- Follow PEP 8 for Python code
- Use meaningful commit messages
- Add comments for complex functionality
- Test your changes thoroughly
- Update documentation if needed

### Issues and Bug Reports

- Use the GitHub issue tracker
- Provide detailed descriptions
- Include steps to reproduce
- Add screenshots if applicable

## 🙏 Acknowledgments

- **Groq**: For providing the AI model API
- **Font Awesome**: For the beautiful icons
- **Flask Community**: For the excellent web framework
- **Railway**: For easy deployment hosting

## 📞 Support

If you have any questions or need help:

- 📧 Create an issue on GitHub
- 💬 Start a discussion in the repository
- 🌟 Star the repository if you find it helpful

## 🔮 Roadmap

- [ ] User authentication and accounts
- [ ] Custom AI model fine-tuning
- [ ] File upload and analysis
- [ ] Integration with external APIs
- [ ] Mobile app development
- [ ] Multi-language support

---

<div align="center">
  <strong>Built with ❤️ by <a href="https://github.com/DicksonLegend">DicksonLegend</a></strong>
</div>

<div align="center">
  <a href="#top">⬆️ Back to Top</a>
</div>
