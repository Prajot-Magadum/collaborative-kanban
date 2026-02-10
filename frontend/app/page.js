"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [cardsByList, setCardsByList] = useState({});
  const [draggedCard, setDraggedCard] = useState(null);
  const [newCard, setNewCard] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/boards")
      .then((res) => res.json())
      .then(setBoards);
  }, []);

  const loadLists = async (boardId) => {
    const listsData = await fetch(
      `http://localhost:5000/boards/${boardId}/lists`
    ).then((res) => res.json());

    setLists(listsData);

    // load cards for each list
    const cardsMap = {};
    for (const list of listsData) {
      const cards = await fetch(
        `http://localhost:5000/lists/${list.id}/cards`
      ).then((res) => res.json());
      cardsMap[list.id] = cards;
    }

    setCardsByList(cardsMap);
  };

  const createCard = async (listId) => {
    if (!newCard) return;

    await fetch("http://localhost:5000/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newCard, listId }),
    });

    const cards = await fetch(
      `http://localhost:5000/lists/${listId}/cards`
    ).then((res) => res.json());

    setCardsByList((prev) => ({ ...prev, [listId]: cards }));
    setNewCard("");
  };

  const onDrop = async (listId) => {
    if (!draggedCard) return;

    await fetch(
      `http://localhost:5000/cards/${draggedCard.id}/move`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId }),
      }
    );

    await loadLists(lists[0].boardId);
    setDraggedCard(null);
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

      <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
        {lists.map((list) => (
          <div
            key={list.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(list.id)}
            style={{
              border: "1px solid black",
              padding: 10,
              minWidth: 220,
            }}
          >
            <strong>{list.title}</strong>

            {(cardsByList[list.id] || []).map((card) => (
              <div
                key={card.id}
                draggable
                onDragStart={() => setDraggedCard(card)}
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
            <button onClick={() => createCard(list.id)}>Add</button>
          </div>
        ))}
      </div>
    </main>
  );
}
