import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from "react-router-dom";
import io from 'socket.io-client';
import './LiveSession.css'; // Import a separate CSS file for styling

const socket = io('http://localhost:5001');

function LiveSession() {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const commentListRef = useRef(null); // Ref to the comment list

  useEffect(() => {
    socket.on('comment', (comment) => {
      setComments((prevComments) => [...prevComments, comment]);
    });

    socket.on('offer', async (offer) => {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket.emit('answer', answer);
    });

    socket.on('answer', async (answer) => {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('candidate', async (candidate) => {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.off('comment');
      socket.off('offer');
      socket.off('answer');
      socket.off('candidate');
    };
  }, []);

  useEffect(() => {
    // Scroll to the bottom of the comment list when comments change
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  const handleCommentSubmit = () => {
    socket.emit('comment', newComment);
    setNewComment('');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleCommentSubmit();
    }
  };

  const startStreaming = async () => {
    if (isStreaming) return;

    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    });

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate);
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));

    localVideoRef.current.srcObject = stream;
    setIsStreaming(true);

    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socket.emit('offer', offer);
  };

  const stopStreaming = () => {
    const tracks = localVideoRef.current.srcObject?.getTracks();
    tracks.forEach(track => track.stop());
    localVideoRef.current.srcObject = null;
    remoteVideoRef.current.srcObject = null;

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsStreaming(false);
    comments.length = 0;
  };

  let navigate = useNavigate();

  const handleLoginButton = () => {
    let path = 'login';
    navigate(path);
  };

  return (
    <div className="live-session">
      <h1>Live Session</h1>
      <div id="video-feed" className="video-feed">
        <video ref={localVideoRef} autoPlay muted className="video-element"></video>
        <video ref={remoteVideoRef} autoPlay className="video-element"></video>
        <div className="comment-box">
          <div className="comment-list" ref={commentListRef}>
            {comments.map((comment, index) => (
              <p key={index}>{comment}</p>
            ))}
          </div>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type a comment"
            className="comment-input"
            onKeyDown={handleKeyPress}
          />
          <button onClick={handleCommentSubmit} className="comment-button">Send</button>
        </div>
        {!isStreaming ? (
          <button onClick={startStreaming} className="stream-button">Start Streaming</button>
        ) : (
          <button onClick={stopStreaming} className="stream-button">Stop Streaming</button>
        )}
      </div>
      <div className="login-button">
        <button onClick={handleLoginButton}>Login</button>
      </div>
    </div>
  );
}

export default LiveSession;
