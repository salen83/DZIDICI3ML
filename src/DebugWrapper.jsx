import React, { useEffect, useRef } from "react";

// Povezivanje na WebSocket server
const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
  console.log("DebugWrapper: povezano sa WS serverom");
};
ws.onmessage = (event) => {
  console.log("DebugWrapper poruka sa servera:", event.data);
};

export function debugLog(type, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data, ts: Date.now() }));
  }
}

// HOC koji obavija svaku komponentu
export function withDebug(WrappedComponent) {
  return function DebuggedComponent(props) {
    const renderCount = useRef(0);
    renderCount.current++;

    useEffect(() => {
      debugLog("mount", { name: WrappedComponent.name, props, renderCount: renderCount.current });
      return () => {
        debugLog("unmount", { name: WrappedComponent.name });
      };
    }, []);

    debugLog("render", { name: WrappedComponent.name, props, renderCount: renderCount.current });

    return <WrappedComponent {...props} />;
  };
}
