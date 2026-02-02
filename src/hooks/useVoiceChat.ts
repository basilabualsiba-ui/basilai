import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceChatOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  lang?: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const { onTranscript, onError, lang = 'ar-SA' } = options;
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition && 'speechSynthesis' in window);
  }, []);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;
      
      setTranscript(text);
      
      if (result.isFinal) {
        onTranscript?.(text);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        onError?.('الميكروفون محظور. سمحي للموقع باستخدام الميكروفون.');
      } else if (event.error === 'no-speech') {
        onError?.('ما سمعت صوتك. حاولي تاني.');
      } else {
        onError?.('في مشكلة بالتسجيل. حاولي تاني.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, [lang, onTranscript, onError]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.('المتصفح ما بدعم التسجيل الصوتي');
      return;
    }

    // Stop any current speech
    if (isSpeaking) {
      stopSpeaking();
    }

    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }, [isSupported, isSpeaking, initRecognition, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Speak text (Text-to-Speech)
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Stop any current speech
    speechSynthesis.cancel();

    // Clean text for speech (remove markdown, emojis)
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/[🌹💰💪🕌📅💊🍽️🌟📝📊⚖️✅❤️🎯⬜🔴🟢🟡☀️🌅🌇🌆🌙⏰💸💳]/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, '. ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    utterance.pitch = 1.1; // Slightly higher pitch for female voice
    utterance.volume = 1;

    // Try to find an Arabic female voice
    const voices = speechSynthesis.getVoices();
    const arabicFemaleVoice = voices.find(v => 
      v.lang.includes('ar') && v.name.toLowerCase().includes('female')
    );
    const arabicVoice = voices.find(v => v.lang.includes('ar'));
    
    if (arabicFemaleVoice) {
      utterance.voice = arabicFemaleVoice;
    } else if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Toggle speaking
  const toggleSpeaking = useCallback((text: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text);
    }
  }, [isSpeaking, speak, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      speechSynthesis.cancel();
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    toggleSpeaking
  };
}
