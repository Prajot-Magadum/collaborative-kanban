"use client";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";

export default function Home() {
  const socketRef = useRef(null);
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [cardsByList, setCardsByList] = useState({});
  const [draggedCard, setDraggedCard] = useState(null);
  const [newCard, setNewCard] = useState("");
  const [newBoard, setNewBoard] = useState("");
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newList, setNewList] = useState("");


  // 🔐 TEMP: token (later this comes from login UI)
  const token = typeof window !== "undefined"
    ? localStorage.getItem("token")
    : null;

  // 🔌 Socket connection
 useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) return;

  socketRef.current = io("http://localhost:5000", {
    auth: { token },
  });

  socketRef.current.on("connect", () => {
    console.log("Secure socket connected:", socketRef.current.id);
  });

  socketRef.current.on("card-created", ({ listId, card }) => {
    setCardsByList((prev) => ({
      ...prev,
      [listId]: [...(prev[listId] || []), card],
    }));
  });

  socketRef.current.on("card-moved", ({ fromListId, toListId, card }) => {
    setCardsByList((prev) => ({
      ...prev,
      [fromListId]: (prev[fromListId] || []).filter(
        (c) => c.id !== card.id
      ),
      [toListId]: [...(prev[toListId] || []), card],
    }));
  });

  socketRef.current.on("list-created", (list) => {
  setLists((prev) => [...prev, list]);
});


  socketRef.current.on("card-deleted", ({ cardId, listId }) => {
  setCardsByList((prev) => ({
    ...prev,
    [listId]: (prev[listId] || []).filter(
      (c) => c.id !== cardId
    ),
  }));
});
socketRef.current.on("list-deleted", ({ listId }) => {
  setLists((prev) =>
    prev.filter((list) => list.id !== listId)
  );

  setCardsByList((prev) => {
    const updated = { ...prev };
    delete updated[listId];
    return updated;
  });
});


  socketRef.current.on("connect_error", (err) => {
    console.log("Socket auth failed:", err.message);
  });

  return () => {
    socketRef.current.disconnect();
  };
}, []);


  useEffect(() => {
  const storedToken = localStorage.getItem("token");

  if (!storedToken) {
    router.push("/login");
  }
}, []);


  // 📦 Load boards
  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:5000/boards", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(setBoards);
  }, [token]);

  const createBoard = async () => {
  if (!newBoard) return;

  const token = localStorage.getItem("token");

  const res = await fetch("http://localhost:5000/boards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: newBoard }),
  });

  if (res.ok) {
    const createdBoard = await res.json();

    // update boards state without reload
    setBoards((prev) => [...prev, createdBoard]);

    setNewBoard("");
  }
};



// loadlist frontend

const loadLists = async (boardId) => {
  setActiveBoardId(boardId);
  setLoading(true);

  socketRef.current.emit("join-board", boardId);

  const listsData = await fetch(
    `http://localhost:5000/boards/${boardId}/lists`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  ).then((res) => res.json());

  setLists(listsData);

  const cardsMap = {};

  for (const list of listsData) {
    const cards = await fetch(
      `http://localhost:5000/lists/${list.id}/cards`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    ).then((res) => res.json());

    cardsMap[list.id] = cards;
  }

  setCardsByList(cardsMap);

  setLoading(false);
};



// create cards frontend


  const createCard = async (listId) => {
    if (!newCard) return;

    await fetch("http://localhost:5000/cards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: newCard, listId }),
    });

    await loadLists(lists[0].boardId);
    setNewCard("");
  };

const createList = async () => {
  if (!newList || !activeBoardId) return;

  const token = localStorage.getItem("token");

  await fetch("http://localhost:5000/lists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: newList,
      boardId: activeBoardId,
    }),
  });

  setNewList("");
};


const deleteCard = async (cardId) => {
  const token = localStorage.getItem("token");

  await fetch(`http://localhost:5000/cards/${cardId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const renameList = async (listId, newTitle) => {
  const token = localStorage.getItem("token");

  await fetch(`http://localhost:5000/lists/${listId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: newTitle }),
  });
};

const deleteList = async (listId) => {
  if(!confirm("Delete this list? "))return;
  const token = localStorage.getItem("token");

  await fetch(`http://localhost:5000/lists/${listId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // update UI immediately
  setLists((prev) =>
    prev.filter((list) => list.id !== listId)
  );
};



  const onDrop = async (listId) => {
    if (!draggedCard) return;

    await fetch(
      `http://localhost:5000/cards/${draggedCard.id}/move`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listId }),
      }
    );

    await loadLists(lists[0].boardId);
    setDraggedCard(null);
  };

  const activeBoard = boards.find(
  (b) => b.id === activeBoardId
);




return (
  <main style={{ padding: 40, fontFamily: "sans-serif" }}>
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <h1>Realtime Kanban</h1>
      <button
        onClick={() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }}
      >
        Logout
      </button>
    </div>

    {/* Boards Section */}
    <div style={{ marginTop: 30 }}>
      <h2>Your Boards</h2>

      {/* Create Board */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="New board name..."
          value={newBoard}
          onChange={(e) => setNewBoard(e.target.value)}
          style={{
            padding: 6,
            borderRadius: 4,
            border: "1px solid #ccc",
            marginRight: 8,
          }}
        />
        <button
          onClick={createBoard}
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "none",
            background: "#0070f3",
            color: "white",
            cursor: "pointer",
          }}
        >
          Create Board
        </button>
      </div>

      {/* Board Buttons */}
      {boards.map((board) => (
        <button
          key={board.id}
          onClick={() => loadLists(board.id)}
          style={{
            marginRight: 10,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            cursor: "pointer",
            background:
              activeBoardId === board.id ? "#0070f3" : "white",
            color:
              activeBoardId === board.id ? "white" : "black",
          }}
        >
          {board.title}
        </button>
      ))}
    </div>

    {/* Active Board Section */}
    {activeBoard && (
      <>
        <h2 style={{ marginTop: 40 }}>
          Board: {activeBoard.title}
        </h2>

        {/* Create List */}
        <div style={{ marginTop: 20 }}>
          <input
            placeholder="New list name..."
            value={newList}
            onChange={(e) => setNewList(e.target.value)}
            style={{
              padding: 6,
              borderRadius: 4,
              border: "1px solid #ccc",
              marginRight: 8,
            }}
          />
          <button
            onClick={createList}
            disabled={!newList}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "none",
              background: newList ? "#28a745" : "#ccc",
              color: "white",
              cursor: newList ? "pointer" : "not-allowed",
            }}
          >
            Add List
          </button>
        </div>
      </>
    )}

    {/* Loading */}
    {loading && (
      <p style={{ marginTop: 20 }}>Loading board...</p>
    )}

    {/* Empty State */}
{!loading && activeBoard && lists.length === 0 && (
  <div
    style={{
      marginTop: 30,
      padding: 20,
      background: "#f4f5f7",
      borderRadius: 8,
      color: "#6b778c",
      fontSize: 16,
      textAlign: "center",
      width: 300,
    }}
  >
    No lists yet in this board.<br />
    Create your first list above.
  </div>
)}


    {/* Lists + Cards */}
    {!loading && lists.length > 0 && (
      <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
        {lists.map((list) => (
          <div
            key={list.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(list.id)}
            style={{
              background: "#f4f5f7",
              padding: 15,
              borderRadius: 8,
              width: 260,
              minHeight: 400,
            }}
          >
 {/* List Header */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#ebecf0",
    padding: "8px 10px",
    borderRadius: 6,
    marginBottom: 10,
  }}
>
  {/* Rename Input */}
  <input
    value={list.title}
    onChange={(e) => {
      const newTitle = e.target.value;

      setLists((prev) =>
        prev.map((l) =>
          l.id === list.id ? { ...l, title: newTitle } : l
        )
      );

      renameList(list.id, newTitle);
    }}
    style={{
      flex: 1,
      fontWeight: "bold",
      fontSize: 16,
      border: "none",
      background: "transparent",
      outline: "none",
      color: "#172b4d",
    }}
  />

  {/* Delete Button */}
  <button
    onClick={() => deleteList(list.id)}
    style={{
      border: "none",
      background: "transparent",
      color: "red",
      fontSize: 18,
      fontWeight: "bold",
      cursor: "pointer",
      marginLeft: 8,
    }}
  >
    ✕
  </button>
</div>

           



            {/* Cards */}
            {(cardsByList[list.id] || []).map((card) => (
              <div
                key={card.id}
                draggable
                onDragStart={() => setDraggedCard(card)}
                style={{
                  background: "white",
                  padding: 10,
                  borderRadius: 6,
                  marginTop: 10,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  cursor: "grab",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{card.title}</span>

                <button
                  onClick={() => deleteCard(card.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "red",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Add Card */}
            <div style={{ marginTop: 15 }}>
              <input
                placeholder="New task..."
                value={newCard}
                onChange={(e) => setNewCard(e.target.value)}
                style={{
                  width: "100%",
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />
              <button
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: 6,
                  borderRadius: 4,
                  border: "none",
                  background: "#0070f3",
                  color: "white",
                  cursor: "pointer",
                }}
                onClick={() => createCard(list.id)}
              >
                Add Card
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </main>
);




}