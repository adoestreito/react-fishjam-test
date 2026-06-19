import { useState, useEffect, useRef } from 'react'
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
  usePeers 
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
    const roomName = "testRoom";
    const peerName = "testUser";
    
    try {
      const peerToken = await getSandboxPeerToken(roomName, peerName);
      await initializeDevices({ enableAudio: false }); 
      await joinRoom({ peerToken });
      console.log("Successfully joined the room!");
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

// 3. Connection Status Component (Your Addition)
export function ConnectionStatus() {
  const { peerStatus } = useConnection();
  
  // Dynamic coloring based on status state
  const getStatusColor = () => {
    if (peerStatus === 'connected') return '#4caf50'; // Green
    if (peerStatus === 'connecting') return '#ffeb3b'; // Yellow
    return '#9e9e9e'; // Grey (idle / disconnected)
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

// 6. ParticipantsView Component
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

// 7. Main App Component
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <JoinRoomButton />
          
          {/* 🌟 LOOK HERE: Displays the real-time status right below the join button */}
          <ConnectionStatus />
          
          <ParticipantsView />
          
          <button
            type="button"
            className="counter"
            onClick={() => setCount((count) => count + 1)}
          >
            Count is {count}
          </button>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App