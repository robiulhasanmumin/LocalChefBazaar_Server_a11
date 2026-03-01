require("dotenv").config();
const express = require('express')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// const serviceAccount = require("./local-chef-bazaar-adminkey.json");
// const { date } = require("yup");

// // const serviceAccount = require("./firebase-admin-key.json");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middleWare
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "https://local-chef-bazaar-server-gold.vercel.app",  
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}))

app.use(express.json())

const verifyFBToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log("Authorization header:", req.headers.authorization);

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedUser = await admin.auth().verifyIdToken(token);
    req.user = decodedUser;
    next();
  } catch (error) {
    return res.status(403).send({ message: "Forbidden access" });
  }
};


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
    // await client.connect();
    const db = client.db("local_chef_bazaar_db")
    const mealsCollection = db.collection("meals")
    const reviewsCollection = db.collection("reviews")
    const usersCollection = db.collection('users')
    const favouritesCollection = db.collection("favourites")
    const orderCollection = db.collection("order_collection");
    const roleRequestCollection = db.collection("request")
    const paymentsCollection = db.collection("payments");
    const contactCollection = db.collection("contactMessages");


    const verifyAdmin = async (req, res, next) => {
  const email = req.user.email;
  const user = await usersCollection.findOne({ email });

  if (user?.role !== 'admin') {
    return res.status(403).send({ message: "Admin only" });
  }
  next();
};

app.get('/public-stats', async (req, res) => {
    try {
         const totalUsers = await usersCollection.countDocuments();

         const totalMeals = await mealsCollection.countDocuments();

         const ordersDelivered = await orderCollection.countDocuments({ 
            orderStatus: "delivered" 
        });

         const happyClients = totalUsers; 

         res.send({
            totalUsers,
            totalMeals,
            ordersDelivered,
            happyClients
        });

    } catch (err) {
        console.error("Public Stats Error:", err.message);
        res.status(500).send({ error: "Failed to fetch public statistics" });
    }
});

// contact message
app.post('/contact', async (req, res) => {
     const message = req.body; 
    
    try {
        const result = await contactCollection.insertOne(message);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Failed to save message" });
    }
});

// update profile
app.patch('/users/:email', verifyFBToken, async (req, res) => {
    const email = req.params.email;
    const updatedData = req.body; 
     
     if (req.user.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
    }

    const query = { email: email };
    const updateDoc = {
        $set: updatedData,
    };

    const result = await usersCollection.updateOne(query, updateDoc);
    res.send(result);
});


// meals
  
//  app.get("/meals",async(req,res)=>{
  //   const meal = req.body
  //   const result = await mealsCollection.find(meal).sort({rating:-1}).toArray()
  //   res.send(result)
  //  })

app.get('/meals', async (req, res) => {
    const search = req.query.search || "";
    const sort = req.query.sort || "";
    const rating = req.query.rating || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;

     let query = {
        foodName: { $regex: search, $options: 'i' }
    };

     if (rating) {
        query.rating = { 
            $gte: parseFloat(rating)  
        };
    }

    try {
        const skip = (page - 1) * limit;

         let sortOptions = {};
        if (sort === 'asc') sortOptions.price = 1;
        else if (sort === 'desc') sortOptions.price = -1;
        else sortOptions._id = -1;  

        const result = await mealsCollection
            .find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .toArray();

        const totalMeals = await mealsCollection.countDocuments(query);
        const totalPages = Math.ceil(totalMeals / limit);

        res.send({
            meals: result,
            totalPage: totalPages,
            totalCount: totalMeals
        });
    } catch (error) {
        res.status(500).send({ message: "Error fetching meals" });
    }
});


app.get("/meals/:id", async (req, res) => {
  const id = req.params.id;
  const query = {_id:new ObjectId(id)}
  const result = await mealsCollection.findOne(query);
  res.send(result);
});

  //  reviews
   app.get("/reviews",async(req,res)=>{
    const {foodId} = req.query;
    const query = foodId ? { foodId } : {};
    const result = await reviewsCollection.find(query).sort({date:-1}).toArray()
    res.send(result)
   })

   app.post("/reviews",async(req,res)=>{
     const review = req.body;
     review.date = new Date();
  const result = await reviewsCollection.insertOne(review);
  res.send(result);
   })

  //  favourites
  app.post("/favourites", async (req, res) => {
  const favourite = req.body;

  const exists = await favouritesCollection.findOne({
    userEmail: favourite.userEmail,
    mealId: favourite.mealId,
  });

  if (exists) {
    return res.send({ message: "already exists" });
  }

  favourite.addedTime = new Date();
  const result = await favouritesCollection.insertOne(favourite);
  res.send(result);
});


// order
app.post("/orders", async (req, res) => {
  const order = req.body;

  order.orderStatus = "pending";
  order.paymentStatus = "Pending";

   const existingOrder = await orderCollection.findOne({
    foodId: order.foodId,
    userEmail: order.userEmail,
    quantity: order.quantity,
  });
  
   const user = await usersCollection.findOne({
    email: order.userEmail
  });

  if (user?.status === "fraud") {
    return res.status(403).send({
      message: "Fraud users cannot place orders"
    });
  }

  if (existingOrder) {
    return res.status(409).send({
      message: "Same order with same quantity already exists",
    });
  }
  order.orderTime = new Date(order.orderTime);

  const result = await orderCollection.insertOne(order);
  res.send(result);
});

app.get("/orders/user/:email", verifyFBToken, async (req, res) => {
  const email = req.params.email;

  if (req.user.email !== email) {
    return res.status(403).send({ message: "Forbidden" });
  }

  const orders = await orderCollection.find({ userEmail: email }).sort({ orderTime: -1 }).toArray();

  res.send(orders);
});

app.patch("/orders/:id/accept", async (req, res) => {
  const id = req.params.id;

  const result = await orderCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { orderStatus: "accepted" } }
  );

  res.send(result);
});




  //  users
   app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "user";
      user.createdAt = new Date();
      user.status="active"
      const email = user.email;
      const userExists = await usersCollection.findOne({ email });
      if (userExists) {
        return res.send({ message: "user exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

app.get("/users/role/:email", async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });
  if (!user) {
    return res.send({ role: "user" });
  }
  res.send({ role: user.role || "user" });
});


// profile dashboard
app.get('/users/:email', verifyFBToken, async (req, res) => {
  const email = req.params.email
  const result = await usersCollection.findOne({ email })
  res.send(result)
})

// post role
app.post('/role-requests', async (req, res) => {
  const request = req.body
 const exists = await roleRequestCollection.findOne({
    userEmail: request.userEmail,
    requestType: request.requestType,
    requestStatus: "pending"
  });

  if (exists) {
    return res.status(409).send({
      message: "request already exists"
    });
  }

  request.requestTime = new Date();
  request.requestStatus = "pending";

  const result = await roleRequestCollection.insertOne(request)
  res.send(result)
})


// payment dashboard
app.post("/create-checkout-session", async (req, res) => {
  const { orderId, amount } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: "Meal Order Payment",
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    success_url: `http://localhost:5173/dashboard/payment-success?orderId=${orderId}&amount=${amount}`,
    cancel_url: `http://localhost:5173/dashboard/payment-cancel`,
  });

  res.send({ url: session.url });
});

app.patch("/orders/pay/:id", async (req, res) => {
  await orderCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { paymentStatus: "paid" } }
  );
  res.send({ success: true });
});


app.post("/payments", verifyFBToken, async (req, res) => {
  const payment = req.body;
  payment.paymentTime = new Date();
  await paymentsCollection.insertOne(payment);
  await orderCollection.updateOne(
    { _id: new ObjectId(payment.orderId) },
    { $set: { paymentStatus: "paid" } }
  );

  res.send({ success: true });
});



// Reviews dashboard
 app.get("/reviews/:email", verifyFBToken, async (req, res) => {
      const email = req.params.email;

      if (req.user.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).send({ message: "Forbidden" });
      }

      const result = await reviewsCollection.find({ email: email }).sort({ date: -1 }).toArray();
      res.send(result);
    });

    app.delete("/reviews/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const review = await reviewsCollection.findOne(query);

      if (!review) return res.status(404).send({ message: "Review not found" });
      if (review.email !== req.user.email)
        return res.status(403).send({ message: "Forbidden" });

      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/reviews/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const { rating, comment } = req.body;
      const query = {_id: new ObjectId(id)}

      const review = await reviewsCollection.findOne(query);
      if (!review) return res.status(404).send({ message: "Review not found" });
      if (review.email !== req.user.email)
        return res.status(403).send({ message: "Forbidden" });

      const updateDocs = {
        $set:{
          rating:rating,
          comment:comment,
          date:new Date()
        }
      }
      const result = await reviewsCollection.updateOne(query,updateDocs );
      res.send(result);
    });


    // favourites dashboard
     app.get("/favourites/:email", verifyFBToken, async (req, res) => {
      const email = req.params.email;

      if (req.user.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).send({ message: "Forbidden" });
      }

      const result = await favouritesCollection.find({ userEmail: email }).sort({ addedTime: -1 }).toArray();
      res.send(result);
    });

    app.delete("/favourites/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const favourite = await favouritesCollection.findOne(query);

      if (!favourite) return res.status(404).send({ message: "favourite not found" });
      if (favourite.userEmail !== req.user.email)
        return res.status(403).send({ message: "Forbidden" });

      const result = await favouritesCollection.deleteOne(query);
      res.send(result);
    });


    // admin manage user
app.get('/users', verifyFBToken, verifyAdmin, async (req, res) => {
  const users = await usersCollection.find().toArray();
  res.send(users);
});

app.patch('/users/fraud/:id', verifyFBToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;

  const result = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'fraud' } }
  );

  res.send(result);
});

// admin manage request
app.get("/role-requests", verifyFBToken, verifyAdmin, async (req, res) => {
  const requests = await roleRequestCollection
    .find()
    .sort({ requestTime: -1 })
    .toArray();

  res.send(requests);
});

app.patch("/role-requests/accept/:id",verifyFBToken,verifyAdmin,
  async (req, res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}

    const request = await roleRequestCollection.findOne(query);

    if (!request) {
      return res.status(404).send({ message: "Request not found" });
    }

    // CHEF REQUEST
    if (request.requestType === "chef") {
      const chefId = "CHEF-" + Math.floor(1000 + Math.random() * 9000);

      await usersCollection.updateOne(
        { email: request.userEmail },
        {
          $set: {
            role: "chef",
            chefId: chefId,
          },
        }
      );
    }

    // ADMIN REQUEST
    if (request.requestType === "admin") {
      await usersCollection.updateOne(
        { email: request.userEmail },
        { $set: { role: "admin" } }
      );
    }

    //  Update request status
    await roleRequestCollection.updateOne(
      query,
      { $set: { requestStatus: "approved" } }
    );

    res.send({ success: true });
  }
);

app.patch("/role-requests/reject/:id",verifyFBToken,verifyAdmin,
  async (req, res) => {
    const id = req.params.id;

    await roleRequestCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { requestStatus: "rejected" } }
    );

    res.send({ success: true });
  }
);


// Admin stat
app.get('/admin/stats', verifyFBToken, verifyAdmin, async (req, res) => {
  try {
    const totalPaymentsAgg = await paymentsCollection.aggregate([
      { $group: { _id: null, totalAmount: { $sum: { $toDouble: "$amount" } } } }]).toArray();

    const totalUsers = await usersCollection.countDocuments();

    const ordersPending = await orderCollection.countDocuments({ orderStatus: { $regex: /^pending$/i } });
    const ordersDelivered = await orderCollection.countDocuments({ orderStatus: "delivered" });

    res.send({
      totalPayments: totalPaymentsAgg[0]?.totalAmount || 0,
      totalUsers,
      ordersPending,
      ordersDelivered
    });

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


// chef create meals
app.post("/meals", verifyFBToken, async (req, res) => {
  const meal = req.body;

  meal.rating = 0;
  meal.createdAt = new Date();

  const result = await mealsCollection.insertOne(meal);
  res.send(result);
});

app.get("/meals/chef/:email", verifyFBToken, async (req, res) => {
  const email = req.params.email;
  const result = await mealsCollection.find({ userEmail: email }).toArray();
  res.send(result);
});

app.delete("/meals/:id", verifyFBToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await mealsCollection.deleteOne(query);
  res.send(result);
});

app.patch("/meals/:id", verifyFBToken, async (req, res) => {
  const id = req.params.id;
  const updatedMeal = req.body;
  const query = { _id: new ObjectId(id) }
  const result = await mealsCollection.updateOne(
    query, { $set: updatedMeal }
  );

  res.send(result);
});

// Chef order controll
app.get("/orders/chef/:chefId", async (req, res) => {
  const chefId = req.params.chefId;

  const orders = await orderCollection
    .find({ chefId })
    .sort({ orderTime: -1 })
    .toArray();

  res.send(orders);
});

app.patch("/orders/accept/:id", async (req, res) => {
  const id = req.params.id;

  const result = await orderCollection.updateOne(
    { _id: new ObjectId(id), orderStatus: "pending" },
    { $set: { orderStatus: "accepted" } }
  );

  res.send(result);
});

app.patch("/orders/cancel/:id", async (req, res) => {
  const id = req.params.id;

  const result = await orderCollection.updateOne(
    { _id: new ObjectId(id), orderStatus: "pending" },
    { $set: { orderStatus: "cancelled" } }
  );

  res.send(result);
});

app.patch("/orders/deliver/:id", async (req, res) => {
  const id = req.params.id;
 const order = await orderCollection.findOne({ _id: new ObjectId(id) });

  if (order.paymentStatus !== "paid") {
    return res.status(400).send({ message: "Payment not completed" });
  }

  await orderCollection.updateOne(
    { _id: new ObjectId(id)},
    { $set: { orderStatus: "delivered" } }
  );

  res.send({ success: true });
});















    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
