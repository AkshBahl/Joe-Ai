"use client";
import { useEffect, useRef, useState } from "react";
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType } from "@heygen/streaming-avatar";
import { generateChatResponse } from "@/app/actions/chat-actions";

export default function StreamingAvatarComponent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<StreamingAvatar | null>(null);

  const fetchAccessToken = async (): Promise<string> => {
    const response = await fetch("/api/heygen-token");
    const { token } = await response.json();
    return token;
  };

  const initialize = async () => {
    const token = await fetchAccessToken();
    const avatarInstance = new StreamingAvatar({ token });
    setAvatar(avatarInstance);

    avatarInstance.on(StreamingEvents.STREAM_READY, (event) => {
      if (event.detail && videoRef.current) {
        videoRef.current.srcObject = event.detail;
        videoRef.current.play();
      }
    });

    avatarInstance.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    });

    await avatarInstance.createStartAvatar({
      quality: AvatarQuality.Medium,
      avatarName: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID!,
      language: "English",
    });
  };

  const handleSpeak = async () => {
    const input = inputRef.current?.value;
    if (avatar && input) {
      const assistantResponse = await generateChatResponse([{ role: "user", content: input }]);
      await avatar.speak({ text: assistantResponse, taskType: TaskType.REPEAT });
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4 w-full px-2">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="rounded-xl border shadow-md w-full h-[400px] bg-black"
      />
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask Joe..."
          className="p-2 border rounded flex-1"
        />
        <button onClick={handleSpeak} className="bg-blue-600 text-white px-4 py-2 rounded">
          Speak
        </button>
        <button onClick={initialize} className="bg-green-600 text-white px-4 py-2 rounded">
          Start
        </button>
      </div>
    </div>
  );
}
