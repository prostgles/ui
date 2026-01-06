import { expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";
import { getDataKey, type PageWIds } from "utils/utils";

export const speechToTextTest = async (page: PageWIds) => {
  await grantMicrophonePermission(page);
  await mockMediaDevicesWithAudioFile(page);
  await page.reload();
  await page.getByTestId("AskLLM").click();
  const newChat = async () => {
    await page.getByTestId("AskLLMChat.NewChat").click();
    await page.waitForTimeout(1e3);
  };

  await newChat();
  await page.getByTestId("Chat.speech").click();
  await page.locator(getDataKey("stt-local")).click();
  await page
    .locator(getDataKey("speechToText") + " " + getDataKey("model"))
    .click();
  await page.locator(getDataKey("tiny")).click();
  await page
    .locator(getDataKey("speechToText") + " " + getDataKey("service-toggle"))
    .click();
  await expect(
    page.locator(
      getDataKey("speechToText") + " " + getDataKey("service-status"),
    ),
  ).toContainText("running", { timeout: 5 * 60_000 });

  // Used to debug
  await page.locator(getDataKey("audio")).click();
  await page.getByTestId("Popup.close").last().click();

  await page.getByTestId("Chat.speech").click();
  await page.waitForTimeout(2000);
  await page
    .getByTestId("Chat.sendWrapper")
    .locator("audio")
    .waitFor({ state: "visible" });
  await page.getByTestId("Chat.send").click();
  await page
    .getByTestId("Chat.messageList")
    .locator("audio")
    .waitFor({ state: "visible" });

  await page
    .getByTestId("Chat.speech")
    .click({ button: "right", timeout: 10_000 });
  await page.locator(getDataKey("stt-local")).click();
  await page.getByTestId("Popup.close").last().click();

  await page.getByTestId("Chat.speech").click();
  await page.waitForTimeout(2000);
  await page.waitForTimeout(2000);
  await expect(page.getByTestId("Chat.textarea")).toHaveValue("Hello.", {
    timeout: 10000,
  });
};

// Helper to grant microphone permissions
const grantMicrophonePermission = async (page: PageWIds): Promise<void> => {
  await page.context().grantPermissions(["microphone"]);
};
const mockMediaDevicesWithAudioFile = async (page: PageWIds): Promise<void> => {
  // Read file in Node.js context BEFORE injecting
  const buffer = readFileSync(join(__dirname, "hello.mp3"));
  const base64Audio = buffer.toString("base64");

  await page.addInitScript((audioBase64: string) => {
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      console.log("[Mock] getUserMedia called with:", constraints);
      // simulate real user delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (constraints?.audio) {
        // Decode base64 to ArrayBuffer in browser
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const audioContext = new AudioContext();
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

        const source = audioContext.createBufferSource();
        const destination = audioContext.createMediaStreamDestination();

        source.buffer = audioBuffer;
        source.connect(destination);
        source.start();

        console.log("[Mock] Returning mock stream");
        return destination.stream;
      }
      throw new Error("No audio constraints");
    };
  }, base64Audio);
};
