"use client";

import { useState } from "react";

export default function CardModal({ card, onClose, onSave }) {

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [priority, setPriority] = useState(card.priority || "low");
  const [dueDate, setDueDate] = useState(
  card.dueDate 
    ? new Date(card.dueDate).toISOString().split("T")[0] 
    : ""
);

  const handleSave = () => {
    onSave({
      ...card,
      title,
      description,
      priority,
      dueDate,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center"
      onClick={onClose}
    >

      <div
        className="bg-white p-4 rounded w-96 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >

        <h2 className="font-bold text-lg">Edit Card</h2>

        <input
          className="w-full border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full border p-2 rounded"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="w-full border p-2 rounded"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <input
          type="date"
          className="w-full border p-2 rounded"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="flex justify-end gap-2">

          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              handleSave();
              onClose();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            Save
          </button>

        </div>

      </div>

    </div>
  );
}
