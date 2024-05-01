import { useEffect, useRef, useState } from "react";
import "./App.css";
import { connect } from "socket.io-client";
import Peer from "simple-peer";
import { CopyToClipboard } from "react-copy-to-clipboard";

const socket = connect("http://localhost:3000/", {
  extraHeaders: { "ngrok-skip-browser-warning": "69420" },
});
  
function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState("");
  const [callerAccpted, setcallerAccpted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const myVideo = useRef<any>();
  const userVideo = useRef<any>();
  const connectionRef = useRef<Peer.Instance>();

  useEffect(() => {
    try {
      navigator.mediaDevices
        .getUserMedia({ video: false, audio: true })
        .then((stream) => {
          if (stream) {
            try {
              setStream(stream);
              myVideo.current.srcObject = stream;
            } catch (e) {}
          }
        });
    } catch (e) {}

    socket.on("me", (id: string) => setMe(id));
    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = () => {
    if (!idToCall || !stream || !name) return;
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      socket.emit("callUser", { userToCall: idToCall, signal, from: me, name });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });
    socket.on("callAccepted", (signal: any) => {
      console.log("callAccepted", signal);
      setcallerAccpted(true);
      peer.signal(signal);
    });
    connectionRef.current = peer;
  };

  const answerCall = () => {
    if (!stream) return;
    setcallerAccpted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (signal) => {
      socket.emit("answerCall", { signal, to: caller });
    });
    peer.on("stream", (str) => {
      console.log({ answerCall: str });
      userVideo.current.srcObject = str;
    });
    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current?.destroy();
  };

  return (
    <>
      <h1 style={{ textAlign: "center", color: "#fff" }}>Meet-up</h1>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && (
              <video
                playsInline
                ref={myVideo}
                muted
                autoPlay
                style={{ width: "450px", borderRadius: "10px" }}
              />
            )}
          </div>
          <div className="video">
            <video
              playsInline
              ref={userVideo}
              autoPlay
              style={{ width: "450px" }}
            />
          </div>
        </div>
        <div className="myId">
          <label>Name: </label>
          <input
            id="filled-basic"
            value={name}
            onChange={({ target: { value } }) => setName(value)}
            style={{ marginBottom: "20px" }}
          />
          <CopyToClipboard text={me}>
            <button style={{ marginBottom: "2rem" }}>Copy ID</button>
          </CopyToClipboard>
          <label>Caller Id: </label>
          <input
            id="filled-basic"
            value={idToCall}
            onChange={({ target: { value } }) => setIdToCall(value)}
            style={{ marginBottom: "20px" }}
          />
          <div className="call-button">
            {callerAccpted && !callEnded ? (
              <button onClick={leaveCall}>End Call</button>
            ) : (
              <button onClick={callUser}>Call</button>
            )}
            <br />
          </div>
        </div>
        <div>
          {receivingCall && !callerAccpted && (
            <div className="caller">
              <h1>{name} is Calling...</h1>
              <button onClick={answerCall}>Answer</button>
            </div>
          )}
          <br />
        </div>
      </div>
    </>
  );
}

export default App;
