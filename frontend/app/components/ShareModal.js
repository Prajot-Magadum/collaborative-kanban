"use client";

export default function ShareModal({
  boardMembers,
  inviteEmail,
  setInviteEmail,
  inviteStatus,
  onInvite,
  onRemove,
  onClose,
  isOwner,
}) {
  console.log("ShareModal - isOwner:", isOwner);
  console.log("ShareModal - boardMembers:", boardMembers);
  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-[500px] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b bg-slate-50">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-xl text-slate-800">
              👥 Share Board
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Invite Section - Only for Owner */}
          {isOwner && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">
                Invite by Email
              </h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onInvite()}
                  placeholder="Enter email address..."
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={onInvite}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                >
                  Invite
                </button>
              </div>

              {/* Status message */}
              {inviteStatus && (
                <p
                  className={`mt-2 text-sm ${
                    inviteStatus.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {inviteStatus.type === "success" ? "✅" : "❌"}{" "}
                  {inviteStatus.message}
                </p>
              )}
            </div>
          )}

          {/* Owner */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Owner</h3>
            {boardMembers.owner && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {boardMembers.owner.email[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">
                    {boardMembers.owner.email}
                  </p>
                  <p className="text-xs text-slate-500">Owner</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                  Owner
                </span>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">
              Members ({boardMembers.members.length})
            </h3>

            {boardMembers.members.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                No members yet. Invite someone!
              </p>
            ) : (
              <div className="space-y-2">
                {boardMembers.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                      {member.user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">
                        {member.user.email}
                      </p>
                      <p className="text-xs text-slate-500">
                        Member since{" "}
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Remove button - only for owner */}
                    {isOwner && (
                      <button
                        onClick={() => onRemove(member.user.id)}
                        className="px-2 py-1 text-red-500 hover:bg-red-50 rounded text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}