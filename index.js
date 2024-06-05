require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

const { MongoClient, ServerApiVersion } = require("mongodb");
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
    // await client.db("admin").command({ ping: 1 });
    const usersCollection = client.db('parcelDB').collection('usersCollection');
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ Message: 'User already exist', insertedId:null})
      }
      const result = await usersCollection.find(query)
      res.send(result);
    })
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
