"use client";

import { useState } from "react";

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

export default function CardModal({ card, onClose, onSave }) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [priority, setPriority] = useState(card.priority || "low");
  const [dueDate, setDueDate] = useState(
    card.dueDate
      ? new Date(card.dueDate).toISOString().split("T")[0]
      : ""
  );
  const [selectedLabels, setSelectedLabels] = useState(card.labels || []);

  const toggleLabel = (labelName) => {
    setSelectedLabels((prev) =>
      prev.includes(labelName)
        ? prev.filter((l) => l !== labelName)
        : [...prev, labelName]
    );
  };

  const handleSave = () => {
    onSave({
      ...card,
      title,
      description,
      priority,
      dueDate,
      labels: selectedLabels,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg w-[500px] max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-xl text-slate-800">Edit Card</h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title
          </label>
          <input
            className="w-full border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            className="w-full border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a description..."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Labels */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Labels
          </label>
          <div className="flex flex-wrap gap-2">
            {LABEL_OPTIONS.map((label) => (
              <button
                key={label.name}
                type="button"
                onClick={() => toggleLabel(label.name)}
                className={`${
                  selectedLabels.includes(label.name)
                    ? `${label.color} ${label.textColor}`
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                } px-3 py-1.5 rounded-lg text-sm font-medium transition-colors`}
              >
                {selectedLabels.includes(label.name) && "✓ "}
                {label.name}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Priority
          </label>
          <select
            className="w-full border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            className="w-full border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              handleSave();
              onClose();
            }}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}