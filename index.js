import makeStore from "./src/store";
import { startServer } from "./src/server";
import { v4 as uuidv4 } from "uuid";

export const store = makeStore();
startServer(store);

// Create a demo room if desired
const demoRoomId = uuidv4();
store.dispatch({
  type: "CREATE_ROOM",
  roomId: demoRoomId,
  roomName: "Demo Room",
  theme: "Movies",
  creator: "System",
});

console.log("Voting server started on port 8090");
console.log("Demo room created with ID:", demoRoomId);
