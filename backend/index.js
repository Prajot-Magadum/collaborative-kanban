import "dotenv/config";
import http from "http";
import {Server} from "socket.io";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
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
  const { title } = req.body;

  const board = await prisma.board.create({
    data: {
      title,
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
});



app.get("/boards", requireAuth, async (req, res) => {
  const boards = await prisma.board.findMany({
    where: { userId: req.userId },
  });

  res.json(boards);
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

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      userId: req.userId,
    },
  });
console.log("Route userId:", req.userId);
console.log("BoardId:", boardId);

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


