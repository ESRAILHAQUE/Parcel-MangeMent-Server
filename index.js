require('dotenv').config();
const express = require('express');
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const app = express();
const cors = require('cors');
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const PORT = process.env.PORT || 5000;

// Middleware
//Must remove "/" from your production URL
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://parcel-944a6.web.app",
      "https://parcel-944a6.firebaseapp.com",
    ],
  })
);
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
    const reviewsCollection = client
      .db("parcelDB")
      .collection("reviewsCollection");
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

   app.patch("/profileUpdate/:email", async (req, res) => {
     const email = req.params.email;
     const query = { email: email }; // Filter to find the document with the specified email

     // Assuming req.body contains the updated profile data
     const update = { $set: req.body }; // Use $set to specify the fields to update and their new values

     try {
       const result = await usersCollection.updateOne(query, update); // Update the document with the specified email
       res.send(result);
     } catch (error) {
       console.error("Error updating profile:", error);
       res.status(500).send({ message: "Internal Server Error" });
     }
   });
 
    app.post("/user/bookings", async (req, res) => {
      const data = req.body;
      const result = await bookingsCollection.insertOne(data);
      res.send(result);

    })
     app.post("/review", async (req, res) => {
       const data = req.body;
       const result = await reviewsCollection.insertOne(data);
       res.send(result);
     });
     app.get("/review/:id", async (req, res) => {
       const id = req.params.id;
       const query = { DeliveryManID: id };
       const result = await reviewsCollection.find(query).toArray();
       res.send(result);
     });
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    
    // Common api
     app.get("/allUsers/common", async (req, res) => {
       // console.log(req.headers);
       const user = await usersCollection.find().toArray();
       res.send(user);
     });
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
    // Delivery Man checking
      app.get("/users/deliveryMan/:email", VerifyToken, async (req, res) => {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        let deliveryMan = false;
        if (user) {
          deliveryMan = user?.role === "DeliveryMan";
        }
        res.send({ deliveryMan });
      });
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
     app.get("/allUsers/:email", async (req, res) => {
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
    // For assignming parcel
     app.patch("/parcelsAssign/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: new ObjectId(id) };
       const updateFields = req.body; // Expecting fields like DeliveryManID, ApproximateDeliveryDate, and Status

       const updatedDoc = {
         $set: updateFields,
       }; 
       try {
         const result = await bookingsCollection.updateOne(filter, updatedDoc);
         res.send(result);
       } catch (error) {
         console.error("Error updating parcel:", error);
         res.status(500).send({ message: "Internal Server Error" });
       }
     });
    app.patch("/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateFields = req.body; // Expecting fields like DeliveryManID, ApproximateDeliveryDate, and Status

      const updatedDoc = {
        $set: updateFields,
      };
         delete updateFields._id;
      try {
        const result = await bookingsCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating parcel:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // problem
    app.get("/parcelsId/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bookingsCollection.findOne(filter);
      res.send(result);
    });
    
      app.get("/payment/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await bookingsCollection.findOne(filter);
        res.send(result);
      });

    app.get("/user/role", async (req, res) => {
      const role = req.query.role;
      const users = await usersCollection.find({ role: role }).toArray();
       res.send(users);
    });
      app.get("/parcels/Delivery/DeliveryManID", async (req, res) => {
        const DeliveryManID = req.query.DeliveryManID;
        const myParcels = await bookingsCollection
          .find({ DeliveryManID: DeliveryManID })
          .toArray();
        res.send(myParcels);
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
           role: "DeliveryMan",
         },
       };
       const result = await usersCollection.updateOne(filter, updatedDoc);
       res.send(result);
     });
    //  await client.db("admin").command({ ping: 1 });
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
