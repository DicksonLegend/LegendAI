let isLoading = false;
let currentTheme = 'light';
let messageHistory = [];
let currentSpeech = null;
let currentChatId = null;
let chatSessions = {};

const API_BASE_URL = 'https://web-production-298a.up.railway.app';
const STORAGE_KEYS = {
    CHAT_SESSIONS: 'legendai_chat_sessions',
    CURRENT_CHAT: 'legendai_current_chat',
    USER_DATA: 'legendai_user_data',
    THEME: 'legendai_theme'
};

// Storage utility functions
const Storage = {
    // Check if localStorage is available
    isAvailable() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Get item from localStorage with fallback
    getItem(key, defaultValue = null) {
        if (!this.isAvailable()) {
            return defaultValue;
        }
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn(`Error reading from localStorage for key ${key}:`, e);
            return defaultValue;
        }
    },
    
    // Set item in localStorage with fallback
    setItem(key, value) {
        if (!this.isAvailable()) {
            console.warn('localStorage not available, data will not persist');
            return false;
        }
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn(`Error writing to localStorage for key ${key}:`, e);
            return false;
        }
    },
    
    // Remove item from localStorage
    removeItem(key) {
        if (!this.isAvailable()) {
            return false;
        }
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn(`Error removing from localStorage for key ${key}:`, e);
            return false;
        }
    },
    
    // Clear all app data
    clearAll() {
        if (!this.isAvailable()) {
            return false;
        }
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (e) {
            console.warn('Error clearing localStorage:', e);
            return false;
        }
    }
};

// Chat Session Management
function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createNewChatSession() {
    const chatId = generateChatId();
    const timestamp = new Date().toISOString();
    
    chatSessions[chatId] = {
        id: chatId,
        title: 'New Chat',
        messages: [],
        createdAt: timestamp,
        updatedAt: timestamp
    };
    
    currentChatId = chatId;
    messageHistory = [];
    
    saveChatSessions();
    Storage.setItem(STORAGE_KEYS.CURRENT_CHAT, currentChatId);
    updateSidebarChatList();
    
    return chatId;
}

function loadChatSession(chatId) {
    if (!chatSessions[chatId]) {
        console.warn('Chat session not found:', chatId);
        return;
    }
    
    currentChatId = chatId;
    messageHistory = chatSessions[chatId].messages || [];
    
    // Update current chat in storage
    Storage.setItem(STORAGE_KEYS.CURRENT_CHAT, currentChatId);
    
    // Update UI
    updateSidebarChatList();
    displayChatHistory();
}

function saveChatSessions() {
    Storage.setItem(STORAGE_KEYS.CHAT_SESSIONS, chatSessions);
}

function loadChatSessions() {
    chatSessions = Storage.getItem(STORAGE_KEYS.CHAT_SESSIONS, {});
    currentChatId = Storage.getItem(STORAGE_KEYS.CURRENT_CHAT, null);
    
    // If no current chat or it doesn't exist, create new one
    if (!currentChatId || !chatSessions[currentChatId]) {
        createNewChatSession();
    } else {
        messageHistory = chatSessions[currentChatId].messages || [];
    }
}

function updateChatTitle(chatId, newTitle) {
    if (chatSessions[chatId]) {
        chatSessions[chatId].title = newTitle;
        chatSessions[chatId].updatedAt = new Date().toISOString();
        saveChatSessions();
        updateSidebarChatList();
    }
}

function deleteChatSession(chatId) {
    if (!chatSessions[chatId]) return;
    
    delete chatSessions[chatId];
    saveChatSessions();
    
    // If deleting current chat, create new one
    if (currentChatId === chatId) {
        createNewChatSession();
        showWelcomeScreen();
    }
    
    updateSidebarChatList();
}

function updateSidebarChatList() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    // Find or create chat list container
    let chatListContainer = document.getElementById('chatListContainer');
    if (!chatListContainer) {
        chatListContainer = document.createElement('div');
        chatListContainer.id = 'chatListContainer';
        chatListContainer.className = 'chat-list-container';
        
        // Insert after the new chat button
        const newChatBtn = sidebar.querySelector('.new-chat-btn') || sidebar.querySelector('[onclick="newChat()"]');
        if (newChatBtn) {
            newChatBtn.parentNode.insertBefore(chatListContainer, newChatBtn.nextSibling);
        } else {
            sidebar.appendChild(chatListContainer);
        }
    }
    
    // Clear existing chat list
    chatListContainer.innerHTML = '';
    
    // Get sorted chat sessions (newest first)
    const sortedChats = Object.values(chatSessions).sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    
    // Add each chat to the list
    sortedChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${currentChatId === chat.id ? 'active' : ''}`;
        
        // Generate preview text from first message
        const previewText = chat.messages.length > 0 
            ? chat.messages[0].content.substring(0, 30) + (chat.messages[0].content.length > 30 ? '...' : '')
            : 'New chat';
        
        chatItem.innerHTML = `
            <div class="chat-item-content" onclick="loadChatSession('${chat.id}')">
                <div class="chat-title">${chat.title}</div>
                <div class="chat-preview">${previewText}</div>
                <div class="chat-time">${formatTime(chat.updatedAt)}</div>
            </div>
            <div class="chat-actions">
                <button class="chat-action-btn" onclick="renameChatSession('${chat.id}')" title="Rename">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="chat-action-btn delete-btn" onclick="deleteChatSession('${chat.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        chatListContainer.appendChild(chatItem);
    });
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function renameChatSession(chatId) {
    const chat = chatSessions[chatId];
    if (!chat) return;
    
    const newTitle = prompt('Enter new chat title:', chat.title);
    if (newTitle && newTitle.trim()) {
        updateChatTitle(chatId, newTitle.trim());
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeEventListeners();
    loadUserData();
    loadChatSessions(); // Load chat sessions instead of single history
    displayChatHistory();
    focusInput();
    
    // Fix scrolling issues
    fixScrolling();
});

function fixScrolling() {
    const chatMessages = document.getElementById('chatMessages');
        
    // Ensure the chat messages container is properly configured for scrolling
    chatMessages.style.overflowY = 'auto';
    chatMessages.style.overflowX = 'hidden';
    chatMessages.style.height = '100%';
    
    // Force scrollbar to be visible
    chatMessages.style.scrollbarWidth = 'thin';
    
    // Add manual scroll handling
    chatMessages.addEventListener('wheel', function(e) {
        // Allow manual scrolling
        e.stopPropagation();
    });
    
    // Add touch scrolling for mobile
    let startY = 0;
    chatMessages.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    });
    
    chatMessages.addEventListener('touchmove', function(e) {
        e.stopPropagation();
    });
}

function initializeTheme() {
    // Load theme from localStorage
    const savedTheme = Storage.getItem(STORAGE_KEYS.THEME, 'light');
    currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function loadUserData() {
    // Load user data from localStorage
    const userData = Storage.getItem(STORAGE_KEYS.USER_DATA, {
        name: 'Legend',
        lastGoal: 'Learn something new today',
        lastQuestion: 'How to stay motivated?'
    });

    // Update welcome message
    const welcomeTitle = document.getElementById('welcomeTitle');
    const welcomeSubtitle = document.getElementById('welcomeSubtitle');
    
    if (welcomeTitle && userData.name) {
        welcomeTitle.textContent = `Welcome back, ${userData.name}!`;
        welcomeSubtitle.textContent = 'Ready to continue from where we left off?';
    }
}

function saveUserData(data) {
    // Save user data to localStorage
    const success = Storage.setItem(STORAGE_KEYS.USER_DATA, data);
    if (success) {
        console.log('User data saved successfully');
    } else {
        console.log('User data saved to memory only');
    }
}

function loadChatHistory() {
    // This is now handled by loadChatSessions()
    if (messageHistory.length > 0) {
        displayChatHistory();
    } else {
        showWelcomeScreen();
    }
}

function saveChatHistory() {
    // Save current chat session
    if (currentChatId && chatSessions[currentChatId]) {
        chatSessions[currentChatId].messages = messageHistory;
        chatSessions[currentChatId].updatedAt = new Date().toISOString();
        
        // Auto-generate title from first message if still "New Chat"
        if (chatSessions[currentChatId].title === 'New Chat' && messageHistory.length > 0) {
            const firstUserMessage = messageHistory.find(msg => msg.sender === 'user');
            if (firstUserMessage) {
                const title = firstUserMessage.content.substring(0, 30) + 
                            (firstUserMessage.content.length > 30 ? '...' : '');
                chatSessions[currentChatId].title = title;
            }
        }
        
        saveChatSessions();
        updateSidebarChatList();
    }
}

function displayChatHistory() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Clear existing content
    chatMessages.innerHTML = '';
    
    // Display each message from history
    messageHistory.forEach(message => {
        addMessageToDOM(message.content, message.sender, false); // false = don't save to history again
    });
    
    // Scroll to bottom
    setTimeout(() => scrollToBottom(), 100);
}

function showWelcomeScreen() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = `
        <div class="welcome-screen" id="welcomeScreen">
            <div class="welcome-icon">
                <i class="fas fa-robot"></i>
            </div>
            <h1 class="welcome-title">Welcome back, Legend!</h1>
            <p class="welcome-subtitle">Ready to continue from where we left off?</p>
            
            <div class="example-prompts">
                <div class="example-prompt" onclick="usePrompt('🎯 Set a goal today')">
                    <div class="example-prompt-title">🎯 Set a goal today</div>
                    <div class="example-prompt-desc">Let's plan something amazing</div>
                </div>
                <div class="example-prompt" onclick="usePrompt('🧘 Need a break tip?')">
                    <div class="example-prompt-title">🧘 Need a break tip?</div>
                    <div class="example-prompt-desc">Quick relaxation ideas</div>
                </div>
                <div class="example-prompt" onclick="usePrompt('💬 Inspire me with a quote')">
                    <div class="example-prompt-title">💬 Inspire me with a quote</div>
                    <div class="example-prompt-desc">Daily motivation boost</div>
                </div>
            </div>
        </div>
    `;
}

function clearAllChatHistory() {
    // Clear all chat sessions
    chatSessions = {};
    Storage.removeItem(STORAGE_KEYS.CHAT_SESSIONS);
    Storage.removeItem(STORAGE_KEYS.CURRENT_CHAT);
    
    // Create new chat session
    createNewChatSession();
    showWelcomeScreen();
    
    console.log('All chat history cleared');
}

function exportChatHistory() {
    // Export current chat history as JSON
    if (messageHistory.length === 0) {
        alert('No chat history to export');
        return;
    }
    
    const currentChat = chatSessions[currentChatId];
    const exportData = {
        exportDate: new Date().toISOString(),
        chatTitle: currentChat ? currentChat.title : 'Unknown Chat',
        messageCount: messageHistory.length,
        messages: messageHistory
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legendai_chat_${currentChatId}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportAllChats() {
    // Export all chat sessions
    if (Object.keys(chatSessions).length === 0) {
        alert('No chat sessions to export');
        return;
    }
    
    const exportData = {
        exportDate: new Date().toISOString(),
        totalChats: Object.keys(chatSessions).length,
        chatSessions: chatSessions
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legendai_all_chats_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function initializeEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const overlay = document.getElementById('overlay');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    if (overlay) {
        overlay.addEventListener('click', closeMobileMenu);
    }
    
    // Voice controls
    const voiceToggle = document.getElementById('voiceToggle');
    const voiceSettings = document.getElementById('voiceSettings');
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    
    if (voiceToggle) {
        voiceToggle.addEventListener('click', toggleVoiceAssistant);
    }
    if (voiceSettings) {
        voiceSettings.addEventListener('click', openVoiceSettings);
    }
    if (voiceInputBtn) {
        voiceInputBtn.addEventListener('click', startVoiceInput);
    }
    
    // Input handlers
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keydown', handleKeyPress);
        userInput.addEventListener('input', autoResize);
    }
    
    // Send button
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    // Window resize
    window.addEventListener('resize', handleResize);
    
    // Add clear history button listener if it exists
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
                clearAllChatHistory();
            }
        });
    }
    
    // Add export history button listener if it exists
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    if (exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', exportChatHistory);
    }
    
    // Add export all chats button listener if it exists
    const exportAllBtn = document.getElementById('exportAllBtn');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllChats);
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    
    // Save theme to localStorage
    Storage.setItem(STORAGE_KEYS.THEME, currentTheme);
}

function updateThemeIcon() {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

function toggleVoiceAssistant() {
    const voiceToggle = document.getElementById('voiceToggle');
    const voiceStatus = document.getElementById('voiceStatus');
    
    if (voiceToggle && voiceStatus) {
        voiceToggle.classList.toggle('active');
        voiceStatus.classList.toggle('active');
        
        // Update voice status indicator
        const indicator = voiceStatus.querySelector('.voice-indicator');
        const isActive = voiceToggle.classList.contains('active');
        
        if (indicator) {
            if (isActive) {
                indicator.innerHTML = '<i class="fas fa-microphone"></i><span>Voice Assistant Active</span>';
            } else {
                indicator.innerHTML = '<i class="fas fa-microphone-slash"></i><span>Voice Assistant Inactive</span>';
            }
        }
    }
}

function openVoiceSettings() {
    const modal = document.getElementById('voiceModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeVoiceSettings() {
    const modal = document.getElementById('voiceModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function startVoiceInput() {
    const voiceBtn = document.getElementById('voiceInputBtn');
    
    if (!voiceBtn) return;
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        voiceBtn.classList.add('listening');
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const userInput = document.getElementById('user-input');
            if (userInput) {
                userInput.value = transcript;
                autoResize();
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            voiceBtn.classList.add('error');
        };
        
        recognition.onend = function() {
            voiceBtn.classList.remove('listening', 'error');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };
        
        recognition.start();
    } else {
        alert('Speech recognition not supported in this browser');
    }
}

function handleResize() {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
}

function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading) {
            sendMessage();
        }
    }
}

function autoResize() {
    const textarea = document.getElementById('user-input');
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
}

function focusInput() {
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.focus();
    }
}

function usePrompt(prompt) {
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.value = prompt;
        autoResize();
        sendMessage();
    }
}

function newChat() {
    // Create new chat session
    createNewChatSession();
    showWelcomeScreen();
    focusInput();
}

async function sendMessage() {
    if (isLoading) return;
    
    const userInput = document.getElementById('user-input');
    if (!userInput) return;
    
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Save user data
    saveUserData({
        name: 'Legend',
        lastQuestion: message,
        timestamp: new Date().toISOString()
    });
    
    // Hide welcome screen
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.remove();
    }
    
    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Call your Flask API with the full URL
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: messageHistory.slice(-10) // Send last 10 messages for context
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        hideTypingIndicator();
        
        // Add safety check for API response
        const botReply = data.reply || data.response || data.message || 'I received your message but couldn\'t generate a proper response.';
        
        // Add bot response from API
        addMessage(botReply, 'bot');
        
    } catch (error) {
        console.error('Error calling API:', error);
        hideTypingIndicator();
        
        // More specific error handling
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        if (error.message.includes('429')) {
            errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message.includes('401')) {
            errorMessage = 'Authentication error. Please check the API configuration.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        // Fallback to default response if API fails
        let fallbackResponse = generateResponse(message);
        addMessage(`${errorMessage}\n\n${fallbackResponse}`, 'bot');
    }
    
    focusInput();
}

function generateResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // HTML related responses
    if (lowerMessage.includes('html') || lowerMessage.includes('basic html')) {
        return "I'd be happy to help you with HTML! Here's a basic HTML structure:\n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n    <title>My Page</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n    <p>This is a paragraph.</p>\n</body>\n</html>\n```\n\nWhat specific HTML elements or concepts would you like to learn about?";
    }
    
    // Sunscreen related responses
    if (lowerMessage.includes('sunscreen') || lowerMessage.includes('sun screen')) {
        return "Sunscreen is a topical product that helps protect your skin from harmful UV rays from the sun. Here are the key things to know:\n\n• **SPF (Sun Protection Factor)**: Look for SPF 30 or higher\n• **Broad spectrum**: Protects against both UVA and UVB rays\n• **Application**: Apply 15-30 minutes before sun exposure\n• **Reapplication**: Every 2 hours, or after swimming/sweating\n• **Amount**: Use about 1 ounce (2 tablespoons) for your whole body\n\nRegular sunscreen use helps prevent sunburn, skin aging, and reduces skin cancer risk.";
    }
    
    // Greeting responses
    if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
        return "Hi there, Legend! Great to see you! How can I help you today? Whether you need help with coding, have questions about various topics, or just want to chat, I'm here for you! (Powered by Groq AI)";
    }
    
    // Goal setting responses
    if (lowerMessage.includes('goal') || lowerMessage.includes('🎯')) {
        return "That's fantastic, Legend! Setting goals is the first step to achieving greatness. What specific goal would you like to work on today? Whether it's learning a new skill, improving a habit, or tackling a project, I'm here to help you break it down into actionable steps!";
    }
    
    // Break/relaxation responses
    if (lowerMessage.includes('break') || lowerMessage.includes('relax') || lowerMessage.includes('🧘')) {
        return "Absolutely, Legend! Taking breaks is crucial for productivity and well-being. Here's a quick tip: Try the 4-7-8 breathing technique - inhale for 4 counts, hold for 7, exhale for 8. It's perfect for instant relaxation. You could also step away from your screen, stretch, or take a 5-minute walk. What type of break sounds good to you right now?";
    }
    
    // Inspiration/quote responses  
    if (lowerMessage.includes('inspire') || lowerMessage.includes('quote') || lowerMessage.includes('💬')) {
        return "Here's some inspiration for you, Legend: 'The only impossible journey is the one you never begin.' - Tony Robbins. Remember, every expert was once a beginner, and every pro was once an amateur. Your journey to greatness starts with the next step you take. What step will you take today?";
    }
    
    // Default response for unmatched queries
    return "That's an interesting question, Legend! I'm here to help you with whatever you need. Could you tell me a bit more about what you're looking for? Whether it's coding help, general information, or something else entirely, I'll do my best to assist you! (Note: I'm currently running on Groq AI for faster responses)";
}

function addMessage(content, sender) {
    // Add safety check for content
    if (content === undefined || content === null) {
        console.warn('addMessage received undefined/null content');
        content = 'Message content unavailable';
    }
    
    // Add to DOM and save to history
    addMessageToDOM(content, sender, true);
}

function addMessageToDOM(content, sender, saveToHistory = true) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Safety check for content
    if (content === undefined || content === null) {
        console.warn('addMessageToDOM received undefined/null content');
        content = 'Message content unavailable';
    }
    
    // Ensure content is a string
    content = String(content);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const isUser = sender === 'user';
    const avatar = isUser ? 'You' : 'LegendAI';
    const avatarClass = isUser ? 'user-avatar' : 'bot-avatar';
    
    // Escape quotes for onclick handler
    const escapedContent = content.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const voiceButton = isUser ? '' : `<button class="voice-btn" onclick="speakMessage(this, '${escapedContent}')"><i class="fas fa-volume-up"></i></button>`;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="avatar ${avatarClass}">
                ${isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}
            </div>
            <span class="sender-name">${avatar}</span>
        </div>
        <div class="message-content">
            ${formatMessage(content)}
            ${voiceButton}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Store in history and save to localStorage
    if (saveToHistory) {
        messageHistory.push({ 
            sender, 
            content, 
            timestamp: new Date().toISOString() 
        });
        saveChatHistory();
    }
    
    // Force scroll after DOM update
    requestAnimationFrame(() => {
        scrollToBottom();
    });
}

function formatMessage(content) {
    // Add safety check for undefined/null content
    if (!content || typeof content !== 'string') {
        console.warn('formatMessage received invalid content:', content);
        return String(content || ''); // Convert to string or empty string
    }
    
    // Simple formatting for better readability
    return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, '<pre style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; overflow-x: auto; font-family: monospace; margin: 8px 0;"><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
        .replace(/•/g, '&bull;');
}

function speakMessage(button, text) {
    // Safety check for text parameter
    if (!text || typeof text !== 'string') {
        console.warn('speakMessage received invalid text:', text);
        return;
    }
    
    // Stop current speech if any
    if (currentSpeech) {
        speechSynthesis.cancel();
        document.querySelectorAll('.voice-btn').forEach(btn => {
            btn.classList.remove('speaking');
            btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        });
        currentSpeech = null;
        
        // If clicking the same button, just stop
        if (button.classList.contains('speaking')) {
            return;
        }
    }
    
    // Clean text for speech (remove HTML and code blocks)
    const cleanText = text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/```[\s\S]*?```/g, 'code block') // Replace code blocks
        .replace(/`[^`]*`/g, 'code') // Replace inline code
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
        .replace(/&bull;/g, '') // Remove bullet points
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    
    // Don't speak if text is empty after cleaning
    if (!cleanText) {
        console.warn('No text to speak after cleaning');
        return;
    }
    
    // Create new speech
    currentSpeech = new SpeechSynthesisUtterance(cleanText);
    currentSpeech.rate = 0.9;
    currentSpeech.pitch = 1;
    currentSpeech.volume = 0.8;
    
    // Update button state
    button.classList.add('speaking');
    button.innerHTML = '<i class="fas fa-stop"></i>';
    
    // Handle speech end
    currentSpeech.onend = function() {
        button.classList.remove('speaking');
        button.innerHTML = '<i class="fas fa-volume-up"></i>';
        currentSpeech = null;
    };
    
    // Handle speech error
    currentSpeech.onerror = function(event) {
        console.error('Speech synthesis error:', event.error);
        button.classList.remove('speaking');
        button.innerHTML = '<i class="fas fa-volume-up"></i>';
        currentSpeech = null;
    };
    
    // Start speaking
    speechSynthesis.speak(currentSpeech);
}

function showTypingIndicator() {
    isLoading = true;
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'message';
    typingDiv.innerHTML = `
        <div class="message-header">
            <div class="avatar bot-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <span class="sender-name">LegendAI</span>
        </div>
        <div class="typing-indicator">
            <span>Thinking</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    
    // Disable send button
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
    }
}

function hideTypingIndicator() {
    isLoading = false;
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    
    // Re-enable send button
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.disabled = false;
    }
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Force scrolling with multiple attempts
    const forceScroll = () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        // Also try scrollIntoView on the last message
        const lastMessage = chatMessages.lastElementChild;
        if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    };
    
    // Multiple scroll attempts with different timings
    setTimeout(forceScroll, 50);
    setTimeout(forceScroll, 150);
    setTimeout(forceScroll, 300);
}
