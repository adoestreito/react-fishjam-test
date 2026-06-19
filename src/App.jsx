import { useState, useEffect, useRef, useCallback } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

// 1. Fishjam SDK Imports
import {
  useConnection, // <-- Handles joining and checking peer status
  useCamera, 
  useInitializeDevices,
  useSandbox,
  usePeers,
  useDataChannel // <-- Handles P2P Messaging
} from "@fishjam-cloud/react-client";

// Remember to replace this with your actual URL from the Fishjam dashboard!
const SANDBOX_API_URL = import.meta.env.VITE_SANDBOX_API_URL;

// 2. The Fishjam Button Component
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
      
      // Initialize local media hardware
      await initializeDevices({ enableAudio: false }); 
      
      await joinRoom({ 
        peerToken,
      });
      
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

// 3. Connection Status Component
export function ConnectionStatus() {
  const { peerStatus } = useConnection();
  
  const getStatusColor = () => {
    if (peerStatus === 'connected') return '#4caf50'; // Green
    if (peerStatus === 'connecting') return '#ffeb3b'; // Yellow
    return '#9e9e9e'; // Grey
  };

  return (
    <div style={{ margin: '5px 0 15px 0', fontSize: '14px', fontWeight: '500' }}>
      Status: <span style={{ color: getStatusColor(), fontWeight: 'bold' }}>{peerStatus}</span>
    </div>
  );
}

// 4. Reusable VideoPlayer Component 
function VideoPlayer({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline style={{ width: '300px', borderRadius: '8px', margin: '10px', transform: 'scaleX(-1)' }} />;
}

// 5. Local Video Component
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

// 6. Integrated Custom Chat/Game Hook
export function useChat(onEmoteReceived) {
  const { peerStatus } = useConnection();
  const { initializeDataChannel, publishData, subscribeData, dataChannelReady } = useDataChannel();
  const [messages, setMessages] = useState([]);

  // Step 1: Initialize data channel cleanly upon room confirmation
  useEffect(() => {
    if (peerStatus === "connected" && typeof initializeDataChannel === 'function') {
      initializeDataChannel();
    }
  }, [peerStatus, initializeDataChannel]);

  // Step 2: Subscribe to incoming payloads securely
  useEffect(() => {
    if (!dataChannelReady || typeof subscribeData !== 'function') return;
    
    const unsubscribe = subscribeData(
      (data) => {
        try {
          const decoded = new TextDecoder().decode(data);
          const payload = JSON.parse(decoded);

          if (payload.type === "EMOTE") {
            if (onEmoteReceived) onEmoteReceived(payload.emoji);
          } else {
            setMessages((prev) => [...prev, { msg: payload.text, incoming: true }]);
          }
        } catch (e) {
          const text = new TextDecoder().decode(data);
          setMessages((prev) => [...prev, { msg: text, incoming: true }]);
        }
      },
      { reliable: true }
    );
    return unsubscribe;
  }, [subscribeData, dataChannelReady, onEmoteReceived]);

  // Step 3: Global Action Transmitters
  const sendTextMessage = useCallback((text) => {
    if (!dataChannelReady) return;
    const payload = JSON.stringify({ type: "TEXT", text });
    const encoded = new TextEncoder().encode(payload);
    publishData(encoded, { reliable: true });
    setMessages((prev) => [...prev, { msg: text, incoming: false }]);
  }, [publishData, dataChannelReady]);

  const sendEmote = useCallback((emoji) => {
    if (!dataChannelReady) return;
    const payload = JSON.stringify({ type: "EMOTE", emoji });
    const encoded = new TextEncoder().encode(payload);
    publishData(encoded, { reliable: true });
  }, [publishData, dataChannelReady]);

  return { messages, sendTextMessage, sendEmote, ready: dataChannelReady };
}

// 7. Interactive Features Overlay Panel Component
export function InteractivePanel({ chatTools }) {
  const [text, setText] = useState("");
  const [activeEmotes, setActiveEmotes] = useState([]);
  const { messages, sendTextMessage, sendEmote, ready } = chatTools;

  const handleLocalEmoteSpawn = useCallback((emoji, senderName) => {
    const id = Math.random();
    setActiveEmotes((prev) => [...prev, { id, emoji, senderName }]);
    setTimeout(() => {
      setActiveEmotes((prev) => prev.filter((item) => item.id !== id));
    }, 2000);
  }, []);

  // Expose local display channel to the global window environment
  useEffect(() => {
    window._remoteEmoteTrigger = (emoji) => handleLocalEmoteSpawn(emoji, "Peer");
    return () => delete window._remoteEmoteTrigger;
  }, [handleLocalEmoteSpawn]);

  const triggerTextSubmit = () => {
    if (!text.trim()) return;
    sendTextMessage(text);
    setText("");
  };

  const triggerEmoteSubmit = (emoji) => {
    sendEmote(emoji);
    handleLocalEmoteSpawn(emoji, "You");
  };

  return (
    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px', width: '320px', textAlign: 'left' }}>
      
      {/* Emote Matrix Block */}
      <div style={{ background: '#242424', padding: '10px', borderRadius: '8px', border: ready ? '1px solid #4caf50' : '1px dashed #444', textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#aaa' }}>Live Action Channels {ready ? "🟢" : "🔴"}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {["🚀", "💥", "🎉", "👻"].map((emoji) => (
            <button key={emoji} type="button" disabled={!ready} onClick={() => triggerEmoteSubmit(emoji)} style={{ fontSize: '20px', padding: '8px' }}>
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Structured Core Message Log */}
      <div style={{ background: '#242424', padding: '15px', borderRadius: '8px', border: ready ? '1px solid #4caf50' : '1px dashed #444' }}>
        <div style={{ height: '100px', overflowY: 'auto', background: '#1a1a1a', padding: '6px', borderRadius: '4px', fontSize: '13px', marginBottom: '10px' }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{ marginBottom: '4px', color: m.incoming ? '#4caf50' : '#646cff' }}>
              <strong>{m.incoming ? "Peer: " : "You: "}</strong>
              <span style={{ color: '#fff' }}>{m.msg}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input 
            type="text" 
            value={text} 
            disabled={!ready}
            onChange={(e) => setText(e.target.value)} 
            placeholder="Type message..." 
            style={{ flex: 1, padding: '5px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}
          />
          <button type="button" disabled={!ready} onClick={triggerTextSubmit} style={{ padding: '5px 10px' }}>Send</button>
        </div>
      </div>

      {/* Floating Canvas Overlay Element */}
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activeEmotes.map((e) => (
          <div key={e.id} style={{ fontSize: '45px', background: 'rgba(0,0,0,0.7)', padding: '5px 20px', borderRadius: '30px', textAlign: 'center', animation: 'floatUpAndFade 2s ease-out forwards' }}>
            {e.emoji}
            <span style={{ display: 'block', fontSize: '10px', color: '#aaa' }}>{e.senderName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 8. ParticipantsView Component (YOUR ORIGINAL PERFECTLY WORKING VERSION)
export function ParticipantsView() {
  const { remotePeers } = usePeers();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', margin: '20px 0' }}>
      <MyVideo />

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px' }}>
        {remotePeers.map((peer) => (
          <div key={peer.id} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '10px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{peer.name || "Remote Peer"}</p>
            {peer.cameraTrack?.stream && (
              <VideoPlayer stream={peer.cameraTrack.stream} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 9. Main App Component
function App() {
  // Safe forwarder targeting the global layout stream window directly
  const chatTools = useChat((emoji) => {
    if (window._remoteEmoteTrigger) window._remoteEmoteTrigger(emoji);
  });

  return (
    <>
      <section id="center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <JoinRoomButton />
          <ConnectionStatus />
          
          {/* Video layers and interactive elements render perfectly side-by-side */}
          <ParticipantsView />
          <InteractivePanel chatTools={chatTools} />
        </div>
      </section>
      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App