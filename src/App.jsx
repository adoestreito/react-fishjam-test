import { useState, useEffect, useRef, useCallback } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

// 1. Unified Fishjam SDK Imports
import {
  useConnection,
  useCamera, 
  useInitializeDevices,
  useSandbox,
  usePeers,
  useDataChannel 
} from "@fishjam-cloud/react-client";

const SANDBOX_API_URL = import.meta.env.VITE_SANDBOX_API_URL;

// 2. Comprehensive Fishjam Hook for Chat and Interactive Events
export function useChat(onActionReceived) {
  const { peerStatus } = useConnection();
  const {
    initializeDataChannel,
    publishData,
    subscribeData,
    dataChannelReady,
  } = useDataChannel();
  
  const [messages, setMessages] = useState([]);

  // Initialize data channel when connected
  useEffect(() => {
    if (peerStatus === "connected" && typeof initializeDataChannel === 'function') {
      initializeDataChannel();
    }
  }, [peerStatus, initializeDataChannel]);

  // Handle stream subscription and inbound decoding
  useEffect(() => {
    if (!dataChannelReady || typeof subscribeData !== 'function') return;
    
    const unsubscribe = subscribeData(
      (data) => {
        try {
          const decodedString = new TextDecoder().decode(data);
          const payload = JSON.parse(decodedString);
          
          // Separate game actions from plaintext chat entries
          if (payload.type === "SPAWN_EMOTE") {
            if (typeof onActionReceived === 'function') onActionReceived(payload);
          } else if (payload.type === "CHAT_MESSAGE") {
            setMessages((prev) => [...prev, { sender: payload.senderName, text: payload.text }]);
          }
        } catch (e) {
          // Fallback logic for legacy plain-text structures
          const textFallback = new TextDecoder().decode(data);
          setMessages((prev) => [...prev, { sender: "Remote", text: textFallback }]);
        }
      },
      { reliable: true },
    );
    return unsubscribe;
  }, [subscribeData, dataChannelReady, onActionReceived]);

  // Transmit plain text messages
  const sendMessage = useCallback(
    (text) => {
      if (!dataChannelReady || typeof publishData !== 'function') return;
      
      const payload = { type: "CHAT_MESSAGE", text: text, senderName: "Remote" };
      const encoded = new TextEncoder().encode(JSON.stringify(payload));
      publishData(encoded, { reliable: true });
      
      setMessages((prev) => [...prev, { sender: "You", text: text }]);
    },
    [publishData, dataChannelReady],
  );

  // Transmit ultra low-latency action strings (emotes/lasers)
  const sendAction = useCallback(
    (actionObject) => {
      if (!dataChannelReady || typeof publishData !== 'function') return;
      const encoded = new TextEncoder().encode(JSON.stringify(actionObject));
      publishData(encoded, { reliable: true });
    },
    [publishData, dataChannelReady],
  );

  return { messages, sendMessage, sendAction, ready: dataChannelReady };
}

// 3. The P2P Data Channel Interaction Component
export function InteractionChannel({ chatTools }) {
  const [inputText, setInputText] = useState("");
  const { messages, sendMessage, ready } = chatTools;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText("");
  };

  return (
    <div style={{
      border: ready ? "1px solid #4caf50" : "1px dashed #646cff",
      padding: "15px",
      borderRadius: "8px",
      marginTop: "15px",
      backgroundColor: "#242424",
      width: "300px",
      textAlign: "left"
    }}>
      <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
        P2P Data Channel {ready ? "🟢" : "🔴"}
      </h3>
      <p style={{ margin: "0 0 10px 0", fontSize: "11px", color: "#aaa" }}>
        {ready ? "Channel initialized & verified" : "Waiting for room connection..."}
      </p>
      
      <div style={{
        height: "110px",
        overflowY: "auto",
        backgroundColor: "#1a1a1a",
        padding: "8px",
        borderRadius: "4px",
        fontSize: "12px",
        marginBottom: "10px",
        color: "#ccc"
      }}>
        {messages.length === 0 ? (
          <span style={{color: '#666'}}>No messages yet.</span>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>
              <strong style={{ color: msg.sender === 'You' ? '#646cff' : '#4caf50' }}>
                {msg.sender}: 
              </strong> {msg.text}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: "5px" }}>
        <input 
          type="text" 
          value={inputText} 
          disabled={!ready}
          onChange={(e) => setInputText(e.target.value)} 
          placeholder={ready ? "Type a chat message..." : "Channel offline..."}
          style={{ flex: 1, padding: "5px", borderRadius: "4px", border: "1px solid #444", background: "#111", color: "#fff", opacity: ready ? 1 : 0.5 }}
        />
        <button type="button" onClick={handleSend} disabled={!ready} style={{ padding: "5px 10px", fontSize: "12px", opacity: ready ? 1 : 0.5 }}>
          Send
        </button>
      </div>
    </div>
  );
}

// 4. Interactive Emote Sync Canvas Component
export function GameController({ chatTools }) {
  const [activeEffects, setActiveEffects] = useState([]);
  const { sendAction, ready } = chatTools;

  // External action receiver handler passed back through local processing loops
  const handleActionTrigger = useCallback((payload) => {
    const newEffect = {
      id: Math.random(),
      emoji: payload.emoji,
      sender: payload.senderName
    };
    
    setActiveEffects((prev) => [...prev, newEffect]);
    setTimeout(() => {
      setActiveEffects((prev) => prev.filter(e => e.id !== newEffect.id));
    }, 2000);
  }, []);

  // Update dynamic rendering context hooks when custom triggers pass back
  useEffect(() => {
    window._triggerLocalEmoteHook = handleActionTrigger;
    return () => delete window._triggerLocalEmoteHook;
  }, [handleActionTrigger]);

  const triggerEmote = (emoji) => {
    if (!ready) return;

    const payload = {
      type: "SPAWN_EMOTE",
      emoji: emoji,
      senderName: "A Peer"
    };

    sendAction(payload);
    handleActionTrigger({ ...payload, senderName: "You" });
  };

  return (
    <div style={{ marginTop: "20px", textAlign: "center" }}>
      <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
        Interactive Emote Sync {ready ? "🟢" : "🔴"}
      </h3>
      
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button type="button" onClick={() => triggerEmote("🚀")} disabled={!ready} style={{ fontSize: "24px", padding: "10px" }}>🚀</button>
        <button type="button" onClick={() => triggerEmote("💥")} disabled={!ready} style={{ fontSize: "24px", padding: "10px" }}>💥</button>
        <button type="button" onClick={() => triggerEmote("🎉")} disabled={!ready} style={{ fontSize: "24px", padding: "10px" }}>🎉</button>
        <button type="button" onClick={() => triggerEmote("👻")} disabled={!ready} style={{ fontSize: "24px", padding: "10px" }}>👻</button>
      </div>

      <div style={{
        position: "fixed",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}>
        {activeEffects.map((effect) => (
          <div 
            key={effect.id} 
            className="floating-emote"
            style={{
              fontSize: "48px",
              animation: "floatUpAndFade 2s ease-out forwards",
              background: "rgba(0,0,0,0.6)",
              padding: "10px 20px",
              borderRadius: "50px",
              textAlign: "center"
            }}
          >
            {effect.emoji}
            <span style={{ display: "block", fontSize: "10px", color: "#aaa" }}>{effect.sender}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. The Fishjam Button Component
export function JoinRoomButton() {
  const { joinRoom } = useConnection();
  const { initializeDevices } = useInitializeDevices();
  const { getSandboxPeerToken } = useSandbox({
    sandboxApiUrl: SANDBOX_API_URL,
  });

  const handleJoinRoom = async () => {
    const uniqueId = Math.random().toString(36).substring(7);
    const roomName = "testRoom";
    const peerName = `user_${uniqueId}`; 
    
    try {
      const peerToken = await getSandboxPeerToken(roomName, peerName);
      await initializeDevices({ enableAudio: false }); 
      await joinRoom({ peerToken });
      console.log(`Successfully joined as ${peerName}!`);
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  return (
    <button type="button" className="counter" onClick={handleJoinRoom} style={{ marginBottom: '5px', backgroundColor: '#646cff' }}>
      Join Fishjam Room
    </button>
  );
}

// 6. Connection Status Component
export function ConnectionStatus() {
  const { peerStatus } = useConnection();
  
  const getStatusColor = () => {
    if (peerStatus === 'connected') return '#4caf50'; 
    if (peerStatus === 'connecting') return '#ffeb3b'; 
    return '#9e9e9e'; 
  };

  return (
    <div style={{ margin: '5px 0 15px 0', fontSize: '14px', fontWeight: '500' }}>
      Status: <span style={{ color: getStatusColor(), fontWeight: 'bold' }}>{peerStatus}</span>
    </div>
  );
}

// 7. Reusable VideoPlayer Component 
function VideoPlayer({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline style={{ width: '300px', borderRadius: '8px', margin: '10px', transform: 'scaleX(-1)' }} />;
}

// 8. Local Video Component
export function MyVideo() {
  const { cameraStream } = useCamera();
  
  if (!cameraStream) return null;

  return (
    <div style={{ border: '2px solid #646cff', padding: '10px', borderRadius: '10px', backgroundColor: '#1a1a1a' }}>
      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#646cff', fontWeight: 'bold' }}>You (Local)</p>
      <VideoPlayer stream={cameraStream} />
    </div>
  );
}

// 9. ParticipantsView Component (Updated for newest Fishjam dynamic dictionary structure)
export function ParticipantsView() {
  const { remotePeers } = usePeers();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', margin: '20px 0' }}>
      <MyVideo />

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px' }}>
        {remotePeers.map((peer) => {
          let remoteStream = null;
          
          // Fix: Scan modern track dictionaries for explicit camera/video streams first
          if (peer.tracks) {
            const matchTrack = Object.values(peer.tracks).find(
              (t) => t.type === 'video' || t.metadata?.type === 'camera'
            );
            remoteStream = matchTrack?.stream;
          }

          // Fallback parsing loop for older schemas
          if (!remoteStream && peer.cameraTrack) {
            remoteStream = peer.cameraTrack.stream || peer.cameraTrack;
          }

          return (
            <div key={peer.id} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '10px', backgroundColor: '#222' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#fff' }}>
                {peer.name || "Remote Peer"}
              </p>
              
              {remoteStream ? (
                <VideoPlayer stream={remoteStream} />
              ) : (
                <div style={{ 
                  width: '300px', 
                  height: '225px', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: '#111', 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  color: '#666' 
                }}>
                  <span>🔄 Connecting Video Pipeline...</span>
                  <span style={{ fontSize: '10px', marginTop: '5px', color: '#444' }}>
                    Track: {peer.cameraTrack || peer.tracks ? "Allocated" : "Empty"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 10. Main App Component
function App() {
  // Hub component action forwarder mapping straight down into child layouts
  const actionForwarder = useCallback((payload) => {
    if (window._triggerLocalEmoteHook) window._triggerLocalEmoteHook(payload);
  }, []);

  const chatTools = useChat(actionForwarder);

  return (
    <>
      <section id="center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <JoinRoomButton />
          <ConnectionStatus />
          <ParticipantsView />
          <GameController chatTools={chatTools} />
          <InteractionChannel chatTools={chatTools} />
        </div>
      </section>
      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App