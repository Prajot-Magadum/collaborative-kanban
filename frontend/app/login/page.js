"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      router.push("/");
    } else {
      alert("Invalid credentials");
    }
  };

return (
  <div
    style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "sans-serif",
    }}
  >
    <form
      onSubmit={handleLogin}
      style={{
        padding: 30,
        borderRadius: 10,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        width: 300,
      }}
    >
      <h2 style={{ marginBottom: 20 }}>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 20 }}
      />

      <button
        type="submit"
        style={{
          width: "100%",
          padding: 8,
          background: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: 4,
        }}
      >
        Login
      </button>
      <p>
  Don’t have an account? <a href="/signup">Sign up</a>
</p>

    </form>
  </div>
);

}
