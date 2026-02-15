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
  const [loading, setLoading] = useState(true);
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
if (loading && boards.length === 0) {
  return (
    <div className="h-screen flex items-center justify-center text-lg">
      Loading boards...
    </div>
  );
}


return (
  <main className="min-h-screen bg-slate-100">

    {/* Header */}
    <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold">Realtime Kanban</h1>

      <button
        onClick={() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }}
        className="text-red-500 hover:text-red-600"
      >
        Logout
      </button>
    </div>


    {/* Content */}
    <div className="p-6">

      {/* Boards */}
      <div className="mb-6">

        <h2 className="text-lg font-semibold mb-3">Your Boards</h2>

        <div className="flex gap-2 mb-3">

          <input
            value={newBoard}
            onChange={(e) => setNewBoard(e.target.value)}
            placeholder="New board..."
            className="border rounded px-3 py-2"
          />

          <button
            onClick={createBoard}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create
          </button>

        </div>

        <div className="flex gap-2">

          {boards.map((board) => (

            <button
              key={board.id}
              onClick={() => loadLists(board.id)}
              className={`px-4 py-2 rounded shadow
              ${
                activeBoardId === board.id
                  ? "bg-blue-500 text-white"
                  : "bg-white hover:bg-slate-200"
              }`}
            >
              {board.title}
            </button>

          ))}

        </div>

      </div>


      {/* Active Board */}
      {activeBoard && (

        <>

          <h2 className="text-xl font-semibold mb-4">
            {activeBoard.title}
          </h2>


          {/* Add List */}
          <div className="flex gap-2 mb-6">

            <input
              value={newList}
              onChange={(e) => setNewList(e.target.value)}
              placeholder="New list..."
              className="border px-3 py-2 rounded"
            />

            <button
              onClick={createList}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add List
            </button>

          </div>


          {/* Lists */}
          <div className="flex gap-4 overflow-x-auto">

            {lists.map((list) => (

              <div
                key={list.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(list.id)}
                className="bg-slate-200 rounded p-3 w-72 shrink-0"
              >

                {/* List Title */}
                <input
                  value={list.title}
                  onChange={(e) =>
                    renameList(list.id, e.target.value)
                  }
                  className="font-semibold bg-transparent mb-3 w-full"
                />


                {/* Cards */}
                <div className="space-y-2">

                  {(cardsByList[list.id] || []).map((card) => (

                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDraggedCard(card)}
                      className="bg-white p-3 rounded shadow cursor-grab hover:bg-slate-50 flex justify-between"
                    >

                      {card.title}

                      <button
                        onClick={() => deleteCard(card.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>

                    </div>

                  ))}

                </div>


                {/* Add Card */}
                <div className="mt-3">

                  <input
                    value={newCard}
                    onChange={(e) => setNewCard(e.target.value)}
                    placeholder="Add card..."
                    className="w-full border rounded px-2 py-1"
                  />

                  <button
                    onClick={() => createCard(list.id)}
                    className="mt-2 w-full bg-blue-500 text-white py-1 rounded hover:bg-blue-600"
                  >
                    Add Card
                  </button>

                </div>

              </div>

            ))}

          </div>

        </>
      )}

    </div>

  </main>
);




}