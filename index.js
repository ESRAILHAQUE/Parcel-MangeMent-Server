require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require("jsonwebtoken");
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
    //MiddleWare
    const VerifyToken = (req,res,next) => {
      // console.log('Inside middleware', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
       
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
          next();
      })
    
    }
    const usersCollection = client.db("parcelDB").collection("usersCollection");
    const bookingsCollection = client.db("parcelDB").collection("bookingsCollection");
    // JWT Related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: '1hr'
        
      });
      res.send({token})
    })
    // use verify admin after verifyToken
    const verifyAdmin =async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({message: 'Forbidden access'})
      }
      next();
    }
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
    app.get('/allUsers', VerifyToken,verifyAdmin, async (req, res) => {
      // console.log(req.headers);
      const user = await usersCollection.find().toArray();
      res.send(user)
    })
    app.get('/users/admin/:email',VerifyToken, async(req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(401).send({message: 'unauthorized access'})
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin=user?.role ==='admin'
      }
      res.send({admin})
    })
    app.get("/parcels", async (req, res) => {
         
        const parcel = await bookingsCollection.find().toArray();
        res.send(parcel);
    });
    
    // Normal Users related Api
    app.get("/parcels/:email", async (req, res) => {
      const email = req.params.email;
         const query = { email: email };
         const parcel = await bookingsCollection.find(query).toArray();
         res.send(parcel);
    });
     app.get("/allUsers/:email", VerifyToken, async (req, res) => {
       // console.log(req.headers);
        const email = req.params.email;
        const query = { email: email };
       const user = await usersCollection.findOne(query);
       res.send(user);
     });
    app.patch("/parcels/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
         Status:'Cancelled'
       }
     }
      const result = await bookingsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.get("/user/role", async (req, res) => {
      const role = req.query.role;
      const users = await usersCollection.find({ role: role }).toArray();
       res.send(users);
    });
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
