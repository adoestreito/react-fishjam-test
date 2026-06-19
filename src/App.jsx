import { useState, useEffect, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

// 1. ALL SDK IMPORTS TOGETHER AT THE VERY TOP
import {
  useConnection,
  useCamera, 
  useInitializeDevices,
  useSandbox,
  usePeers,
  useDataChannel // <-- Handles P2P Messaging lanes
} from "@fishjam-cloud/react-client";

// Your secret Sandbox URL from the environment
const SANDBOX_API_URL = import.meta.env.VITE_SANDBOX_API_URL;

// 2. The P2P Data Channel Interaction Component
export function InteractionChannel() {
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState([]);

  // 🌟 FIX: Extract 'broadcast' instead of 'sendMessage'
  const { broadcast, onMessage } = useDataChannel();

  useEffect(() => {
    if (typeof onMessage !== 'function') return;

    const unsubscribe = onMessage((data, peerId) => {
      const sender = peerId ? peerId.substring(0, 5) : "Peer";
      setLogs((prev) => [...prev, `From ${sender}: ${data}`]);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [onMessage]);

  const handleBroadcast = () => {
    if (!message.trim()) return;

    // 🌟 FIX: Check if broadcast function exists, then invoke it
    if (typeof broadcast === 'function') {
      broadcast(message);
      setLogs((prev) => [...prev, `You (Broadcast): ${message}`]);
      setMessage("");
    } else {
      console.error("Fishjam broadcast function is not available. Are you connected to the room?");
    }
  };

  return (
    <div style={{
      border: "1px dashed #646cff",
      padding: "15px",
      borderRadius: "8px",
      marginTop: "15px",
      backgroundColor: "#242424",
      width: "300px",
      textAlign: "left"
    }}>
      <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>P2P Data Channel</h3>
      
      {/* Scrollable log box */}
      <div style={{
        height: "100px",
        overflowY: "auto",
        backgroundColor: "#1a1a1a",
        padding: "5px",
        borderRadius: "4px",
        fontSize: "12px",
        marginBottom: "10px",
        color: "#ccc"
      }}>
        {logs.length === 0 ? (
          <span style={{color: '#666'}}>No P2P events yet...</span>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>

      {/* Input controls */}
      <div style={{ display: "flex", gap: "5px" }}>
        <input 
          type="text" 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Send real-time payload..."
          style={{ flex: 1, padding: "5px", borderRadius: "4px", border: "1px solid #444", background: "#111", color: "#fff" }}
        />
        <button type="button" onClick={handleBroadcast} style={{ padding: "5px 10px", fontSize: "12px" }}>
          Send
        </button>
      </div>
    </div>
  );
}

// 3. The Fishjam Button Component
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

// 4. Connection Status Component
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

// 5. Reusable VideoPlayer Component 
function VideoPlayer({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline style={{ width: '300px', borderRadius: '8px', margin: '10px', transform: 'scaleX(-1)' }} />;
}

// 6. Local Video Component
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

// 7. ParticipantsView Component
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

// 8. Main App Component
function App() {
  return (
    <>
      <section id="center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <JoinRoomButton />
          <ConnectionStatus />
          <ParticipantsView />
          <InteractionChannel />
        </div>
      </section>
      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App