"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/boards")
      .then((res) => res.json())
      .then((data) => setBoards(data));
  }, []);

  const loadLists = (boardId) => {
    setSelectedBoard(boardId);

    fetch(`http://localhost:5000/boards/${boardId}/lists`)
      .then((res) => res.json())
      .then((data) => setLists(data));
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Boards</h1>

      {boards.map((board) => (
        <div
          key={board.id}
          style={{ cursor: "pointer", marginTop: 10 }}
          onClick={() => loadLists(board.id)}
        >
          {board.title}
        </div>
      ))}

      {selectedBoard && (
        <>
          <h2 style={{ marginTop: 40 }}>Lists</h2>

          <div style={{ display: "flex", gap: 20 }}>
            {lists.map((list) => (
              <div
                key={list.id}
                style={{
                  border: "1px solid black",
                  padding: 10,
                  minWidth: 150,
                }}
              >
                {list.title}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
