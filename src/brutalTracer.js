const logs = [];

function push(type, payload) {
  const entry = {
    time: new Date().toISOString(),
    type,
    payload
  };

  logs.push(entry);

  if (logs.length > 500) logs.shift();

  console.log("🧠 TRACE:", type, payload);
}

export const BrutalTracer = {
  log: push,
trace(type, payload) {
  push(type, payload);
},
  state(tag, value) {
    push("STATE", { tag, value });
  },

  action(tag, data) {
    push("ACTION", { tag, data });
  },

  api(tag, data) {
    push("API", { tag, data });
  },

  dump() {
    return logs;
  },

  clear() {
    logs.length = 0;
    console.log("🧹 TRACE CLEARED");
  }
};

// expose globalno za eruda
window.BRUTAL_TRACE = BrutalTracer;
