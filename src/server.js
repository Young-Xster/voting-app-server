import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";

export function startServer(store) {
  const PORT = process.env.PORT || 8090;

  const io = new Server(PORT, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://votingrooms.netlify.app",
        "https://votingapp.me",
        "https://*.netlify.app",
        "https://*.vercel.app",
        process.env.FRONTEND_URL || "*",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  console.log(`Voting server started on port ${PORT}`);

  // Track which users are in which rooms and their userNames
  const userRooms = {};
  const socketUsers = {}; // Track userName by socket.id

  store.subscribe(() => {
    const state = store.getState();
    const rooms = state.get("rooms");

    if (rooms) {
      rooms.forEach((roomData, roomId) => {
        io.to(roomId).emit("state", roomData.toJS());
      });
    } else {
      io.emit("state", state.toJS());
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("createRoom", ({ username, roomName, theme }) => {
      const roomId = uuidv4();
      store.dispatch({
        type: "CREATE_ROOM",
        roomId,
        roomName,
        theme,
        creator: username,
      });

      socket.join(roomId);
      userRooms[socket.id] = roomId;
      socketUsers[socket.id] = username;

      socket.emit("roomCreated", { roomId });
      const roomstate = store.getState().getIn(["rooms", roomId]);
      if (roomstate) {
        socket.emit("state", roomstate.toJS());
      }
    });

    socket.on("joinRoom", ({ username, roomId }) => {
      const roomExists = store.getState().getIn(["rooms", roomId]);
      if (roomExists) {
        store.dispatch({
          type: "JOIN_ROOM",
          roomId,
          participant: username,
        });
        socket.join(roomId);
        userRooms[socket.id] = roomId;
        socketUsers[socket.id] = username;

        const roomState = store.getState().getIn(["rooms", roomId]);
        socket.emit("state", roomState.toJS());
      } else {
        socket.emit("error", { message: "Room not found" });
      }
    });

    socket.on("addEntry", ({ username, entry }) => {
      const roomId = userRooms[socket.id];
      if (roomId) {
        store.dispatch({
          type: "ADD_ENTRY",
          roomId,
          participant: username,
          entry,
        });
      }
    });

    socket.on("startVoting", () => {
      const roomId = userRooms[socket.id];
      const userName = socketUsers[socket.id];
      if (roomId && userName) {
        const room = store.getState().getIn(["rooms", roomId]);
        if (room && room.get("creator") === userName) {
          store.dispatch({
            type: "START_VOTING",
            roomId,
          });
        } else {
          socket.emit("error", {
            message: "Only the creator can start voting",
          });
        }
      }
    });

    socket.on("vote", ({ entry }) => {
      const roomId = userRooms[socket.id];
      const userName = socketUsers[socket.id];
      if (roomId && userName) {
        store.dispatch({
          type: "VOTE",
          roomId,
          participant: userName,
          entry,
        });
      }
    });

    socket.on("next", () => {
      const roomId = userRooms[socket.id];
      const userName = socketUsers[socket.id];
      if (roomId && userName) {
        const room = store.getState().getIn(["rooms", roomId]);
        if (room && room.get("creator") === userName) {
          store.dispatch({
            type: "NEXT",
            roomId,
          });
        }
      }
    });

    socket.emit("state", store.getState().toJS());
    socket.on("action", store.dispatch.bind(store));

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      delete userRooms[socket.id];
      delete socketUsers[socket.id];
    });
  });

  return io;
}
