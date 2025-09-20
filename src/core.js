import { List, Map } from "immutable";

export const INITIAL_STATE = Map({
  rooms: Map({}),
});

export function createRoom(state, roomId, roomName, theme, creator) {
  return state.setIn(
    ["rooms", roomId],
    Map({
      id: roomId,
      name: roomName,
      theme: theme,
      creator: creator,
      participants: Map().set(creator, true),
      entries: List(),
      phase: "collecting",
    })
  );
}

export function joinRoom(state, roomId, participant) {
  const room = state.getIn(["rooms", roomId]);
  if (!room) return state;

  return state.updateIn(["rooms", roomId, "participants"], (participants) =>
    participants.set(participant, true)
  );
}

export function addEntry(state, roomId, participant, entry) {
  const phase = state.getIn(["rooms", roomId, "phase"]);
  if (phase !== "collecting") return state;

  // Check if participant has already submitted an entry
  const entries = state.getIn(["rooms", roomId, "entries"]);
  const hasSubmitted = entries.some((e) => e.get("author") === participant);

  if (hasSubmitted) {
    return state; // Don't allow multiple entries from same participant
  }

  return state.updateIn(["rooms", roomId, "entries"], (entries) =>
    entries.push(
      Map({
        content: entry,
        author: participant,
      })
    )
  );
}

export function startVoting(state, roomId) {
  const entries = state.getIn(["rooms", roomId, "entries"]);
  if (!entries || entries.size < 2) return state;

  return state.withMutations((map) => {
    map
      .setIn(["rooms", roomId, "phase"], "voting")
      .setIn(
        ["rooms", roomId, "vote"],
        Map({
          pair: entries.take(2),
          tally: Map(),
          voters: Map(),
        })
      )
      .setIn(["rooms", roomId, "entries"], entries.skip(2));
  });
}

export function vote(state, roomId, participant, entry) {
  const entryPos = state
    .getIn(["rooms", roomId, "vote", "pair"])
    .findIndex((e) => e.get("content") === entry);
  if (entryPos === -1) return state;

  // Track who has voted for this round
  return state.withMutations((map) => {
    map
      .updateIn(
        ["rooms", roomId, "vote", "tally", entry],
        0,
        (tally) => tally + 1
      )
      .updateIn(["rooms", roomId, "vote", "voters"], Map(), (voters) =>
        voters.set(participant, true)
      );
  });
}

function getWinners(vote) {
  if (!vote) return [];
  const [a, b] = vote.get("pair");
  const aVotes = vote.getIn(["tally", a.get("content")], 0);
  const bVotes = vote.getIn(["tally", b.get("content")], 0);

  if (aVotes > bVotes) return [a];
  else if (aVotes < bVotes) return [b];
  else return [a, b];
}

export function next(state, roomId) {
  const vote = state.getIn(["rooms", roomId, "vote"]);
  const entries = state
    .getIn(["rooms", roomId, "entries"])
    .concat(getWinners(vote));

  if (entries.size === 1) {
    return state.updateIn(["rooms", roomId], (roomState) =>
      roomState
        .remove("vote")
        .remove("entries")
        .set("winner", entries.first())
        .set("phase", "completed")
    );
  }

  return state.updateIn(["rooms", roomId], (roomState) =>
    roomState.merge({
      vote: Map({
        pair: entries.take(2),
        tally: Map(),
        voters: Map(),
      }),
      entries: entries.skip(2),
    })
  );
}

export function setEntries(state, entries) {
  if (state.has("rooms")) {
    return state;
  }
  return state.set("entries", List(entries));
}
