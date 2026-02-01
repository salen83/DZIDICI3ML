import React, { createContext, useContext, useState, useEffect } from "react";

const SofaContext = createContext();

export const SofaProvider = ({ children }) => {
  const [sofaRows, setSofaRows] = useState(() => {
    const saved = localStorage.getItem("sofaRows");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("sofaRows", JSON.stringify(sofaRows));
  }, [sofaRows]);

  return (
    <SofaContext.Provider value={{ sofaRows, setSofaRows }}>
      {children}
    </SofaContext.Provider>
  );
};

export const useSofa = () => useContext(SofaContext);
