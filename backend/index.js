import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.post("/boards", async (req, res) => {
  const { title } = req.body;
  const board = await prisma.board.create({
    data: { title },
  });
  res.json(board);
});

app.get("/boards", async (req, res) => {
  const boards = await prisma.board.findMany();
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
app.get("/boards/:id/lists", async(req,res)=>{
    const boardId = req.params.id;
    const lists = await prisma.list.findMany({
        where:{boardId},
    });
    res.json(lists);
});

// Create Card
app.post("/cards",async(req,res)=>{
  const {title , listId} = req.body;

  const card = await prisma.card.create({
    data:{
      title,
      listId,
    },
  });
  res.json(card);
})


app.get("/lists/:id/cards",async(req,res)=>{
  const listId = req.params.id;
  const cards = await prisma.card.findMany({
    where:{listId},
  });
  res.json(cards);
})


app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
