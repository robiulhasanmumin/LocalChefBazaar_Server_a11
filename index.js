require("dotenv").config();
const express = require('express')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require('mongodb');

// middleWare
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5tck6.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("local_chef_bazaar_db")
    const mealsCollection = db.collection("meals")
    const reviewsCollection = db.collection("reviews")
    const usersCollection = db.collection('users')


   app.get("/meals",async(req,res)=>{
    const meal = req.body
    const result = await mealsCollection.find(meal).sort({rating:-1}).toArray()
    res.send(result)
   })

  //  reviews
   app.get("/reviews",async(req,res)=>{
    const foodId = req.query.foodId;
    const result = await reviewsCollection.find(foodId).sort({date:-1}).toArray()
    res.send(result)
   })

   app.post("/reviews",async(req,res)=>{
     const review = req.body;
     review.date = new Date();
  const result = await reviewsCollection.insertOne(review);
  res.send(result);
   })

  //  users
   app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "user";
      user.createdAt = new Date();
      const email = user.email;
      const userExists = await usersCollection.findOne({ email });
      if (userExists) {
        return res.send({ message: "user exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Local Chef Bazaar!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
