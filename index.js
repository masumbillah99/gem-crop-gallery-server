const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const { MongoClient, ServerApiVersion } = require("mongodb");

// middleware
const app = express();
const port = process.env.PORT || 5100;
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: true,
    saveUninitialized: true,
  })
);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.krejmrw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection = client.db(process.env.DB_USER).collection("users");
    const imagesCollection = client
      .db(process.env.DB_USER)
      .collection("images");

    /** upload image */
    app.post("/upload-img", async (req, res) => {
      const imgData = req.body;
      const result = await imagesCollection.insertOne(imgData);
      res.send(result);
    });

    // get images
    app.get("/my-images", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res
          .status(403)
          .json({ error: true, message: "Forbidden Access" });
      }
      const query = { email: email };
      const result = await imagesCollection.find(query).toArray({});
      res.send(result);
    });

    // get single user
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      if (!email) {
        return res.status(401).send({ message: "User not found" });
      }
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
      // Retrieve user information from the database based on userId
      // usersCollection.findOne({ _id: userId }).then((user) => {
      //   if (!user) {
      //     return res.status(404).send({ message: "User not found" });
      //   }
      //   res.status(200).send(user);
      // });
    });

    // create new user
    app.post("/signup", async (req, res) => {
      const { username, email, password } = req.body;
      // Check if the user already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res
          .status(409)
          .send({ error: true, message: "User already exists" });
      }
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await usersCollection.insertOne({
        username,
        email,
        password: hashedPassword,
      });
      res.send(result);
    });

    // login existing user
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const user = await usersCollection.findOne({ email });
      const pass = await bcrypt.compare(password, user?.password);

      if (!user || !pass) {
        return res
          .status(401)
          .json({ message: "User not found Or Invalid password" });
      }

      // Set the user data in the session and a cookie
      // req.session.user = { id: user._id, email: user.email };
      // res.cookie("userId", user._id, { httpOnly: true });
      res.status(200).send({ message: "User login successful" });
    });

    // logout user
    app.get("/logout", async (req, res) => {
      req.session.destroy();
      res.clearCookie("userId");
      res.redirect("/login");
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`<h1>WELCOME TO GEM CROP GALLERY SERVER</h1>`);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
