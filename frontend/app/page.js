"use client";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import CardModal from "./components/CardModal";
import ArchiveModal from "./components/ArchiveModal";
import ShareModal from "./components/ShareModal";
// Predefined label options
const LABEL_OPTIONS = [
  { name: "Bug", color: "bg-red-500", textColor: "text-white" },
  { name: "Feature", color: "bg-blue-500", textColor: "text-white" },
  { name: "Design", color: "bg-purple-500", textColor: "text-white" },
  { name: "Documentation", color: "bg-green-500", textColor: "text-white" },
  { name: "Testing", color: "bg-yellow-500", textColor: "text-white" },
  { name: "Urgent", color: "bg-orange-500", textColor: "text-white" },
  { name: "Backend", color: "bg-indigo-500", textColor: "text-white" },
  { name: "Frontend", color: "bg-pink-500", textColor: "text-white" },
];

export default function Home() {
  const socketRef = useRef(null);
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [cardsByList, setCardsByList] = useState({});
  const [draggedCard, setDraggedCard] = useState(null);
  const [newCardInputs, setNewCardInputs] = useState({});
  const [newBoard, setNewBoard] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("none");
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newList, setNewList] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [labelFilter, setLabelFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [archivedCards, setArchivedCards] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [boardMembers, setBoardMembers] = useState({ owner: null, members: [] });
  const [currentUser, setCurrentUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState(""); // success/error message

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

socketRef.current.on("card-archived", ({ cardId, listId }) => {
  setCardsByList((prev) => ({
    ...prev,
    [listId]: (prev[listId] || []).filter((c) => c.id !== cardId),
  }));
});

socketRef.current.on("card-restored", ({ card, listId }) => {
  setCardsByList((prev) => ({
    ...prev,
    [listId]: [...(prev[listId] || []), card],
  }));
  
  // Remove from archived list
  setArchivedCards((prev) => prev.filter((c) => c.id !== card.id));
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
socketRef.current.on("member-added", ({ member }) => {
  setBoardMembers((prev) => ({
    ...prev,
    members: [...prev.members, member],
  }));
});

socketRef.current.on("member-removed", ({ userId }) => {
  setBoardMembers((prev) => ({
    ...prev,
    members: prev.members.filter((m) => m.user.id !== userId),
  }));
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
useEffect(() => {
  const loadCurrentUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const user = await fetch("http://localhost:5000/me", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json());

      console.log("Current user loaded:", user);
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  loadCurrentUser();
}, []);



// Add this helper function near the top of your component (after state declarations):
const getCurrentBoardData = () => {
  return boards.find((b) => b.id === activeBoardId);
};

const isCurrentUserOwner = () => {
  const board = getCurrentBoardData();
  return board?.isOwner === true || board?.userId === boardMembers.owner?.id;
};

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
const loadBoardMembers = async (boardId) => {
  const token = localStorage.getItem("token");

  const data = await fetch(
    `http://localhost:5000/boards/${boardId}/members`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  ).then((res) => res.json());

  console.log("=== DEBUG BOARD MEMBERS ===");
  console.log("Board members:", data);
  console.log("Owner:", data.owner);
  console.log("Members:", data.members);
  
  setBoardMembers(data);
};
const inviteMember = async () => {
  if (!inviteEmail) return;

  const token = localStorage.getItem("token");

  const res = await fetch(
    `http://localhost:5000/boards/${activeBoardId}/invite`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: inviteEmail }),
    }
  );

  const data = await res.json();

  if (res.ok) {
    setInviteStatus({ type: "success", message: `${inviteEmail} invited successfully!` });
    setInviteEmail("");
    loadBoardMembers(activeBoardId);
  } else {
    setInviteStatus({ type: "error", message: data.error });
  }

  // Clear status after 3 seconds
  setTimeout(() => setInviteStatus(""), 3000);
};

const removeMember = async (userId) => {
  if (!confirm("Remove this member from the board?")) return;

  const token = localStorage.getItem("token");

  await fetch(
    `http://localhost:5000/boards/${activeBoardId}/members/${userId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  loadBoardMembers(activeBoardId);
};


// loadlist frontend

const loadLists = async (boardId) => {
  setActiveBoardId(boardId);
  setLoading(true);

  socketRef.current.emit("join-board", boardId);

  try {
    const listsResponse = await fetch(
      `http://localhost:5000/boards/${boardId}/lists`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!listsResponse.ok) {
      const error = await listsResponse.json();
      console.error("Error loading lists:", error);
      setLoading(false);
      return;
    }

    const listsData = await listsResponse.json();

    // Check if listsData is actually an array
    if (!Array.isArray(listsData)) {
      console.error("Expected array but got:", listsData);
      setLoading(false);
      return;
    }

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

    // Load board members
    await loadBoardMembers(boardId);

    setLoading(false);
  } catch (error) {
    console.error("Error in loadLists:", error);
    setLoading(false);
  }
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
const archiveCard = async (cardId) => {
  const token = localStorage.getItem("token");

  await fetch(`http://localhost:5000/cards/${cardId}/archive`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const restoreCard = async (cardId) => {
  const token = localStorage.getItem("token");

  await fetch(`http://localhost:5000/cards/${cardId}/restore`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const loadArchivedCards = async () => {
  if (!activeBoardId) return;

  const token = localStorage.getItem("token");

  const archived = await fetch(
    `http://localhost:5000/boards/${activeBoardId}/archived`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  ).then((res) => res.json());

  setArchivedCards(archived);
  setShowArchived(true);
};

const permanentlyDeleteCard = async (cardId) => {
  if (!confirm("Permanently delete this card? This cannot be undone!")) return;

  const token = localStorage.getItem("token");

  await fetch(`http://localhost:5000/cards/${cardId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Remove from archived list
  setArchivedCards((prev) => prev.filter((c) => c.id !== cardId));
};
// Filter and sort cards
// Filter and sort cards
const getFilteredAndSortedCards = (cards) => {
  if (!cards) return [];

  let filtered = [...cards];

  // 1. Search filter
  if (searchQuery) {
    filtered = filtered.filter((card) =>
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.description && card.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  // 2. Priority filter
  if (priorityFilter !== "all") {
    filtered = filtered.filter((card) => card.priority === priorityFilter);
  }

  // 3. Label filter
  if (labelFilter !== "all") {
    filtered = filtered.filter((card) => 
      card.labels && card.labels.includes(labelFilter)
    );
  }

  // 4. Sort
  if (sortBy === "dueDate") {
    filtered.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  } else if (sortBy === "priority") {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 4;
      const bPriority = priorityOrder[b.priority] || 4;
      return aPriority - bPriority;
    });
  }

  return filtered;
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
 {/* Top Navbar */}
{/* Top Navbar */}
<div className="flex justify-between items-center px-6 py-4 bg-white shadow">
  <h1 className="text-xl font-bold text-slate-800">
    Realtime Kanban
  </h1>

  <div className="flex gap-3 items-center">
    {/* Member Avatars */}
    {activeBoardId && boardMembers.members.length > 0 && (
      <div className="flex -space-x-2">
        {boardMembers.members.slice(0, 3).map((member) => (
          <div
            key={member.id}
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white"
            title={member.user.email}
          >
            {member.user.email[0].toUpperCase()}
          </div>
        ))}
        {boardMembers.members.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
            +{boardMembers.members.length - 3}
          </div>
        )}
      </div>
    )}

    {/* Share Button */}
    {activeBoardId && (
      <button
        onClick={() => setShowShareModal(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
      >
        👥 Share
      </button>
    )}

    {/* View Archived */}
    {activeBoardId && (
      <button
        onClick={loadArchivedCards}
        className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 flex items-center gap-2"
      >
        📦 Archived
      </button>
    )}

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
</div>


    {/* Boards row */}
    <div className="px-6 py-4 bg-slate-50 border-b">

      <div className="flex items-center gap-2 flex-wrap">

      {boards.map((board) => (
  <button
    key={board.id}
    onClick={() => loadLists(board.id)}
    className={`
      px-3 py-1 rounded font-medium transition flex items-center gap-1
      ${activeBoardId === board.id
        ? "bg-blue-600 text-white"
        : "bg-white hover:bg-slate-200"}
    `}
  >
    {board.isShared && <span title="Shared board">👥</span>}
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
{/* Filter/Sort Controls */}
{/* Filter/Sort Controls */}
{activeBoardId && (
  <div className="px-6 py-3 bg-white border-b">
    <div className="flex gap-3 items-center flex-wrap">
      
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search cards..."
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Priority Filter */}
      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value)}
        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Priorities</option>
        <option value="high">🔴 High</option>
        <option value="medium">🟡 Medium</option>
        <option value="low">🟢 Low</option>
      </select>

      {/* Label Filter */}
      <select
        value={labelFilter}
        onChange={(e) => setLabelFilter(e.target.value)}
        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Labels</option>
        {LABEL_OPTIONS.map((label) => (
          <option key={label.name} value={label.name}>
            🏷️ {label.name}
          </option>
        ))}
      </select>

      {/* Sort By */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="none">Sort By...</option>
        <option value="dueDate">📅 Due Date</option>
        <option value="priority">⚡ Priority</option>
      </select>

      {/* Clear Filters Button */}
      {(searchQuery || priorityFilter !== "all" || labelFilter !== "all" || sortBy !== "none") && (
        <button
          onClick={() => {
            setSearchQuery("");
            setPriorityFilter("all");
            setLabelFilter("all");
            setSortBy("none");
          }}
          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium"
        >
          Clear Filters
        </button>
      )}

    </div>
  </div>
)}

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
        {getFilteredAndSortedCards(cardsByList[list.id] || []).map((card) => (
  <div
    key={card.id}
    draggable
    onDragStart={() => setDraggedCard(card)}
    onClick={() => setSelectedCard(card)}
    className="bg-white p-3 rounded shadow hover:shadow-md cursor-grab transition-shadow"
  >
    {/* Card title and archive button */}
    <div className="flex justify-between items-start mb-2">
      <span className="font-medium text-slate-800 flex-1 pr-2">
        {card.title}
      </span>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          archiveCard(card.id);
        }}
        className="text-slate-400 hover:text-slate-600 text-xl leading-none flex-shrink-0"
        title="Archive card"
      >
        📦
      </button>
    </div>

    {/* Labels */}
    {card.labels && card.labels.length > 0 && (
      <div className="flex gap-1 flex-wrap mb-2">
        {card.labels.map((labelName) => {
          const label = LABEL_OPTIONS.find((l) => l.name === labelName);
          return label ? (
            <span
              key={labelName}
              className={`${label.color} ${label.textColor} px-2 py-0.5 rounded text-xs font-medium`}
            >
              {labelName}
            </span>
          ) : null;
        })}
      </div>
    )}

    {/* Description preview */}
    {card.description && (
      <p className="text-sm text-slate-600 mb-2 line-clamp-2">
        {card.description.length > 50
          ? card.description.substring(0, 50) + "..."
          : card.description}
      </p>
    )}

    {/* Priority badge and due date */}
    {(card.priority || card.dueDate) && (
      <div className="flex gap-2 flex-wrap items-center">
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


{/* No results message */}
  {getFilteredAndSortedCards(cardsByList[list.id] || []).length === 0 && 
   (cardsByList[list.id] || []).length > 0 && (
    <div className="text-center py-4 text-slate-400 text-sm">
      No cards match filters
    </div>
  )}
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
{selectedCard && (
  <CardModal
    card={selectedCard}
    onClose={() => setSelectedCard(null)}
    onSave={updateCard}
  />
)}

{showArchived && (
  <ArchiveModal
    cards={archivedCards}
    onClose={() => setShowArchived(false)}
    onRestore={restoreCard}
    onDelete={permanentlyDeleteCard}
  />
)}
{showShareModal && currentUser && (
  <ShareModal
    boardMembers={boardMembers}
    inviteEmail={inviteEmail}
    setInviteEmail={setInviteEmail}
    inviteStatus={inviteStatus}
    onInvite={inviteMember}
    onRemove={removeMember}
    onClose={() => {
      setShowShareModal(false);
      setInviteStatus("");
      setInviteEmail("");
    }}
    isOwner={currentUser.id === boardMembers.owner?.id}
  />
)}

  </main>
);



}