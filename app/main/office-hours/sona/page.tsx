'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useChat,
  BarVisualizer,
  useLocalParticipant,
  useConnectionState,
  useRemoteParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { ConnectionState, RoomEvent } from 'livekit-client';
import {
  MicrophoneIcon,
  SpeakerXMarkIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import '@livekit/components-styles';
import { warmupAgent } from '@/utils/livekit';

interface TranscriptMessage {
  type: 'transcript_update';
  speaker: 'user' | 'agent';
  text: string;
  is_final: boolean;
  timestamp: string;
}
import { createClient } from '@/utils/supabase/client';

export default function SonaPage() {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [roomName] = useState(() => `parli-tutor-nova-${Date.now()}`);

  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        // Parallel warmup and data fetching
        const [_, { data: { user } }] = await Promise.all([
          warmupAgent('parli-tutor-nova'),
          supabase.auth.getUser()
        ]);

        // Give the agent a moment to spin up after warmup trigger
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (user) {
          console.log('👤 User found:', user.id);
          const { data } = await supabase
            .from('office_hours_info')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          console.log('Office hours data:', data);

          if (data) {
            setUserProfile(data);
          } else {
            console.log('No office hours info found, using fallback profile.');
            setUserProfile({
              level: 'beginner',
              event: 'parli'
            });
          }
        } else {
          console.log('No authenticated user found.');
          setUserProfile({
            level: 'beginner',
            event: 'parli'
          });
        }

        const resp = await fetch(`/api/livekit/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: roomName,
            agentName: 'parli-tutor-nova',
          }),
        });
        const data = await resp.json();
        setToken(data.token);
        setUrl(data.serverUrl);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [roomName]);

  if (token === '') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-zinc-500">Loading Sona...</div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={url}
      connect={true}
      className="h-full w-full"
    >
      <SonaContent onExit={() => router.push('/main')} userProfile={userProfile} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function SonaContent({ onExit, userProfile }: { onExit: () => void; userProfile: any }) {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const { send, chatMessages } = useChat();
  const roomState = useConnectionState();
  const room = useRoomContext();
  useEffect(() => {
    console.log('Room Connection State:', roomState);
  }, [roomState]);

  const remoteParticipants = useRemoteParticipants();
  useEffect(() => {
    console.log('Remote Participants:', remoteParticipants.map(p => ({ identity: p.identity, kind: p.kind })));
  }, [remoteParticipants]);

  const router = useRouter();

  const [isChatFull, setIsChatFull] = useState(false);
  const [isAgentMuted, setIsAgentMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; id?: string; isFinal?: boolean }[]>([]);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  // Use ref for current user transcript ID to avoid stale closure issues
  const currentUserTranscriptIdRef = useRef<string | null>(null);

  // Function to send text directly to the agent
  async function sendTextToAgent(text: string) {
    const message = JSON.stringify({
      type: 'text_input',
      text: text,
    });

    await room.localParticipant?.publishData(
      new TextEncoder().encode(message),
      { reliable: true }
    );
  }

  // Track agent transcriptions by ID to handle updates
  const transcriptionIdsRef = useRef<Set<string>>(new Set());

  // Add agent transcriptions to messages as they come in, and update if they change
  useEffect(() => {
    agentTranscriptions.forEach((t, index) => {
      const transcriptionId = `agent-${index}`;

      if (!transcriptionIdsRef.current.has(transcriptionId)) {
        // New transcription
        transcriptionIdsRef.current.add(transcriptionId);
        setMessages(prev => [...prev, {
          role: 'assistant' as const,
          content: t.text,
          id: transcriptionId
        }]);
      } else {
        // Update existing transcription (in case it's still being completed)
        setMessages(prev => prev.map(msg =>
          msg.id === transcriptionId
            ? { ...msg, content: t.text }
            : msg
        ));
      }
    });
  }, [agentTranscriptions]);

  // Listen for transcript updates from the room via DataReceived
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (data: Uint8Array, participant: any) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(data));

        if (message.type === 'transcript_update') {
          console.log('Transcript update received:', message);
          setTranscript((prev) => [...prev, message]);

          // If it's a user transcript, update or create the message
          if (message.speaker === 'user') {
            const transcriptId = `user-transcript-${message.timestamp}`;

            setMessages((prev) => {
              // Check if we already have this transcript message
              const existingIndex = prev.findIndex(m => m.id === currentUserTranscriptIdRef.current);

              if (existingIndex !== -1 && !message.is_final) {
                // Update existing transcript (interim update)
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  content: message.text,
                  isFinal: message.is_final
                };
                return updated;
              } else if (message.is_final) {
                // Final transcript - update if exists, otherwise create new
                if (existingIndex !== -1) {
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    content: message.text,
                    isFinal: true
                  };
                  currentUserTranscriptIdRef.current = null;
                  return updated;
                } else {
                  currentUserTranscriptIdRef.current = null;
                  return [...prev, { role: 'user', content: message.text, id: transcriptId, isFinal: true }];
                }
              } else {
                // First interim transcript
                currentUserTranscriptIdRef.current = transcriptId;
                return [...prev, { role: 'user', content: message.text, id: transcriptId, isFinal: false }];
              }
            });
          }
        }
      } catch (error) {
        console.error('Error parsing data received:', error);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  // Add chat messages (text) to the conversation
  useEffect(() => {
    const textMessages = chatMessages.map((m: any) => ({
      role: m.from?.identity === localParticipant?.identity ? 'user' as const : 'assistant' as const,
      content: m.message
    }));
    // This is a simplification - in production you'd want to track which messages you've already added
  }, [chatMessages, localParticipant]);

  // Track state transitions to detect when user finishes speaking
  const prevStateRef = useRef(state);
  useEffect(() => {
    console.log('State transition:', prevStateRef.current, '->', state);
    // User transcripts are now handled via DataReceived events
    prevStateRef.current = state;
  }, [state]);

  console.log('Total messages in chat:', messages.length);

  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';

  const isMicEnabled = localParticipant?.isMicrophoneEnabled ?? false;

  // Track if audio is actually playing to fix persistent "speaking" state
  const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isSpeaking) {
      setIsActuallyPlaying(true);

      // Clear any existing timeout
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }

      // Set a timeout to clear the playing state after 1 second of no updates
      speakingTimeoutRef.current = setTimeout(() => {
        setIsActuallyPlaying(false);
      }, 1000);
    }

    return () => {
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
    };
  }, [isSpeaking, agentTranscriptions]);

  // Use combined state for UI display
  const displayIsSpeaking = isSpeaking && isActuallyPlaying;

  // Ensure mic starts disabled - use ref to only do this once
  const hasSetInitialMicState = useRef(false);
  useEffect(() => {
    // Only set attributes when connected and profile is available
    if (localParticipant && roomState === ConnectionState.Connected && !hasSetInitialMicState.current && userProfile) {
      hasSetInitialMicState.current = true;

      if (localParticipant.isMicrophoneEnabled) {
        localParticipant.setMicrophoneEnabled(false).catch(e => {
          console.error('Failed to disable mic on mount:', e);
        });
      }

      // Set participant attributes for the agent
      const attributes = {
        user_profile: JSON.stringify({
          name: 'Student', // Generic name since we don't hold PII
          voiceGender: 'neutral',
          experienceLevel: userProfile.level || 'beginner',
          primaryEvent: userProfile.event || 'parli',
          ...userProfile // include other raw fields
        }),
        voice_gender: 'neutral',
        experience_level: userProfile.level || 'beginner',
        primary_event: userProfile.event || 'parli',
      };

      console.log('Setting participant attributes:', attributes);
      localParticipant.setAttributes(attributes).catch(e => {
        console.error('Failed to set attributes:', e);
      });
    }
  }, [localParticipant, roomState, userProfile]);

  // Mute/unmute Sona's audio by controlling the audio track volume
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Find all audio elements and mute/unmute them based on isAgentMuted
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      audio.muted = isAgentMuted;
    });
  }, [isAgentMuted]);

  return (
    <div className="flex min-h-screen w-full justify-center">
      <main className="relative w-full max-w-4xl text-center p-4">
        {/* Title */}
        <h1 className="pt-6 text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-tight text-zinc-900 drop-shadow-[0_4px_20px_rgba(0,0,0,0.25)] dark:text-white">
          office hours
        </h1>

        {/* Mute Sona Toggle */}
        <p className="mt-2 text-xs sm:text-sm text-zinc-700/85 dark:text-zinc-300/90">
          <button
            type="button"
            onClick={() => setIsAgentMuted((m) => !m)}
            className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            {isAgentMuted ? 'audio muted – tap to unmute sona' : 'mute sona audio'}
          </button>
        </p>

        {/* Connection Status */}
        <p className="mt-2 text-xs text-zinc-400">
          {roomState === ConnectionState.Connected ? 'connected' : 'connecting...'}
        </p>

        {/* Orb */}
        <div className="mt-10 flex justify-center">
          <div className="relative h-56 w-56 sm:h-64 sm:w-64">
            {/* Halo 1 */}
            <div
              className={`sona-halo sona-halo-1 ${displayIsSpeaking ? 'sona-halo--speaking' : 'opacity-0'
                }`}
            />
            {/* Halo 2 */}
            <div
              className={`sona-halo sona-halo-2 ${displayIsSpeaking ? 'sona-halo--speaking' : 'opacity-0'
                }`}
            />
            {/* Orb */}
            <div className={`sona-orb ${displayIsSpeaking ? 'sona-orb--speaking' : ''} ${isThinking ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        {/* Caption */}
        <div className="mt-8 px-4">
          <p className="mx-auto max-w-xl text-sm sm:text-base text-zinc-800/90 dark:text-zinc-100/90 min-h-[1.5em]">
            {!isMicEnabled
              ? 'Click the mic to start talking'
              : isListening
                ? 'Listening...'
                : isThinking
                  ? 'Thinking...'
                  : displayIsSpeaking
                    ? 'Sona is speaking'
                    : 'Ready to listen'}
          </p>

          {/* Re-onboarding Link */}
          <button
            type="button"
            onClick={() => router.push('/main/office-hours/onboarding')}
            className="mt-2 text-xs text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white cursor-pointer"
          >
            update my profile
          </button>
        </div>

        {/* Controls */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {/* Mic */}
          <button
            type="button"
            onClick={async () => {
              try {
                await localParticipant?.setMicrophoneEnabled(!isMicEnabled);
              } catch (e) {
                console.error('Error toggling mic:', e);
              }
            }}
            className={`cursor-pointer inline-flex h-14 w-14 items-center justify-center rounded-full border shadow-[0_20px_45px_rgba(0,0,0,0.25)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_26px_60px_rgba(0,0,0,0.3)] ${isMicEnabled
              ? 'border-emerald-400 bg-emerald-500 text-white ring-2 ring-emerald-300/70'
              : 'border-black/15 bg-white/90 text-zinc-900 dark:bg-zinc-900/90 dark:text-white'
              }`}
          >
            {isMicEnabled ? (
              <MicrophoneIcon className="h-6 w-6" />
            ) : (
              <SpeakerXMarkIcon className="h-6 w-6" />
            )}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onExit}
            className="cursor-pointer inline-flex h-14 w-14 items-center justify-center rounded-full border border-black/15 bg-white/90 text-zinc-900 shadow-[0_20px_45px_rgba(0,0,0,0.25)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_26px_60px_rgba(0,0,0,0.3)] dark:bg-zinc-900/90 dark:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Chat Panel */}
        <div
          className={`
            fixed z-10
            rounded-3xl border border-black/10 bg-white/90 dark:bg-zinc-900/92
            shadow-[0_24px_60px_rgba(0,0,0,0.25)] backdrop-blur
            flex flex-col text-left
            p-4 sm:p-5
            overflow-hidden
            ${isChatFull
              ? 'left-15 right-5 top-15 bottom-20 sm:left-20 sm:right-10 sm:top-10 sm:bottom-20'
              : 'bottom-28 left-1/2 w-[min(350px,92vw)] -translate-x-1/2 md:bottom-40 md:left-auto md:right-20 md:translate-x-0 max-h-[60vh]'
            }
          `}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              sona chat
            </span>
            <button
              type="button"
              onClick={() => setIsChatFull((f) => !f)}
              className="cursor-pointer inline-flex items-center justify-center rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {isChatFull ? (
                <ArrowsPointingInIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              ) : (
                <ArrowsPointingOutIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              )}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-[160px] max-h-full overflow-y-auto space-y-2 pr-1">
            {messages.length === 0 && (
              <div className="text-zinc-400 text-xs italic">No messages yet...</div>
            )}
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              const isInterim = m.isFinal === false;
              return (
                <div
                  key={idx}
                  className={isUser ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={
                      'rounded-2xl px-3 py-2 text-xs sm:text-sm shadow-sm break-words ' +
                      (isUser
                        ? 'bg-indigo-500 text-white rounded-br-none'
                        : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 rounded-bl-none') +
                      (isInterim ? ' opacity-60 italic' : '')
                    }
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (textInput.trim()) {
                // Add user message to chat immediately
                setMessages(prev => [...prev, { role: 'user', content: textInput, isFinal: true }]);

                try {
                  // Send text directly to the agent via data channel
                  await sendTextToAgent(textInput);
                  setTextInput('');
                } catch (err) {
                  console.error('Failed to send message:', err);
                }
              }
            }}
            className="mt-4 flex items-center gap-2 text-xs sm:text-sm"
          >
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-zinc-300/80 bg-white/90 px-3 py-1.5 text-xs sm:text-sm text-zinc-900 outline-none focus:border-zinc-900/70 focus:ring-1 focus:ring-zinc-900/40 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="cursor-pointer rounded-full bg-zinc-900 text-white px-3 py-1.5 text-xs font-medium shadow-md hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              send
            </button>
          </form>
        </div>
      </main>

      {!isAgentMuted && <RoomAudioRenderer />}
    </div>
  );
}