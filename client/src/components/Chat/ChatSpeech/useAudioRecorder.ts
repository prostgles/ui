import { useState } from "react";

class AudioRecorder {
  mediaOptions: {
    tag: string;
    type: string;
    ext: string;
    gUM: MediaStreamConstraints;
  } = {
    tag: "audio",
    type: "audio/ogg",
    ext: ".ogg",
    gUM: { audio: true },
  };
  recorder?: MediaRecorder;

  start(cb: (result: Blob) => void) {
    const chunks: BlobPart[] = [];
    navigator.mediaDevices
      .getUserMedia(this.mediaOptions.gUM)
      .then((stream) => {
        this.recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        this.recorder.ondataavailable = (e) => {
          chunks.push(e.data);
          if (this.recorder && this.recorder.state == "inactive") {
            cb(new Blob(chunks, { type: this.mediaOptions.type }));
          }
        };
        this.recorder.start();
      })
      .catch(console.error);
  }

  stop() {
    if (this.recorder) {
      this.recorder.stream.getTracks().forEach(function (track) {
        track.stop();
      });
      this.recorder.stop();
    } else console.error("WTF", this);
  }
}
const audioRec = new AudioRecorder();

export const useAudioRecorder = (onSend: (audioBlob: Blob) => void) => {
  const [isListening, setIsRecording] = useState(false);
  const start = () => {
    audioRec.start((blob) => {
      onSend(blob);
    });
    setIsRecording(true);
  };
  const stop = () => {
    if (isListening) {
      audioRec.stop();
      setIsRecording(false);
    }
  };
  return {
    start,
    stop,
    isListening,
  };
};
