"use client";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import CardModal from "./components/CardModal";


export default function Home() {
  const socketRef = useRef(null);
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [cardsByList, setCardsByList] = useState({});
  const [draggedCard, setDraggedCard] = useState(null);
  const [newCardInputs, setNewCardInputs] = useState({});
  const [newBoard, setNewBoard] = useState("");
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newList, setNewList] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);


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
socketRef.current.on("list-renamed", (updatedList) => {
  setLists((prev) =>
    prev.map((list) =>
      list.id === updatedList.id ? updatedList : list
    )
  );
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
socketRef.current.on("card-updated", ({ listId, card }) => {
  setCardsByList((prev) => ({
    ...prev,
    [listId]: prev[listId].map((c) =>
      c.id === card.id ? card : c
    ),
  }));
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


useEffect(() => {
  const storedToken = localStorage.getItem("token");

  if (!storedToken) {
    router.push("/login");
    return;
  }

  setLoading(true);

  fetch("http://localhost:5000/boards", {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      setBoards(data);
      setLoading(false); // ✅ IMPORTANT FIX
    })
    .catch((err) => {
      console.error(err);
      setLoading(false);
    });
}, []);


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
  const cardTitle = newCardInputs[listId];
  
  if (!cardTitle) return;

  await fetch("http://localhost:5000/cards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: cardTitle, listId }),
  });

  // Clear only this list's input
  setNewCardInputs((prev) => ({
    ...prev,
    [listId]: "",
  }));
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
const updateCard = async (updatedCard) => {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `http://localhost:5000/cards/${updatedCard.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: updatedCard.title,
        description: updatedCard.description,
        priority: updatedCard.priority,
        dueDate: updatedCard.dueDate,
      }),
    }
  );

  const savedCard = await res.json();

  // update local state immediately
  setCardsByList((prev) => ({
    ...prev,
    [savedCard.listId]: prev[savedCard.listId].map((c) =>
      c.id === savedCard.id ? savedCard : c
    ),
  }));
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
if (loading && boards.length === 0) {
  return (
    <div className="h-screen flex items-center justify-center text-lg">
      Loading boards...
    </div>
  );
}


return (
  <main className="h-screen flex flex-col bg-slate-100">

    {/* Top Navbar */}
    <div className="flex justify-between items-center px-6 py-4 bg-white shadow">
      <h1 className="text-xl font-bold text-slate-800">
        Realtime Kanban
      </h1>

      <button
        onClick={() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>


    {/* Boards row */}
    <div className="px-6 py-4 bg-slate-50 border-b">

      <div className="flex items-center gap-2 flex-wrap">

        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => loadLists(board.id)}
            className={`
              px-3 py-1 rounded font-medium transition
              ${activeBoardId === board.id
                ? "bg-blue-600 text-white"
                : "bg-white hover:bg-slate-200"}
            `}
          >
            {board.title}
          </button>
        ))}

        {/* Add Board */}
        <div className="flex gap-2 ml-4">
          <input
            value={newBoard}
            onChange={(e) => setNewBoard(e.target.value)}
            placeholder="New board..."
            className="px-2 py-1 border rounded"
          />

          <button
            onClick={createBoard}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add
          </button>
        </div>

      </div>

    </div>


    {/* Lists section */}
    <div className="flex-1 overflow-x-auto">

      {loading ? (

        <div className="p-6 text-slate-500">
          Loading board...
        </div>

      ) : (

        <div className="flex gap-4 p-6 min-h-full">

          {/* Lists */}
          {lists.map((list) => (
  <div
    key={list.id}
    onDragOver={(e) => e.preventDefault()}
    onDrop={() => onDrop(list.id)}
    className="bg-slate-200 rounded-lg p-3 w-72 shrink-0"
  >
    {/* List header with title and delete */}
    <div className="flex justify-between items-center mb-2">
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
        className="font-semibold bg-transparent flex-1 outline-none"
      />

      <button
        onClick={() => deleteList(list.id)}
        className="ml-2 text-red-500 hover:text-red-700 text-xl font-bold"
        title="Delete list"
      >
        ×
      </button>
    </div>

    {/* Cards */}
    <div className="space-y-2">
      {(cardsByList[list.id] || []).map((card) => (
  <div
    key={card.id}
    draggable
    onDragStart={() => setDraggedCard(card)}
    onClick={() => setSelectedCard(card)}
    className="bg-white p-3 rounded shadow hover:shadow-md cursor-grab transition-shadow"
  >
    {/* Card title and delete button */}
    <div className="flex justify-between items-start mb-2">
      <span className="font-medium text-slate-800 flex-1 pr-2">
        {card.title}
      </span>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteCard(card.id);
        }}
        className="text-red-500 hover:text-red-700 text-xl leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>

    {/* Description preview (first 60 chars) */}
    {card.description && (
      <p className="text-sm text-slate-600 mb-2 line-clamp-2">
        {card.description.length > 60
          ? card.description.substring(0, 60) + "..."
          : card.description}
      </p>
    )}

    {/* Priority badge and due date */}
    {(card.priority || card.dueDate) && (
      <div className="flex gap-2 flex-wrap items-center">
        {/* Priority badge */}
        {card.priority && (
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              card.priority === "high"
                ? "bg-red-100 text-red-700"
                : card.priority === "medium"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {card.priority.charAt(0).toUpperCase() + card.priority.slice(1)}
          </span>
        )}

        {/* Due date */}
        {card.dueDate && (
          <span
            className={`text-xs flex items-center gap-1 ${
              new Date(card.dueDate) < new Date()
                ? "text-red-600 font-semibold"
                : "text-slate-500"
            }`}
          >
            📅 {new Date(card.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
            {new Date(card.dueDate) < new Date() && (
              <span className="text-red-600">⚠️</span>
            )}
          </span>
        )}
      </div>
    )}
  </div>
))}
    </div>

    {/* Add card */}
    <div className="mt-3">
      <input
        value={newCardInputs[list.id] || ""}
        onChange={(e) =>
          setNewCardInputs((prev) => ({
            ...prev,
            [list.id]: e.target.value,
          }))
        }
        placeholder="Add card..."
        className="w-full px-2 py-1 rounded border"
      />

      <button
        onClick={() => createCard(list.id)}
        className="mt-1 w-full bg-blue-500 text-white rounded py-1 hover:bg-blue-600"
      >
        Add Card
      </button>
    </div>
  </div>
))}


          {/* Add List column */}
          {activeBoard && (
            <div className="w-72 shrink-0">

              <input
                value={newList}
                onChange={(e) => setNewList(e.target.value)}
                placeholder="New list..."
                className="w-full px-2 py-1 border rounded"
              />

              <button
                onClick={createList}
                className="mt-1 w-full bg-green-500 text-white rounded py-1 hover:bg-green-600"
              >
                Add List
              </button>

            </div>
          )}

        </div>

      )}

    </div>
      {selectedCard && (
  <CardModal
    card={selectedCard}
    onClose={() => setSelectedCard(null)}
    onSave={updateCard}
  />
)}

  </main>
);



}