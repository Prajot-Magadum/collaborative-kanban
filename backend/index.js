import "dotenv/config";
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

  res.json(board);
});



app.get("/boards", requireAuth, async (req, res) => {
  const boards = await prisma.board.findMany({
    where: { userId: req.userId },
  });

  res.json(boards);
});

// create list
app.post("/lists", async (req,res)=>{
    const {title,boardId} = req.body;
    const list = await prisma.list.create({
        data: {
            title,
            boardId,
        },
    });
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
  });

  if (!list) {
    return res.status(403).json({ error: "Access denied" });
  }

  const card = await prisma.card.create({
    data: { title, listId },
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
  });

  if (!card) {
    return res.status(403).json({ error: "Access denied" });
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: { listId },
  });

  res.json(updated);
});





app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
