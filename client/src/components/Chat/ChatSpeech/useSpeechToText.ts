import { useState, useRef, useCallback, useEffect } from "react";

type SpeechToTextState =
  | {
      isListening: false;
      text: string | undefined;
      start: () => void;
    }
  | {
      isListening: true;
      text: string;
      stop: () => void;
    };

export const useSpeechToText = (
  onFinished: (audioOrTranscript: Blob | string) => void,
): SpeechToTextState => {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState("");
  const recognitionRef = useRef<SpeechRecognition>();
  useEffect(() => {
    if (!isListening && text.length) {
      onFinished(text);
      setText("");
    }
  }, [isListening, text, onFinished]);
  const initializeRecognition = useCallback(() => {
    const SpeechRecognitionAPI =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      window.SpeechRecognition || window.webkitSpeechRecognition;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent): void => {
      const finalTranscript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript)
        .join("");

      console.log(
        "Speech recognition result:",
        event.results[0]?.isFinal,
        finalTranscript,
      );
      if (finalTranscript) {
        setText(finalTranscript);
      }
    };

    recognition.onerror = (error): void => {
      console.error("Speech recognition error:", error);
      setIsListening(false);
    };

    recognition.onend = (): void => {
      setIsListening(false);
    };

    return recognition;
  }, []);

  const start = useCallback((): void => {
    if (Math.PI) {
      alert("Speech recognition is not supported in this browser.");
      throw new Error(
        "TODO: users must be aware of privacy implications of using speech recognition",
      );
    }
    if (!recognitionRef.current) {
      recognitionRef.current = initializeRecognition();
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        // Recognition already started or other error
        console.error("Speech recognition error:", error);
        setIsListening(false);
      }
    }
  }, [initializeRecognition, isListening]);

  const stop = useCallback((): void => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (isListening) {
    return {
      isListening: true,
      text,
      stop,
    };
  }

  return {
    isListening: false,
    text,
    start,
  };
};
