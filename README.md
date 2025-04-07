# Hermes - AI Chatbot with RAG

A modern chatbot application that uses Retrieval-Augmented Generation (RAG) to provide context-aware responses. Built with React, Node.js, and Python.

## Features

- 🎨 Modern, responsive UI with dark theme
- 🔍 RAG-powered responses using document context
- 🎤 Voice input support
- 💬 Real-time chat interface
- 📊 Context relevance scoring
- 🤖 Powered by Ollama (phi3 model)

## Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- Ollama installed and running

## Project Structure

```
Hermes/
├── frontend/         # React frontend
├── backend/         # Node.js & Python backends
│   ├── data/       # PDF documents for RAG
│   └── utils/      # Python utilities
```

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Hermes
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   # Node.js backend
   cd ../backend
   npm install

   # Python backend
   pip install langchain chromadb sentence-transformers fastapi uvicorn
   ```

4. **Install and Start Ollama**
   ```bash
   # Install Ollama (if not already installed)
   curl https://ollama.ai/install.sh | sh

   # Pull the phi3 model
   ollama pull phi3
   ```

5. **Add your PDF documents**
   - Place your PDF files in `backend/data/` directory
   - Update the filename in `backend/rag_engine.py` if needed

## Running the Application

1. **Start Ollama (in a separate terminal)**
   ```bash
   ollama serve
   ```

2. **Start the Python Backend (in a separate terminal)**
   ```bash
   cd backend
   uvicorn rag_service:app --reload --port 5000
   ```

3. **Start the Node.js Backend (in a separate terminal)**
   ```bash
   cd backend
   npm run dev
   ```

4. **Start the Frontend (in a separate terminal)**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the Application**
   - Open your browser and navigate to `http://localhost:5173`

## Environment Variables

No environment variables are required for basic setup. All services use default ports:
- Frontend: Port 5173 (Vite default)
- Node.js Backend: Port 3000
- Python Backend: Port 5000
- Ollama: Port 11434 (default)

## Troubleshooting

1. **No Response from Chatbot**
   - Ensure Ollama is running and the phi3 model is downloaded
   - Check if all three services (Python, Node.js, Frontend) are running
   - Check the browser console and terminal for error messages

2. **PDF Context Issues**
   - Verify PDF files are present in `backend/data/`
   - Check Python backend logs for document loading status
   - Ensure PDF files are readable and not corrupted

3. **Voice Input Not Working**
   - Ensure browser has microphone permissions
   - Check if your browser supports the Web Speech API
   - Try using Chrome or Edge for best compatibility

## Contributing

Feel free to submit issues and enhancement requests!
