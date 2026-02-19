"use client";

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

export default function ArchiveModal({ cards, onClose, onRestore, onDelete }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-[700px] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b bg-slate-50">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-xl text-slate-800">
              📦 Archived Cards ({cards.length})
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Cards List */}
        <div className="flex-1 overflow-y-auto p-6">
          {cards.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg">No archived cards</p>
              <p className="text-sm mt-2">Archived cards will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        From: {card.list.title} • Archived{" "}
                        {new Date(card.archivedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Labels */}
                  {card.labels && card.labels.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {card.labels.map((labelName) => {
                        const label = LABEL_OPTIONS.find(
                          (l) => l.name === labelName
                        );
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

                  {/* Description */}
                  {card.description && (
                    <p className="text-sm text-slate-600 mb-3">
                      {card.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onRestore(card.id)}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                    >
                      ↩️ Restore
                    </button>
                    <button
                      onClick={() => onDelete(card.id)}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
                    >
                      🗑️ Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}