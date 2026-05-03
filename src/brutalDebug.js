export function brutalDebug() {
  console.log("🔥 BRUTAL DEBUG MODE AKTIVAN");

  window.BRUTAL = {
    dumpState() {
      console.log("📦 WINDOW KEYS:", Object.keys(window));
      console.log("⚛️ REACT ROOT:", document.getElementById("root"));
    },

    eruda() {
      console.log("🧪 ERUDA STATUS:", window.eruda ? "OK" : "MISSING");
      console.log(window.eruda || null);
    },

    inspectDOM() {
      console.log("🌐 BODY CHILDREN:", document.body.children);
    }
  };

  console.log("🧠 BRUTAL COMMANDS:");
  console.log("BRUTAL.dumpState()");
  console.log("BRUTAL.eruda()");
  console.log("BRUTAL.inspectDOM()");
}
