import type StreamingAvatar from "@heygen/streaming-avatar";
export {};

declare global {
  interface Window {
    avatar?: StreamingAvatar;
  }
}
