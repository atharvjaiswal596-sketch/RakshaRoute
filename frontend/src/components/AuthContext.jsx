import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

function restoreUser() {
  try {
    const raw = localStorage.getItem("raksharoute_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(restoreUser);

  const login = (userData) => {
    localStorage.setItem("raksharoute_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("raksharoute_token");
    localStorage.removeItem("raksharoute_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}