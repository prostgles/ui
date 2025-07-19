import { useRef, useState } from "react";

class AudioRecorder {
  mediaOptions?: any;
  recorder?: MediaRecorder;

  constructor() {
    this.mediaOptions = {
      tag: "audio",
      type: "audio/ogg",
      ext: ".ogg",
      gUM: { audio: true },
    };
    this.recorder = undefined;
  }

  start(cb: (result: Blob) => any | void) {
    const chunks: any = [];
    navigator.mediaDevices
      .getUserMedia(this.mediaOptions.gUM)
      .then((stream) => {
        this.recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        this.recorder.ondataavailable = (e: any) => {
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
  const [isRecording, setIsRecording] = useState(false);
  const startRecording = () => {
    audioRec.start((blob) => {
      onSend(blob);
    });
    setIsRecording(true);
  };
  const stopRecording = () => {
    if (isRecording) {
      audioRec.stop();
      setIsRecording(false);
    }
  };
  return {
    startRecording,
    stopRecording,
    isRecording,
  };
};
