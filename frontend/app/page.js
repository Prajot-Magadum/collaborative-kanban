"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [newCard, setNewCard] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/boards")
      .then((res) => res.json())
      .then((data) => setBoards(data));
  }, []);

  const loadLists = (boardId) => {
    fetch(`http://localhost:5000/boards/${boardId}/lists`)
      .then((res) => res.json())
      .then((data) => setLists(data));
  };

  const loadCards = (listId) => {
    setSelectedList(listId);
    fetch(`http://localhost:5000/lists/${listId}/cards`)
      .then((res) => res.json())
      .then((data) => setCards(data));
  };

  const createCard = async () => {
    if (!newCard) return;

    await fetch("http://localhost:5000/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newCard,
        listId: selectedList,
      }),
    });

    setNewCard("");
    loadCards(selectedList);
  };

  // 🔽 DRAG START
  const onDragStart = (card) => {
    setDraggedCard(card);
  };

  // 🔽 DROP CARD INTO LIST
  const onDrop = async (listId) => {
  if (!draggedCard) return;

  await fetch(`http://localhost:5000/cards/${draggedCard.id}/move`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listId }),
  });

  setDraggedCard(null);
  setSelectedList(listId);   // 👈 switch list view
  loadCards(listId);
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

      <h2 style={{ marginTop: 40 }}>Lists</h2>

      <div style={{ display: "flex", gap: 20 }}>
        {lists.map((list) => (
          <div
            key={list.id}
            style={{
              border: "1px solid black",
              padding: 10,
              minWidth: 220,
            }}
            
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(list.id)}
          >
            <strong
             style={{ cursor: "pointer" }}
             onClick={() => loadCards(list.id)}
            >
            {list.title}
            </strong>


            {selectedList === list.id && (
              <>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => onDragStart(card)}
                    style={{
                      marginTop: 8,
                      padding: 6,
                      border: "1px solid gray",
                      cursor: "grab",
                    }}
                  >
                    {card.title}
                  </div>
                ))}

                <input
                  placeholder="New card..."
                  value={newCard}
                  onChange={(e) => setNewCard(e.target.value)}
                />
                <button onClick={createCard}>Add</button>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
