import { useState, useRef, useEffect } from 'react';
import {
    Box,
    Container,
    TextField,
    IconButton,
    Typography,
    Card,
    CircularProgress,
    Fade,
    Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';

// Rough token estimation (this is a simple approximation)
const estimateTokens = (text: string): number => {
    // Split on spaces and punctuation
    const words = text.trim().split(/[\s,.!?;:'"()\[\]{}]+/);
    // Rough estimate: 1 token per word, with some adjustment for short words
    return words.reduce((count, word) => {
        if (word.length <= 2) return count + 0.5;
        if (word.length >= 8) return count + 1.5;
        return count + 1;
    }, 0);
};

const truncateToTokenLimit = (text: string, limit: number = 100): string => {
    if (estimateTokens(text) <= limit) return text;

    let truncated = '';
    let currentTokens = 0;
    const words = text.split(/\s+/);

    for (const word of words) {
        const wordTokens = estimateTokens(word);
        if (currentTokens + wordTokens > limit) break;
        truncated += (truncated ? ' ' : '') + word;
        currentTokens += wordTokens;
    }

    return truncated + '...';
};

// Bot avatar SVG component
const BotAvatar = ({ size = 120 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <circle cx="60" cy="60" r="58" fill="#1A1D1F" stroke="#3DFFC5" strokeWidth="4" />
        <circle cx="60" cy="60" r="40" fill="#3DFFC5" fillOpacity="0.1" />
        <path d="M60 85C73.8071 85 85 73.8071 85 60C85 46.1929 73.8071 35 60 35C46.1929 35 35 46.1929 35 60C35 73.8071 46.1929 85 60 85Z" stroke="#3DFFC5" strokeWidth="3" />
        <circle cx="48" cy="55" r="4" fill="#3DFFC5" />
        <circle cx="72" cy="55" r="4" fill="#3DFFC5" />
        <path d="M48 70C48 70 52 75 60 75C68 75 72 70 72 70" stroke="#3DFFC5" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

interface Message {
    text: string;
    sender: 'user' | 'bot';
}

const VoiceWaveAnimation = ({ isListening }: { isListening: boolean }) => (
    <Box className={`voice-wave ${isListening ? 'listening' : ''}`} sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
        {[...Array(5)].map((_, i) => (
            <Box
                key={i}
                className="wave-bar"
                sx={{
                    width: '4px',
                    height: '20px',
                    backgroundColor: 'var(--primary)',
                    borderRadius: '2px',
                }}
            />
        ))}
    </Box>
);

const ChatBot = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [tokenCount, setTokenCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Update token count when input changes
    useEffect(() => {
        setTokenCount(Math.round(estimateTokens(input)));
    }, [input]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                handleSend(transcript);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };
        }
    }, []);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleSend = async (voiceInput?: string) => {
        const messageText = voiceInput || input;
        if (messageText.trim() && !isLoading) {
            const truncatedMessage = truncateToTokenLimit(messageText);
            const userMessage: Message = {
                text: truncatedMessage,
                sender: 'user'
            };
            setMessages(prev => [...prev, userMessage]);
            setInput('');
            setIsLoading(true);

            try {
                const response = await fetch('http://localhost:3000/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: truncatedMessage }),
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                setMessages(prev => [...prev, {
                    text: data.content,
                    sender: 'bot'
                }]);
            } catch (error) {
                console.error('Error:', error);
                setMessages(prev => [...prev, {
                    text: 'Sorry, there was an error processing your message.',
                    sender: 'bot'
                }]);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <Container maxWidth="md" sx={{ height: '100vh', py: 2 }}>
            {messages.length === 0 ? (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Card className="welcome-card">
                        <Box className="bot-avatar" sx={{ width: 120, height: 120 }}>
                            <BotAvatar />
                        </Box>
                        <Typography variant="h4" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
                            Meet <span className="gradient-text">Hermes!</span>
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
                            Your AI Assistant
                        </Typography>
                    </Card>

                    <Card
                        className="feature-card voice-card"
                        onClick={startListening}
                        sx={{
                            cursor: 'pointer',
                            p: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2
                        }}
                    >
                        <Box className="voice-button" sx={{ position: 'relative' }}>
                            <Box
                                className={`voice-ripple ${isListening ? 'listening' : ''}`}
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'var(--primary)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <MicIcon sx={{ fontSize: 40, color: '#1A1D1F' }} />
                            </Box>
                        </Box>
                        <VoiceWaveAnimation isListening={isListening} />
                        <Typography variant="h6" sx={{ color: 'var(--primary)', mt: 2 }}>
                            {isListening ? 'Listening...' : 'Talk with Hermes'}
                        </Typography>
                    </Card>

                    <Box sx={{ mt: 'auto', p: 2 }}>
                        <TextField
                            fullWidth
                            placeholder="Ask anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            className="chat-input"
                            InputProps={{
                                endAdornment: (
                                    <IconButton
                                        onClick={() => handleSend()}
                                        disabled={!input.trim() || isLoading}
                                        sx={{ color: 'var(--primary)' }}
                                    >
                                        <SendIcon />
                                    </IconButton>
                                ),
                            }}
                        />
                    </Box>
                </Box>
            ) : (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Card className="welcome-card" sx={{ mb: 3, py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3 }}>
                            <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BotAvatar size={40} />
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                <span className="gradient-text">Hermes</span>
                            </Typography>
                            <Box sx={{ ml: 'auto' }}>
                                <IconButton
                                    onClick={startListening}
                                    sx={{
                                        color: isListening ? 'var(--primary)' : 'inherit',
                                        position: 'relative'
                                    }}
                                >
                                    <MicIcon />
                                    {isListening && <VoiceWaveAnimation isListening={isListening} />}
                                </IconButton>
                            </Box>
                        </Box>
                    </Card>

                    <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                        {messages.map((message, index) => (
                            <Box
                                key={index}
                                className={`message-bubble ${message.sender === 'user' ? 'user' : ''}`}
                                sx={{
                                    ml: message.sender === 'user' ? 'auto' : 0,
                                    mr: message.sender === 'bot' ? 'auto' : 0,
                                    maxWidth: '80%',
                                }}
                            >
                                <Typography sx={{ color: 'var(--text-primary)' }}>
                                    {message.text}
                                </Typography>
                            </Box>
                        ))}
                        {isLoading && (
                            <Box
                                className="message-bubble"
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    maxWidth: '80%',
                                }}
                            >
                                <CircularProgress size={20} sx={{ color: 'var(--primary)' }} />
                                <Typography sx={{ color: 'var(--text-secondary)' }}>
                                    Hermes is thinking...
                                </Typography>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    <Box sx={{ p: 2 }}>
                        <TextField
                            fullWidth
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            className="chat-input"
                            disabled={isLoading}
                            helperText={`${tokenCount}/100 tokens`}
                            error={tokenCount > 100}
                            InputProps={{
                                endAdornment: (
                                    <Tooltip title={tokenCount > 100 ? "Message will be truncated to 100 tokens" : ""}>
                                        <IconButton
                                            onClick={() => handleSend()}
                                            disabled={!input.trim() || isLoading}
                                            sx={{ color: tokenCount > 100 ? 'warning.main' : 'var(--primary)' }}
                                        >
                                            {isLoading ? (
                                                <CircularProgress size={24} sx={{ color: 'var(--primary)' }} />
                                            ) : (
                                                <SendIcon />
                                            )}
                                        </IconButton>
                                    </Tooltip>
                                ),
                            }}
                        />
                    </Box>
                </Box>
            )}
        </Container>
    );
};

export default ChatBot; 