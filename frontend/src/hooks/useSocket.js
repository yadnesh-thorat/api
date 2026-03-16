import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";
function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  useEffect(() => {
    const token = localStorage.getItem("apiflow_token");
    const socket = io(window.location.origin, {
      auth: { token },
      transports: ["websocket", "polling"]
    });
    socket.on("connect", () => {
      setIsConnected(true);
      console.log("\u{1F50C} WebSocket connected");
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("\u{1F50C} WebSocket disconnected");
    });
    socket.on("user:joined", (data) => {
      setActiveUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev;
        return [...prev, { ...data, cursor: { line: 0, column: 0 } }];
      });
    });
    socket.on("user:left", (data) => {
      setActiveUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });
    socket.on("cursor:update", (data) => {
      setActiveUsers(
        (prev) => prev.map((u) => u.userId === data.userId ? { ...u, ...data } : u)
      );
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);
  const joinDoc = useCallback((docId) => {
    socketRef.current?.emit("doc:join", { docId });
  }, []);
  const leaveDoc = useCallback((docId) => {
    socketRef.current?.emit("doc:leave", { docId });
  }, []);
  const sendUpdate = useCallback((docId, update) => {
    socketRef.current?.emit("doc:update", { docId, update });
  }, []);
  const updateCursor = useCallback((docId, cursor) => {
    socketRef.current?.emit("cursor:update", { docId, cursor });
  }, []);
  const onDocUpdate = useCallback((callback) => {
    socketRef.current?.on("doc:update", callback);
    return () => {
      socketRef.current?.off("doc:update", callback);
    };
  }, []);
  const onDocInit = useCallback((callback) => {
    socketRef.current?.on("doc:init", callback);
    return () => {
      socketRef.current?.off("doc:init", callback);
    };
  }, []);
  return {
    socket: socketRef.current,
    isConnected,
    activeUsers,
    joinDoc,
    leaveDoc,
    sendUpdate,
    updateCursor,
    onDocUpdate,
    onDocInit
  };
}
export {
  useSocket
};
