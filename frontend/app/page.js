"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/boards")
      .then((res) => res.json())
      .then((data) => setBoards(data));
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>My Boards</h1>

      {boards.map((board) => (
        <div key={board.id} style={{ marginTop: 10 }}>
          {board.title}
        </div>
      ))}
    </main>
  );
}
