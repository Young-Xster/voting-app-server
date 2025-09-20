import {
  createRoom,
  joinRoom,
  addEntry,
  startVoting,
  next,
  vote,
  setEntries,
  INITIAL_STATE,
} from "./core";

export default function reducer(state = INITIAL_STATE, action) {
  switch (action.type) {
    case "SET_ENTRIES":
      return setEntries(state, action.entries);
    case "NEXT":
      if (action.roomId) {
        return next(state, action.roomId);
      }
      return next(state);
    case "VOTE":
      if (action.roomId) {
        return vote(state, action.roomId, action.participant, action.entry);
      }
      return state.update("vote", (voteState) => vote(voteState, action.entry));
    case "CREATE_ROOM":
      return createRoom(
        state,
        action.roomId,
        action.roomName,
        action.theme,
        action.creator
      );
    case "JOIN_ROOM":
      return joinRoom(state, action.roomId, action.participant);
    case "ADD_ENTRY":
      return addEntry(state, action.roomId, action.participant, action.entry);
    case "START_VOTING":
      return startVoting(state, action.roomId);
  }
  return state;
}
