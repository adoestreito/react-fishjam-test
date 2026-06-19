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

// 2. Official Fishjam Custom Chat Hook (Converted from TypeScript to clean JS)
export function useChat() {
  const { peerStatus } = useConnection();
  const {
    initializeDataChannel,
    publishData,
    subscribeData,
    dataChannelReady,
  } = useDataChannel();
  
  const [messages, setMessages] = useState([]);

  // Step 1: Initialize data channel when connected
  useEffect(() => {
    if (peerStatus === "connected" && typeof initializeDataChannel === 'function') {
      initializeDataChannel();
    }
  }, [peerStatus, initializeDataChannel]);

  // Step 2: Subscribe to incoming messages
  useEffect(() => {
    if (!dataChannelReady || typeof subscribeData !== 'function') return;
    
    const unsubscribe = subscribeData(
      (data) => {
        const message = new TextDecoder().decode(data);
        setMessages((prev) => [...prev, { sender: "Remote", text: message }]);
      },
      { reliable: true },
    );
    return unsubscribe;
  }, [subscribeData, dataChannelReady]);

  // Step 3: Publish messages
  const sendMessage = useCallback(
    (text) => {
      if (!dataChannelReady || typeof publishData !== 'function') return;
      const encoded = new TextEncoder().encode(text);
      publishData(encoded, { reliable: true });
      
      // Also save your own message locally so you can see it in your log
      setMessages((prev) => [...prev, { sender: "You", text: text }]);
    },
    [publishData, dataChannelReady],
  );

  return { messages, sendMessage, ready: dataChannelReady };
}

// 3. Updated P2P Interaction Component wired directly to useChat
export function InteractionChannel() {
  const [inputText, setInputText] = useState("");
  
  // Connect this component straight to your newly added hook!
  const { messages, sendMessage, ready } = useChat();

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
      
      {/* Scrollable log box displaying the active message stream */}
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

      {/* Input controls */}
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

// 4. The Fishjam Button Component
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

// 5. Connection Status Component
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

// 6. Reusable VideoPlayer Component 
function VideoPlayer({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline style={{ width: '300px', borderRadius: '8px', margin: '10px', transform: 'scaleX(-1)' }} />;
}

// 7. Local Video Component
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

// 8. ParticipantsView Component
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
  return (
    <>
      <section id="center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <JoinRoomButton />
          <ConnectionStatus />
          <ParticipantsView />
          
          {/* Renders safely; status flags inside hook manage state internally */}
          <InteractionChannel />
        </div>
      </section>
      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App