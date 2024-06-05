require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


const uri =
  `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.p8g8qjz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // // Send a ping to confirm a successful connection

    const usersCollection = client.db("parcelDB").collection("usersCollection");
    const bookingsCollection = client.db("parcelDB").collection("bookingsCollection");

    // Users related api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res
          .status(409)
          .send({ message: "User already exists", insertedId: null });
      }

      const result = await usersCollection.insertOne(user);

      res
        .status(201)
        .send({
          message: "User created successfully",
          insertedId: result.insertedId,
        });
    });
    app.post("/user/bookings", async (req, res) => {
      const data = req.body;
      const result = await bookingsCollection.insertOne(data);
      res.send(result);


    })
    // Admin related api
    app.get('/allUsers', async (req, res) => {
      const user = await usersCollection.find().toArray();
      res.send(user)
    })
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'

        }
      }
      const result= await usersCollection.updateOne(filter,updatedDoc)
      res.send(result)
    })
    // Make Devivery man api 
     app.patch("/users/delivery/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: new ObjectId(id) };
       const updatedDoc = {
         $set: {
           role: "Delivery",
         },
       };
       const result = await usersCollection.updateOne(filter, updatedDoc);
       res.send(result);
     });
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


app.get('/', (req, res) => {
    res.send('Project is running');
})
app.listen(PORT, () => {
    console.log(`app is running at http://localhost:${PORT}`)
})
