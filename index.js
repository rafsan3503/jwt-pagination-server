const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("hello world");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nk3n7xe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJwt = (req, res, next) => {
  const authToken = req.headers.authorization;
  if (!authToken) {
    res.send({
      message: "unauthorized access",
    });
  }
  jwt.verify(authToken, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      res.send({ error: "invalid token" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const productsCollection = client
      .db("JwtPagination")
      .collection("products");
    const usersCollection = client.db("JwtPagination").collection("users");
    //   pagination
    app.get("/products", async (req, res) => {
      const page = req.query.page;
      const size = parseInt(req.query.size);
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor
        .skip(size * page)
        .limit(size)
        .toArray();
      const count = await productsCollection.estimatedDocumentCount();
      console.log(page, size);
      res.send({ count, products });
    });

    // jwt
    app.post("/login", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token, result });
    });

    app.get("/orders", verifyJwt, async (req, res) => {
      const email = req.query.email;
      const userEmail = req.decoded;
      if (email !== userEmail.email) {
        res.send({
          message: "invalid user!!",
        });
      }
      const query = { email: email };
      const cursor = usersCollection.find(query);
      const users = await cursor.toArray();
      res.send({ users });
    });
  } finally {
  }
}

run().catch((err) => console.log(err));

app.listen(port, () => {
  console.log(`port is running from ${port}`);
});
