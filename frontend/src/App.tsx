import { useEffect, useRef, useState } from "react";
import "./App.css";
import { connect } from "socket.io-client";
import Peer from "simple-peer";
import { CopyToClipboard } from "react-copy-to-clipboard";

const socket = connect("http://localhost:5000");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState<MediaStream>();
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
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (stream) {
          setStream(stream);
          myVideo.current.srcObject = stream;
        }
      });
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
    console.log("peer");
    const peer = new Peer({ initiator: true, trickle: false, stream });
    console.log({ peer });
    peer.on("signal", (signal) => {
      socket.emit("callUser", { userToCall: idToCall, signal, from: me, name });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });
    socket.on("callAccepted", (signal) => {
      setcallerAccpted(true);
      peer.signal = signal;
    });
    connectionRef.current = peer;
  };

  const answerCall = () => {
    if (!name || !idToCall) return;
    setcallerAccpted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (signal) => {
      socket.emit("answerCall", { signal, to: caller });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
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
                autoPlay
                style={{ width: "350px", borderRadius: "10px" }}
              />
            )}
          </div>
          <div className="video">
            {callerAccpted && !callEnded && (
              <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{ width: "300px" }}
              />
            )}
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
