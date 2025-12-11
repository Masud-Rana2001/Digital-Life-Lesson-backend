require('dotenv').config()
const express = require('express')
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRECT_KEY)
const { MongoClient, ServerApiVersion ,ObjectId} = require('mongodb')

const admin = require('firebase-admin')
const port = process.env.PORT || 3000
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString(
  'utf-8'
)
const serviceAccount = JSON.parse(decoded)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const app = express()
// middleware
app.use(
  cors({
    origin: [
      process.env.CLIENT_DOMAIN
    ],
    credentials: true,
    optionSuccessStatus: 200,
  })
)
app.use(express.json())

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(' ')[1];
  
 
  if (!token) return res.status(401).send({ message: 'Unauthorized Access!' })
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.tokenEmail = decoded.email
    
    next()
  } catch (err) {
    console.log(err)
    return res.status(401).send({ message: 'Unauthorized Access!', err })
  }
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {


    const db = client.db("Digital-Life-Lesson");
    const lessonsCollection = db.collection("lessons");
    const usersCollection = db.collection("users");
    const reportsCollection = db.collection("reports");
    

    //     ######  verifyAdmin    ####
    const verifyAdmin =  async (req,res,next) => {
      const email = req.tokenEmail;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== "admin") {
        return res.status(403).send({
          message : "Unauthorized access"
        })
      }
      next()
    };
    //     ######  verifySeller    ####
    const verifySeller =  async (req,res,next) => {
      const email = req.tokenEmail;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== "seller") {
        return res.status(403).send({
          message : "Unauthorized access"
        })
      }
      next()
    };


    
    

    // Create Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { email, price } = req.body;

    const amount = parseInt(price) * 100; // smallest currency unit

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: "usd", // better to use "usd" or supported currency
            unit_amount: amount,
            product_data: {
              name: "Premium Plan ⭐",
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      mode: 'payment',
      success_url: `${process.env.CLIENT_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_DOMAIN}/dashboard/payment-cancelled`,
    });

    res.send({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to create checkout session" });
  }
});

// Retrieve Checkout Session after success
app.post('/payment-success', async (req, res) => {
  try {
    const { sessionId } = req.body;

    //  Stripe session retrieve
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    

    //  Email get from session
    const email = session.customer_email;

    if (!email) {
      return res.status(400).send({ error: "Customer email not found in session" });
    }

    //  Update user isPremium to true
    const updatedUser = await usersCollection.updateOne(
      { email: email },
      { $set: { isPremium: true } }
    );

    // Send response
    res.send({
      message: "Payment successful and user upgraded to Premium",
      session,
      updatedUser,
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to retrieve session or update user" });
  }
});


    // retrieve data stripe
  app.post('/payment-success',verifyJWT, async (req, res) => {
      const sessionId =  req.body.sessionId
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
    req.send(session)
    });





     //----------------------------------
    //       add lesson         //
    //---------------------------------- 
app.post("/lessons", verifyJWT, async (req, res) => {
  try {
    const email = req.tokenEmail;
    const lesson = req.body;

    const result = await lessonsCollection.insertOne(lesson);

    const query = { email };

    const userUpdateDoc = {
      $addToSet: { myLesson: result.insertedId },

      // merge all increments into ONE $inc
      $inc: {
        totalLessons: 1,
        "weeklyStats.lessonsCreated": 1,
        "weeklyStats.score": 5,
      }
    };

    const lessonRes = await usersCollection.updateOne(query, userUpdateDoc);

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
    
    //----------------------------------
    //           Delete a lesson
    //----------------------------------
    
app.delete("/lessons/:lessonId", verifyJWT, async (req, res) => {
  try {
    const lessonId = new ObjectId(req.params.lessonId);
    // 1. Delete lesson
    const deleteResult = await lessonsCollection.deleteOne({ _id: lessonId });
    
    
    if (deleteResult.deletedCount === 0) {
      return res.status(404).send({ message: "Lesson not found" });
    }

   
    const ownerUser = await usersCollection.findOne({
      myLesson: lessonId     
    });


    if (!ownerUser) {
      return res.send({
        success: true,
        message: "Lesson deleted successfully (No user stats changed)"
      });
    }

   
    const userUpdateDoc = {
      $pull: { myLesson: lessonId },
      $inc: {
        totalLessons: -1,
        "weeklyStats.lessonsCreated": -1,
        "weeklyStats.score": -5
      }
    };

    await usersCollection.updateOne({ email: ownerUser.email }, userUpdateDoc);

    res.send({
      success: true,
      message: "Lesson deleted & creator stats updated"
    });

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

    //-----------------------------------
    //         Update Lesson
    //------------------------------------
    app.patch('/update-lessons/:lessonId',verifyJWT, async (req, res) => {
      try {
        const requesterEmail = req.tokenEmail;
        const id = req.params.lessonId;
        const updateData = req.body;
        const lessonQuery = {_id: new ObjectId(id)}
        const updateDoc = {
          $set: updateData
        }
        const lesson = await lessonsCollection.findOne(lessonQuery)
        if (lesson.creator.email !== requesterEmail) {
            return res.status(403).send({ message: "Forbidden: You are not authorized to update this lesson." });
        }
        const result = await lessonsCollection.updateOne(lessonQuery, updateDoc, { upsert: false });
        if (result.modifiedCount > 0) {
            res.send({ 
                success: true, 
                message: "Lesson updated successfully.", 
                modifiedCount: result.modifiedCount 
            });
        } else if (result.matchedCount > 0 && result.modifiedCount === 0) {
            
             res.send({ 
                success: true, 
                message: "Lesson found, but no changes were applied.", 
                modifiedCount: 0
            });
        }
        else {
             
            res.status(404).send({ message: "Lesson not found or already deleted." });
        }
      } catch (error) {
        console.error("Error updating lesson:", error);
        res.status(500).send({ message: "Internal server error during update." });
      }
    })

 // GET MY LESSONS (BY CREATOR EMAIL)
app.get("/my-lessons/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const query = { "creator.email": email };

    const result = await lessonsCollection
      .find(query)
      .sort({ createdAt: -1 }) // newest first
      .toArray();

    res.send(result);

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
    
// get single lesson by ID
app.get("/lessons/:id", async (req, res) => {
  const id = req.params.id;
 
  const result = await lessonsCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.get("/featured-lessons", async (req, res) => {
  const result = await lessonsCollection
    .find({ isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();
 
  res.send(result);
});
    //------------------------
    //       Public lessons
    //----------------------------
app.get("/public-lessons", async (req, res) => {
  try {
    const { category, tone, search, page, limit } = req.query;

    const currentPage = parseInt(page) || 1;
    const perPage = parseInt(limit) || 6;
    const skip = (currentPage - 1) * perPage;

    // --- Query Object ---
    const query = { visibility: "Public" };

    if (category) query.category = category;
    if (tone) query.emotionalTone = tone;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // Count total docs
    const totalLessonsCount = await lessonsCollection.countDocuments(query);

    // Fetch paginated lessons
    const lessons = await lessonsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    res.send({
      lessons,
      totalLessonsCount,
      currentPage,
      totalPages: Math.ceil(totalLessonsCount / perPage)
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
});

      
app.get("/favorite-lessons", verifyJWT, async (req, res) => {
  try {
    const email = req.tokenEmail;
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const favLessonIds = user.favorites || [];
    if (favLessonIds.length === 0) {
      return res.send([]);
    }
    const objectIds = favLessonIds.map(id => new ObjectId(id));

    
    const favoriteLessons = await lessonsCollection
      .find({ _id: { $in: objectIds } })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(favoriteLessons);

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Something went wrong" });
  }
});

    
    //==============================
    // mark lesson as featured
    //==============================


app.patch("/admin/lessons/featured/:id", verifyJWT, verifyAdmin, async (req, res) => {
    const lessonId = req.params.id;
    const { isFeatured } = req.body; 

    if (typeof isFeatured !== 'boolean') {
        return res.status(400).send({ message: "Invalid status provided." });
    }
    
    try {
      
        const result = await lessonsCollection.updateOne(
            { _id: new ObjectId(lessonId) },
            { $set: { isFeatured: isFeatured } } 
        );
        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Lesson not found." });
        }

        res.send(result);
    } catch (error) {
        console.error("Error updating featured status:", error);
        res.status(500).send({ message: "Failed to update featured status." });
    }
});

    //=======================
    // Update Reviewed
    //====================

app.patch("/admin/lessons/reviewed/:id", verifyJWT, verifyAdmin, async (req, res) => {
    const lessonId = req.params.id;
    const { isReviewed } = req.body;

    if (typeof isReviewed !== 'boolean') {
        return res.status(400).send({ message: "Invalid status provided." });
    }
    
    try {
       
        const result = await lessonsCollection.updateOne(
            { _id: new ObjectId(lessonId) },
            { $set: { isReviewed: isReviewed } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Lesson not found." });
        }
        
        res.send(result);

    } catch (error) {
        console.error("Error updating reviewed status:", error);
        res.status(500).send({ message: "Failed to update reviewed status." });
    }
});
    
    

//  Get User Plan
    
app.get("/users/plan/:email", async (req, res) => {
  const result = await usersCollection.findOne(
    { email: req.params.email },
    { projection: { isPremium: 1 } }
  );
  res.send(result);
});


// ✔ Webhook (Stripe → Update User Premium)

app.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  let event = req.body;

  if (event.type === "checkout.session.completed") {
    const email = event.data.object.customer_email;

    await usersCollection.updateOne(
      { email },
      { $set: { isPremium: true } }
    );
  }

  res.sendStatus(200);
});


    //----------------------------------
    //       user related api          //
    //----------------------------------
    //------------------------
    //         get all user 
    //-------------------------
    app.get("/all-users",verifyJWT, async (req, res) => {
      const adminEmail = req.tokenEmail;
      const users = await usersCollection.find({
        email: {
          $ne : adminEmail
        }
      }).toArray();
      res.send(users)
    }) 

    //---------------------------
    //          get single user
    // --------------------------
    app.get("/single-user",verifyJWT, async (req, res) => {
      const email = req.tokenEmail;
      const user = await usersCollection.findOne({
        email
      })
      res.send(user);
    }) 
    
     //----------------------------------
    //       get user for post creator by email         
    //----------------------------------  
    app.get("/user-by-email/:email", async (req, res) => {
      const email = req.params.email
      const user = await usersCollection.findOne({
        email
      })
      res.send(user);
    }) 

    //----------------------------------
    //       Get lesson creator user by lesson ID         
    //---------------------------------- 
app.get("/lesson-creator/:lessonId", verifyJWT, async (req, res) => {
  try {
    const lessonId = req.params.lessonId;

    const lesson = await lessonsCollection.findOne({
      _id: new ObjectId(lessonId)
    });

    // Lesson not found
    if (!lesson) {
      return res.status(404).send({ message: "Lesson not found" });
    }

    const creatorEmail = lesson?.creator?.email;

    // creator.email missing (avoid crash)
    if (!creatorEmail) {
      return res.status(400).send({ message: "Creator email missing" });
    }

    const user = await usersCollection.findOne({ email: creatorEmail });

    // User not found
    if (!user) {
      return res.status(404).send({ message: "Creator not found" });
    }

    res.send(user);

  } catch (error) {
    console.error("Error fetching lesson creator:", error);
    res.status(500).send({ message: "Server error", error });
  }
});
    //----------------------------------
    //       user profile update         //
    //----------------------------------

app.patch("/update-profile", verifyJWT, async (req, res) => {
  try {
    const email = req.tokenEmail;
    const { name, image, coverPhoto, updatedAt } = req.body;

    const updatedData = {
      name,
      image,
      coverPhoto,
      updatedAt,
    };

    const result = await usersCollection.updateOne(
      { email },
      { $set: updatedData }
    );

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: true, message: "Profile update failed!" });
  }
});

    
    //----------------------------------
    //       user create          //
    //---------------------------------- 
    app.post("/user", async (req, res) => {
      const { name, email, imageURL } = req.body;
     
      try {
        const query = {
           email 
        }
        const isAreadyExisted = await usersCollection.findOne(query);
      if (!!isAreadyExisted) {
        const result = await usersCollection.updateOne(query, {
          $set: {
            lastLoggedIn: new Date().toISOString()
          }
        })
        return res.send(result)
      }
        const userData = {
      ...req.body,
      role: "user",
      createdAt: new Date(),
      lastLoggedIn: new Date(),
      isPremium: false,

      // LESSON STATS
      myLesson: [],
      totalLessons: 0,
      favorites: [],
      favoritesCount: 0,
      likes: [],
      comments: [],

      
      // WEEKLY CONTRIBUTOR STATS
      weeklyStats: {
        lessonsCreated: 0,
        likesReceived: 0,
        favoritesReceived: 0,
        commentsGiven: 0,
        score: 0,
        lastUpdated: new Date(),  
      }
    };
        
       
        const result = await usersCollection.insertOne(userData);
        
        res.send(result)

      } catch (error) {
        console.log(error);
        return res.send({
          message :"User not created"
        })
      }
    })
   
    //----------------------------------
    //      get user role          //
    //----------------------------------
    app.get("/role", verifyJWT, async (req, res) => {
      
      const result = await usersCollection.findOne({
        email:req.tokenEmail
      })
      
      res.send({
        role :result.role
      })

    })
    //----------------------------------
    //       get user isPremium         //
    //---------------------------------- 
    app.get("/isPremium", verifyJWT, async (req, res) => {
      
      const user = await usersCollection.findOne({
        email:req.tokenEmail
      })
      
      res.send({
        isPremium : user?.isPremium
      })

    })
    

    //----------------------------------
    //     get top CONTRIBUTOR         //
    //---------------------------------- 
    app.get("/top-contributors", async (req, res) => {
      const contributors = await usersCollection
        .find()
        .sort({ "weeklyStats.score": -1 })
        .limit(6)
        .project({
        name: 1,
        email: 1,
        imageURL: 1,
        weeklyStats: 1
      }).toArray();

      res.send(contributors)
    })

    //-----------------------------
    //         MOST saved lessons
    //-----------------------------
    app.get("/all-lessons/most-saved", async (req, res) => {
      try {
        
        const lessons = await lessonsCollection.find({})
           .sort({ favoritedCount: -1 })
          .limit(6)
          .toArray();
        res.send(lessons)
      } catch (error) {
         console.error(error);
    res.status(500).send({ message: "Something went wrong." });
      }
    })

    //---------------------------
    //       Similar   Lessons
    //----------------------------
    app.get("/allLessons/similar/:lessonId", async (req, res) => {
      const lessonId = req.params.lessonId;
      const currentLesson = await lessonsCollection.findOne({
        _id : new ObjectId(lessonId)
      })
      if (!currentLesson) {
        return res.status(404).send({
          message :" Lesson not found"
        })
      }
      const { category, emotionalTone } = currentLesson;
      const similarLessons = await lessonsCollection.find({
        _id: { $ne: new ObjectId(lessonId) },
        $or: [
          { category: category },
          { emotionalTone: emotionalTone }
        ]
      }).
        limit(6)
        .toArray();
      res.send(similarLessons)
    })
    //----------------------------------
    //       add like   💖      //
    //---------------------------------- 
  app.patch("/lessons/like", verifyJWT, async (req, res) => {
    try {
      const { lessonId } = req.body;
      const userEmail = req.tokenEmail;

      if (!lessonId) {
        return res.status(400).send({ message: "Lesson ID required." });
      }

      const query = { _id: new ObjectId(lessonId) };

      const lesson = await lessonsCollection.findOne(query);
      if (!lesson) {
        return res.status(404).send({ message: "Lesson not found." });
      }

      const alreadyLiked = lesson.likes.includes(userEmail);

      let updateDoc;

      if (alreadyLiked) {
      
        updateDoc = {
          $pull: { likes: userEmail },
          $inc: { likesCount: -1 }
        };
      } else {
      
        updateDoc = {
          $addToSet: { likes: userEmail },
          $inc: { likesCount: 1 }
        };
      }
      const result = await lessonsCollection.updateOne(query, updateDoc);


      // Update LESSON CREATOR weekly stats
      
     const creatorEmail = lesson.creator.email;

    const creatorUpdate = alreadyLiked
      ? { $inc: { "weeklyStats.likesReceived": -1, "weeklyStats.score": -2 } }
      : { $inc: { "weeklyStats.likesReceived": 1, "weeklyStats.score": 2 } };

    await usersCollection.updateOne({ email: creatorEmail }, creatorUpdate);

  
    // Update the USER who liked (likesGiven)

    const userUpdate = alreadyLiked
      ? { $inc: { "weeklyStats.likesGiven": -1, "weeklyStats.score": -1 } }
      : { $inc: { "weeklyStats.likesGiven": 1, "weeklyStats.score": 1 } };

    await usersCollection.updateOne({ email: userEmail }, userUpdate);

      return res.send({
        message: alreadyLiked ? "Like removed ❤️" : "Liked successfully ❤️",
        liked: !alreadyLiked
      });

    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Something went wrong." });
    }
  });

    
    //-----------------------
    //     save to fav 
    // ----------------------
app.patch("/lessons/save-to-favorites", verifyJWT, async (req, res) => {
  try {
    const { lessonId } = req.body;
    const userEmail = req.tokenEmail;

    if (!lessonId) {
      return res.status(400).send({ message: "Lesson ID required." });
    }

    const userQuery = { email: userEmail };
    const lessonQuery = { _id: new ObjectId(lessonId) };

    const user = await usersCollection.findOne(userQuery);
    const lesson = await lessonsCollection.findOne(lessonQuery);

    if (!user) return res.status(404).send({ message: "User not found" });
    if (!lesson) return res.status(404).send({ message: "Lesson not found" });

    const creatorEmail = lesson.creator.email;
    const creatorQuery = { email: creatorEmail };

    const alreadySaved = user.favorites?.includes(lessonId);

    let userUpdate = {};
    let creatorUpdate = {};
    let lessonUpdate = {};

    if (alreadySaved) {
      // Remove
      userUpdate = {
        $pull: { favorites: lessonId },
        $inc: {
          favoritesCount: -1,
          "weeklyStats.favoritesGiven": -1,
          "weeklyStats.score": -1
        }
      };

      creatorUpdate = {
        $inc: {
          "weeklyStats.favoritesReceived": -1,
          "weeklyStats.score": -2
        }
      };

      lessonUpdate = {
        $pull: { favorites: userEmail },
        $inc: { favoritedCount: -1 }
      };

    } else {
      // Add
      userUpdate = {
        $addToSet: { favorites: lessonId },
        $inc: {
          favoritesCount: 1,
          "weeklyStats.favoritesGiven": 1,
          "weeklyStats.score": 1
        }
      };

      creatorUpdate = {
        $inc: {
          "weeklyStats.favoritesReceived": 1,
          "weeklyStats.score": 2
        }
      };

      lessonUpdate = {
        $addToSet: { favorites: userEmail },
        $inc: { favoritedCount: 1 }
      };
    }

    await usersCollection.updateOne(userQuery, userUpdate);
    await usersCollection.updateOne(creatorQuery, creatorUpdate);
    await lessonsCollection.updateOne(lessonQuery, lessonUpdate);

    res.send({
      saved: !alreadySaved,
      message: alreadySaved
        ? "Removed from favorites ⭐"
        : "Saved to favorites ⭐"
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Something went wrong" });
  }
});
      // ---------------------
     //       Comments 
    //-----------------------
 app.post("/create-comment", verifyJWT, async (req, res) => {
  try {
    const userEmail = req.tokenEmail;
    const { lessonId, comment, createdAt } = req.body;

    if (!lessonId || !comment) {
      return res.status(400).send({ message: "Lesson ID & comment required" });
    }

    const lessonQuery = { _id: new ObjectId(lessonId) };
    const lesson = await lessonsCollection.findOne(lessonQuery);

    if (!lesson) {
      return res.status(404).send({ message: "Lesson not found" });
    }

    const commenterEmail = userEmail;
    const lessonCreatorEmail = lesson.creator.email;

    // Add comment to lesson
    const commentUpdateDoc = {
      $push: {
        comments: {
          email: commenterEmail,
          comment,
          createdAt
        }
      },
      $inc: { commentsCount: 1 }
    };

    await lessonsCollection.updateOne(lessonQuery, commentUpdateDoc);

    // Update stats of commenter (user)
    const commenterQuery = { email: commenterEmail };
    const commenterUpdate = {
      $inc: {
        "weeklyStats.commentsGiven": 1,
        "weeklyStats.score": 1
      }
    };

    // Update stats of creator (receives comment)
    const creatorQuery = { email: lessonCreatorEmail };
    const creatorUpdate = {
      $inc: {
        "weeklyStats.commentsReceived": 1,
        "weeklyStats.score": 2
      }
    };

    await usersCollection.updateOne(commenterQuery, commenterUpdate);
    await usersCollection.updateOne(creatorQuery, creatorUpdate);

    res.send({
      message: "Comment added successfully",
      status: true
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Something went wrong" });
  }
});


    //---------------------------------
    //       Report create 
    //---------------------------------
 
app.post("/lessons/report", verifyJWT, async (req, res) => {
  const { lessonId, reporterEmail, reason, details } = req.body;

  if (!lessonId || !reporterEmail || !reason) {
    return res.status(400).send({ message: "Missing fields" });
  }

  const report = {
    reporterEmail,
    reason,
    details: details || "",
    reportedAt: new Date(),
  };

  // 1️⃣ Reports Collection এ Insert
  const reportInsert = await reportsCollection.insertOne({
    lessonId,
    ...report
  });

  // 2️⃣ Lessons Collection এ Embedded Report Push + reportCount Increase
  const updateLesson = await lessonsCollection.updateOne(
    { _id: new ObjectId(lessonId) },
    {
      $inc: { reportCount: 1 },
      $push: {
        reports: {
          _id: reportInsert.insertedId,
          ...report
        }
      }
    }
  );

  res.send({
    success: true,
    reportId: reportInsert.insertedId,
    lessonUpdate: updateLesson
  });
});




    //------------------------------
    //         Dashboard summary
    //-------------------------------


app.get("/dashboard/summary", verifyJWT, async (req, res) => {
    const userEmail = req.tokenEmail; 
    
    try {
        const userData = await usersCollection.findOne(
            { email: userEmail },
            { 
                projection: { 
                    name: 1, 
                    email: 1, 
                    isPremium: 1, 
                    imageURL: 1, 
                    favoritesCount: 1, 
                    myLesson: 1, 
                    weeklyStats: 1 
                }
            }
        );

        if (!userData) {
            return res.status(404).send({ message: "User data not found." });
        }
        const totalLessonsCreated = userData.myLesson ? userData.myLesson.length : 0; 
        const totalSavedLessons = userData.favoritesCount || 0;
        const lessonIds = userData.myLesson.map(id => new ObjectId(id));
        
    
        const recentlyAddedLessons = await lessonsCollection.find({
            _id: { $in: lessonIds } 
        })
        .sort({ createdAt: -1 }) 
        .limit(4) 
        .project({ title: 1,image:1, createdAt: 1, emotionalTone: 1 }) 
        .toArray()


    
        const summary = {
            name: userData.name,
            email: userData.email,
            isPremium: userData.isPremium,
            imageURL: userData.imageURL,
            
          
            totalLessonsCreated,
            totalSavedLessons,
            
           
            weeklyStats: userData.weeklyStats || {},
            recentlyAddedLessons,
        };
        
        res.send(summary);

    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        res.status(500).send({ message: "Internal server error while fetching dashboard data." });
    }
});
    

    
    // ------------------------------
    //      admin all-lessons
    // -------------------------------
 

app.get("/admin/all-lessons", verifyJWT, verifyAdmin, async (req, res) => {
    const { category, visibility, status } = req.query;

    let query = {};

    if (category && category !== '') {
        query.category = category;
    }

    if (visibility && visibility !== '') {
        query.visibility = visibility;
    }

    if (status && status !== '') {
        if (status === 'flagged') {
            query.isFlagged = true;
        } else if (status === 'reviewed') {
            query.isReviewed = true;
        } else if (status === 'unreviewed') {
            query.isReviewed = { $ne: true };
        } else if (status === 'featured') {
            query.isFeatured = true;
        }
    }

    try {
        const lessons = await lessonsCollection.find(query)
            .sort({ createdAt: -1 })
            .toArray();

        res.send(lessons);
    } catch (error) {
        console.error("Error fetching lessons for admin:", error);
        res.status(500).send({ message: "Failed to load filtered lessons. Internal server error." });
    }
});

    //---------------------------------
    //       lesson-stats
    //---------------------------------
app.get("/admin/lesson-stats", verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const stats = await lessonsCollection.aggregate([
            {
                $group: {
                    _id: null,
                    publicCount: { $sum: { $cond: [{ $eq: ["$visibility", "Public"] }, 1, 0] } },
                    privateCount: { $sum: { $cond: [{ $eq: ["$visibility", "Private"] }, 1, 0] } },
                    
                    reportCount: { $sum: { $cond: [{ $gt: ["$reportCount", 0] }, 1, 0] } },
                }
            },
            {
                $project: {
                    _id: 0,
                    publicCount: 1,
                    privateCount: 1,
                    reportCount: 1,
                }
            }
        ]).toArray();

        res.send(stats[0] || { publicCount: 0, privateCount: 0, reportCount: 0 });

    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).send({ message: "Failed to fetch admin stats." });
    }
});




    // -------------------------
    //    reported lessons
    //--------------------------


app.get("/admin/reported-lessons", verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const pipeline = [
            {
                $group: {
                    _id: "$lessonId", 
                    reportCount: { $sum: 1 }, 
                    latestReportDate: { $max: "$reportedAt" } //
                }
            },
            {
                $sort: { latestReportDate: -1 } 
            },
            {
                $addFields: {
                    lessonObjectId: { $toObjectId: "$_id" }
                }
            },
            {
                $lookup: { 
                    from: "lessons", 
                    localField: "lessonObjectId",
                    foreignField: "_id",
                    as: "lessonDetails"
                }
            },
            {
                $unwind: "$lessonDetails" 
            },
            {
                $project: {
                    _id: "$lessonObjectId",
                    title: "$lessonDetails.title",
                    image: "$lessonDetails.image",
                    reportCount: 1,
                    latestReportDate: 1 
                }
            }
        ];

        const reportedLessons = await reportsCollection.aggregate(pipeline).toArray(); 
        res.send(reportedLessons);

    } catch (error) {
        console.error("Error fetching reported lessons:", error);
        res.status(500).send({ message: "Failed to load reported lessons." });
    }
});

    
    
    //-----------------------------------
    // reported lessons Details
    //------------------------------------

    


app.get("/admin/reports/lesson/:lessonId", verifyJWT, verifyAdmin, async (req, res) => {
    const lessonId = req.params.lessonId;
    
    try {
        const reports = await reportsCollection.find({ 
            lessonId: lessonId 
        }).sort({ reportedAt: 1 }).toArray();

        res.send(reports);
    } catch (error) {
        console.error("Error fetching report details:", error);
        res.status(500).send({ message: "Failed to fetch report details." });
    }
});
    // ---------------------------
    //      Delete the lesson
    //--------------------------------
    


app.delete("/admin/lessons/:lessonId", verifyJWT, verifyAdmin, async (req, res) => {
    const lessonId = req.params.lessonId;
    const objectLessonId = new ObjectId(lessonId); 

    try {
        const lessonDeleteResult = await lessonsCollection.deleteOne({ _id: objectLessonId });


        const reportsDeleteResult = await reportsCollection.deleteMany({ lessonId: lessonId }); 

        if (lessonDeleteResult.deletedCount === 0) {
           
            return res.send({ message: "Lesson not found." });
        }
        
        res.send({ 
            message: "Lesson and associated reports deleted successfully.",
            lessonDeleted: lessonDeleteResult.deletedCount,
            reportsDeleted: reportsDeleteResult.deletedCount 
        });

    } catch (error) {
        console.error("Error deleting lesson and reports:", error);
        res.status(500).send({ message: "Failed to delete lesson and reports." });
    }
});

    
    //-------------------------------
    //          ignore 
    //----------------------------------
   
app.delete("/admin/reports/lesson/:lessonId", verifyJWT, verifyAdmin, async (req, res) => {
   
    const lessonId = req.params.lessonId;
    
  
    if (!lessonId) {
        return res.status(400).send({ message: "Lesson ID is required." });
    }
    
    try {
        
        const reportsDeleteResult = await reportsCollection.deleteMany({ lessonId: lessonId }); 

       
        await lessonsCollection.updateOne(
            { _id: new ObjectId(lessonId) },  
            { $set: { reportCount: 0 } }
        );


        if (reportsDeleteResult.deletedCount === 0) {
            
            return res.status(200).send({ 
                message: "No active reports were found for this lesson, or reports already cleared.",
                reportsDeleted: 0
            });
        }
        
       
        res.send({ 
            message: "All associated reports successfully ignored. Lesson cleared from flagged list.",
            reportsDeleted: reportsDeleteResult.deletedCount
        });

    } catch (error) {
        console.error(`Error ignoring reports for Lesson ${lessonId}:`, error);
        res.status(500).send({ message: "Failed to ignore reports due to a server error." });
    }
});
    
  


    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from Server..')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
