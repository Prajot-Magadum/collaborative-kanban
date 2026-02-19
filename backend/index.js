import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import http from "http";
import {Server} from "socket.io";
import express from "express";
import cors from "cors";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
// Check if user has access to board (owner or member)
const requireBoardAccess = async (req, res, next) => {
  const boardId = req.params.boardId || req.body.boardId || req.params.id;

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { userId: req.userId },
        { members: { some: { userId: req.userId } } },
      ],
    },
  });

  if (!board) {
    return res.status(403).json({ error: "Access denied" });
  }

  req.board = board;
  req.isOwner = board.userId === req.userId;
  next();
};

app.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true },
  });

  res.json(user);
});
//signup

app.post("/auth/signup",async (req,res)=>{
  const {email,password} = req.body;
  if(!email || !password){
    return res.status(400).json({error:"email and password required"});
    
  }
  const hashedPassword = await bcrypt.hash(password,10);

  try{
    const user = await prisma.user.create({
      data: {
        email,
        password:hashedPassword,
      },
    });
    res.json({id : user.id, email:user.email});
  }catch(err){
    res.status(400).json({error: "user already exists"});
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});


app.post("/boards", requireAuth, async (req, res) => {
  try {
    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!userExists) {
      return res.status(401).json({ error: "User not found. Please login again." });
    }

    const board = await prisma.board.create({
      data: {
        title: req.body.title,
        userId: req.userId,
      },
    });

    await prisma.list.createMany({
      data: [
        { title: "Todo", boardId: board.id },
        { title: "Doing", boardId: board.id },
        { title: "Done", boardId: board.id },
      ],
    });

    res.json(board);
  } catch (error) {
    console.error("Error creating board:", error);
    res.status(500).json({ error: error.message });
  }
});
// Invite member to board by email
app.post("/boards/:id/invite", requireAuth, async (req, res) => {
  const boardId = req.params.id;
  const { email } = req.body;

  // Check if requester is board owner
  const board = await prisma.board.findFirst({
    where: { id: boardId, userId: req.userId },
  });

  if (!board) {
    return res.status(403).json({ error: "Only board owner can invite members" });
  }

  // Find user by email
  const invitedUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!invitedUser) {
    return res.status(404).json({ error: "User not found with that email" });
  }

  if (invitedUser.id === req.userId) {
    return res.status(400).json({ error: "You cannot invite yourself" });
  }

  try {
    // Add member
    const member = await prisma.boardMember.create({
      data: {
        boardId,
        userId: invitedUser.id,
        role: "member",
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    // Realtime notify board
    io.to(boardId).emit("member-added", {
      boardId,
      member,
    });

    res.json(member);
  } catch (err) {
    res.status(400).json({ error: "User is already a member" });
  }
});

// Get board members
app.get("/boards/:id/members", requireAuth, async (req, res) => {
  const boardId = req.params.id;

  // Check access
  const hasAccess = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { userId: req.userId },
        { members: { some: { userId: req.userId } } },
      ],
    },
  });

  if (!hasAccess) {
    return res.status(403).json({ error: "Access denied" });
  }

  const members = await prisma.boardMember.findMany({
    where: { boardId },
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  // Also include owner
  const owner = await prisma.user.findUnique({
    where: { id: hasAccess.userId },
    select: { id: true, email: true },
  });

  res.json({ owner, members });
});

// Remove member from board
app.delete("/boards/:id/members/:userId", requireAuth, async (req, res) => {
  const boardId = req.params.id;
  const targetUserId = req.params.userId;

  // Only owner can remove members
  const board = await prisma.board.findFirst({
    where: { id: boardId, userId: req.userId },
  });

  if (!board) {
    return res.status(403).json({ error: "Only board owner can remove members" });
  }

  await prisma.boardMember.deleteMany({
    where: { boardId, userId: targetUserId },
  });

  io.to(boardId).emit("member-removed", {
    boardId,
    userId: targetUserId,
  });

  res.json({ success: true });
});

// Get shared boards (boards where user is a member)
app.get("/boards/shared", requireAuth, async (req, res) => {
  const sharedBoards = await prisma.boardMember.findMany({
    where: { userId: req.userId },
    include: {
      board: {
        include: {
          user: { select: { id: true, email: true } },
        },
      },
    },
  });

  res.json(sharedBoards.map((m) => m.board));
});

app.get("/boards", requireAuth, async (req, res) => {
  try {
    // Get owned boards
    const ownedBoards = await prisma.board.findMany({
      where: { userId: req.userId },
      include: {
        user: { select: { id: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    // Get shared boards (where user is a member)
    const sharedMemberships = await prisma.boardMember.findMany({
      where: { userId: req.userId },
      include: {
        board: {
          include: {
            user: { select: { id: true, email: true } },
            members: {
              include: {
                user: { select: { id: true, email: true } },
              },
            },
          },
        },
      },
    });

    const sharedBoards = sharedMemberships.map((m) => ({
      ...m.board,
      isShared: true,
    }));

    const allBoards = [
      ...ownedBoards.map((b) => ({ ...b, isOwner: true })),
      ...sharedBoards,
    ];

    res.json(allBoards);
  } catch (error) {
    console.error("Error fetching boards:", error);
    res.status(500).json({ error: error.message });
  }
});



// create list
app.post("/lists", requireAuth, async (req, res) => {
  const { title, boardId } = req.body;

  // verify board belongs to user
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      userId: req.userId,
    },
  });

  if (!board) {
    return res.status(403).json({ error: "Access denied" });
  }

  const list = await prisma.list.create({
    data: {
      title,
      boardId,
    },
  });

  io.to(boardId).emit("list-created", list);

  res.json(list);
});


//get lists for  a board
app.get("/boards/:id/lists", requireAuth, async (req, res) => {
  const boardId = req.params.id;

  // Check if owner OR member
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { userId: req.userId },
        { members: { some: { userId: req.userId } } },
      ],
    },
  });

  if (!board) {
    return res.status(403).json({ error: "Access denied" });
  }

  const lists = await prisma.list.findMany({
    where: { boardId },
  });

  res.json(lists);
});


// Create Card
app.post("/cards", requireAuth, async (req, res) => {
  const { title, listId } = req.body;

  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      board: { userId: req.userId },
    },
    include:{board:true},
  });

  if (!list) {
    return res.status(403).json({ error: "Access denied" });
  }

  const card = await prisma.card.create({
    data: { title, listId },
  });
  //realtime notify
  io.to(list.boardId).emit("card-created",{
    listId,
    card,
  });
  res.json(card);
});


app.get("/lists/:id/cards", requireAuth, async (req, res) => {
  const listId = req.params.id;

  const cards = await prisma.card.findMany({
    where: {
      listId,
      archived: false, // ✅ Only get non-archived cards
      list: {
        board: { userId: req.userId },
      },
    },
  });

  res.json(cards);
});


// Move Card (update list)
app.put("/cards/:id/move", requireAuth, async (req, res) => {
  const cardId = req.params.id;
  const { listId } = req.body;

  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      list: {
        board: { userId: req.userId },
      },
    },
    include:{
      list:{include:{board:true}},
    },
  });

  if (!card) {
    return res.status(403).json({ error: "Access denied" });
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: { listId },
  });
  //realtime notify
  io.to(card.list.boardId).emit("card-moved", {
    cardId,
    fromListId: card.listId,
    toListId: listId,
    card: updated,
  });

  res.json(updated);
});
// Update card details
// Update card details
app.put("/cards/:id", requireAuth, async (req, res) => {
  const cardId = req.params.id;
  const { title, description, priority, dueDate, labels } = req.body;

  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      list: {
        board: { userId: req.userId },
      },
    },
    include: {
      list: true,
    },
  });

  if (!card) {
    return res.status(403).json({ error: "Access denied" });
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      labels: labels || [],
    },
  });

  // realtime update
  io.to(card.list.boardId).emit("card-updated", {
    listId: card.listId,
    card: updated,
  });

  res.json(updated);
});
// Archive Card
app.put("/cards/:id/archive", requireAuth, async (req, res) => {
  const cardId = req.params.id;

  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      list: {
        board: { userId: req.userId },
      },
    },
    include: {
      list: true,
    },
  });

  if (!card) {
    return res.status(403).json({ error: "Access denied" });
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      archived: true,
      archivedAt: new Date(),
    },
  });

  // Realtime notify
  io.to(card.list.boardId).emit("card-archived", {
    cardId,
    listId: card.listId,
  });

  res.json(updated);
});

// Restore Archived Card
app.put("/cards/:id/restore", requireAuth, async (req, res) => {
  const cardId = req.params.id;

  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      list: {
        board: { userId: req.userId },
      },
    },
    include: {
      list: true,
    },
  });

  if (!card) {
    return res.status(403).json({ error: "Access denied" });
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      archived: false,
      archivedAt: null,
    },
  });

  // Realtime notify
  io.to(card.list.boardId).emit("card-restored", {
    card: updated,
    listId: card.listId,
  });

  res.json(updated);
});

// Get Archived Cards for a Board
app.get("/boards/:id/archived", requireAuth, async (req, res) => {
  const boardId = req.params.id;

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      userId: req.userId,
    },
  });

  if (!board) {
    return res.status(403).json({ error: "Access denied" });
  }

  const archivedCards = await prisma.card.findMany({
    where: {
      archived: true,
      list: {
        boardId,
      },
    },
    include: {
      list: true,
    },
    orderBy: {
      archivedAt: 'desc',
    },
  });

  res.json(archivedCards);
});


app.put("/lists/:id", requireAuth, async (req, res) => {
  const listId = req.params.id;
  const { title } = req.body;

  // verify ownership
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      board: {
        userId: req.userId,
      },
    },
  });

  if (!list) {
    return res.status(403).json({ error: "Access denied" });
  }

  const updatedList = await prisma.list.update({
    where: { id: listId },
    data: { title },
  });

  io.to(list.boardId).emit("list-renamed", updatedList);

  res.json(updatedList);
});



app.delete("/cards/:id", requireAuth, async (req, res) => {
  const cardId = req.params.id;

  // 1️⃣ Verify card belongs to this user
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      list: {
        board: {
          userId: req.userId,
        },
      },
    },
    include: {
      list: true,
    },
  });

  if (!card) {
    return res.status(403).json({ error: "Access denied" });
  }

  // 2️⃣ Delete card
  await prisma.card.delete({
    where: { id: cardId },
  });

  // 3️⃣ Realtime notify board room
  io.to(card.list.boardId).emit("card-deleted", {
    cardId,
    listId: card.listId,
  });

  res.json({ success: true });
});

app.delete("/lists/:id", requireAuth, async (req, res) => {
  const listId = req.params.id;

  // verify ownership
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      board: {
        userId: req.userId,
      },
    },
  });

  if (!list) {
    return res.status(403).json({ error: "Access denied" });
  }

  // delete cards first (safe cascade)
  await prisma.card.deleteMany({
    where: { listId },
  });

  // delete list
  await prisma.list.delete({
    where: { id: listId },
  });

  io.to(list.boardId).emit("list-deleted", {
    listId,
  });

  res.json({ success: true });
});




const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});


io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-board",(boardId)=>{
    socket.join(boardId);
    console.log(`Socket ${socket.id} joined board ${boardId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});





server.listen(5000, () => {
  console.log("Server running on port 5000");
});


