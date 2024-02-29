import express from "express";
import bodyParser from "body-parser";
// import cors from "cors";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";
import GoogleStrategy from "passport-google-oauth2";
import FacebookStrategy from "passport-facebook";

const app = express();
const port = 4000;
const saltRounds = 10;
let id;
env.config();

//Needed to send data // use to link server(node/express) the frontend(react) different
////////////////////////////////////////////////////////////
// const corsOptions = {
//   // origin: "*",
//   // credentials: true,
//   // optionSuccessStatus: 200
//   origin: "http://localhost:3000",
//   // methods: "GET, POST, PATCH, PUT, DELETE",
//   credentials: true,
// }

// app.use(cors(corsOptions));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "JDG",
    resave: false,
    saveUninitialized: true,
    cookie: { //HOW LONG COOKIE WILL BE SAVE (1000 miliseconds = 1 second * 60 = 1 min * 60 = 1hr )
      maxAge: 1000 * 60 * 60,
    },  
  })
);

//SHOULD BE AFTER the session is initialize/created
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "tracker",
    password: "qwerty1234",
    port: 5432,
  });

db.connect();

//temporary array to save the value of database
////////////////////////////////////////////////////////////
let data =[
    // {date: "01/01/2024", merchant: "Shopee", amount: "1.00"},
    // {date: "02/02/2024", merchant: "Lazada", amount: "2.00"},
    // {date: "12/31/2023", merchant: "SM Dept", amount: "3.00"}
];
let adminData =[];

//for acquiring the data in the database
////////////////////////////////////////////////////////////
async function fetchData(receieved){
  console.log("fetchdata");
  console.log(id);
  try{
      //TO_CHAR(entry_date, 'MM/DD/YYYY') AS date to get the date and set date format in postgresql
      let result, nextMonth, nextYear;
      
      if(receieved.month<12){
        nextMonth = parseInt(receieved.month)+1;
        nextYear = parseInt(receieved.year)
      } 
      else if (receieved.month == 12){
        nextMonth = 1;
        nextYear = parseInt(receieved.year)+1;
      } 
      if(receieved.month == 13){result = await db.query("SELECT id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount FROM user_entry WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) < $2 AND EXTRACT(YEAR FROM entry_date) = $3 ORDER BY entry_date ASC",[id, receieved.month, receieved.year]);} 
      else {result = await db.query(
        // "SELECT id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount FROM user_entry WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) = $2 ORDER BY entry_date ASC"
        `SELECT id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount FROM user_entry 
        WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) = $2 AND EXTRACT(DAY FROM entry_date) >= $4 AND EXTRACT(YEAR FROM entry_date) = $5
        OR EXTRACT(MONTH FROM entry_date) = $3 AND EXTRACT(DAY FROM entry_date) < $4 AND EXTRACT(YEAR FROM entry_date) = $6 ORDER BY entry_date ASC`
        ,[id, receieved.month, nextMonth, receieved.cycle, receieved.year, nextYear]);}
      let myData=[];
      result.rows.forEach((items) => { //transferring each row data to myData array
           myData.push(items);
      });
      return myData; //return/pass myData value if fetchData is called
    } catch (error) {
      console.log(error.message);
    }
}

async function fetchDataAdmin(receieved){
  //get id in receieved
    try{
      //TO_CHAR(entry_date, 'MM/DD/YYYY') AS date to get the date and set date format in postgresql
      let result, nextMonth, nextYear;
      
      if(receieved.month<12){
        nextMonth = parseInt(receieved.month)+1;
        nextYear = parseInt(receieved.year)
      } 
      else if (receieved.month == 12){
        nextMonth = 1;
        nextYear = parseInt(receieved.year)+1;
      } 
      if(receieved.month == 13){result = await db.query(`
      SELECT user_cred.fname, user_cred.lname, user_entry.id, entry_id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount 
      FROM user_entry
      JOIN user_cred ON user_cred.id = user_entry.entry_id
      WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) < $2 AND EXTRACT(YEAR FROM entry_date) = $3 
      ORDER BY entry_date ASC`,[receieved.id, receieved.month, receieved.year]);

    } 
      else {result = await db.query(
        // "SELECT id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount FROM user_entry WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) = $2 ORDER BY entry_date ASC"
        `SELECT user_cred.fname, user_cred.lname, user_entry.id, entry_id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount 
        FROM user_entry 
        JOIN user_cred ON user_cred.id = user_entry.entry_id 
        WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) = $2 AND EXTRACT(DAY FROM entry_date) >= $4 AND EXTRACT(YEAR FROM entry_date) = $5 
        OR EXTRACT(MONTH FROM entry_date) = $3 AND EXTRACT(DAY FROM entry_date) < $4 AND EXTRACT(YEAR FROM entry_date) = $6 
        ORDER BY entry_date ASC`
        ,[receieved.id, receieved.month, nextMonth, receieved.cycle, receieved.year, nextYear]);
        let myData=[];
        result.rows.forEach((items) => { //transferring each row data to myData array
           myData.push(items);
      });
      return myData; //return/pass myData value if fetchData is called
          }   
    } catch (error) {
      console.log(error.message);
    }
}

async function fetchAdmin(){
  try{
    const checkResult = await db.query("SELECT * FROM user_cred ORDER BY id ASC");
    let myData;
    if (checkResult.rows.length > 0) { 
      myData = checkResult.rows; 
      return myData;
    } else {
      return null;
    }
  }catch(error){
    console.log(error.message);
    return null;
  }
}

async function checkUser(received){
  try{
    const checkResult = await db.query("SELECT * FROM user_cred WHERE user_username = $1", [received.id]);
    let myData;
    if (checkResult.rows.length > 0) { 
      myData = checkResult.rows[0];  
      return myData;
    } else {
      myData = await db.query(
        "INSERT INTO user_cred (user_username, user_pass, fname, lname) VALUES($1, $2, $3, $4) RETURNING *"
        , [received.id, received.provider, received.given_name || received.name.givenName, received.family_name || received.name.familyName]);
      myData = myData.rows[0];
      return myData;
    }
  } catch (error) {
    return error;
  }
}

async function addData(rcvd){
    try{
        const result = await db.query("INSERT INTO user_entry (entry_date, entry_merchant, entry_amount, entry_id) VALUES ($1,$2,$3,$4)",
        [rcvd.date, rcvd.merchant, rcvd.amount, rcvd.entry_id]);
      } catch (error) {
        console.log(error.message);
      }
}

async function updateData(rcvd){
    try{
        const result = await db.query("UPDATE user_entry SET entry_date = $1, entry_merchant = $2, entry_amount = $3 WHERE id = $4",
        [rcvd.date, rcvd.merchant, rcvd.amount, rcvd.id]);
      } catch (error) {
        console.log(error.message);
      }
}

async function deleteData(rcvd){
    try{
        const result = await db.query("DELETE FROM user_entry WHERE id = $1",
        [rcvd.id]);
      } catch (error) {
        console.log(error.message);
      }
}

//Below remove the authentication out of the post /login (can be reuse when authenticating)
passport.use( "local",
  //passport automatically calls the username/password in the body of the the req(form/whoever calls authentication)
  new Strategy(async function verify(username, password, cb){
    try {
      const result = await db.query("SELECT * FROM user_cred WHERE user_email = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.user_pass;
        bcrypt.compare(password, storedHashedPassword, (err, result) => {
          if (err) {
            //cb returns (error) if an error occurs in bcrypt.compare
            return cb("Error comparing passwords:", err);
          } else {
            if (result) { //PASS authentication
              //cb returns (noerror(null), user(const above))
              // console.log("Authentication Passed!");
              return cb(null, user);
            } else { //FAIL authentication
              //cb returns (noerror(null), false(user is not authenticated))
              // console.log("Authentication Failed!");
              return cb(err, false);
            }
          }
        });
      } else {
        return cb(null, false);
      }
    } catch (err) {
      return cb(null, false);
    }
  })
);

passport.use(
  "google", 
  new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:4000/auth/google/home",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
},  
  async function (request, accessToken, refreshToken, profile, cb){
      return cb(null, await checkUser(profile));
  }
  ));

  passport.use(
    "facebook",
    new FacebookStrategy({
    clientID: "7157850597665688",
    clientSecret: "b6bdc5a453653301d5d9e220a9f60d97",
    callbackURL: "http://localhost:4000/auth/facebook/Home",
    profileFields: ["id","email","name"],
    passReqToCallback: true
},  
    async function (request, accessToken, refreshToken, profile, cb){
        return cb(null, await checkUser(profile));
    }
    ));


passport.serializeUser((user, cb) => {
  cb(null, user);
  console.log("serializeUser");
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
  console.log("deserializeUser");
});

app.post("/fetch", async (req,res)=>{
    console.log("/fetch");
    const {month, cycle, year} = req.body;
    const receieved = {month:month, cycle:cycle, year:year};
    if(req.user){
        data = await fetchData(receieved);//setting the value of data using fetchData (check fetchData)
        res.send(data);
    } else {
      res.send(null);
    }
});

app.post("/fetchDataAdmin", async (req,res)=>{
    let myData;
    let receieved = {id:req.body.id, cycle:7, month:2, year: 2024};
    myData = await fetchDataAdmin(receieved);
  res.send(myData);
});

app.post("/updateDataAdmin", (req,res)=>{
  console.log("updateDataAdmin");
  console.log(req.body);
  res.send(adminData);
});

app.get("/fetchAdmin", async (req,res)=>{
  if(req.user){
      data = await fetchAdmin();//setting the value of data using fetchData (check fetchData)
      console.log("fetchAdmin");
      res.send(data);
  } else {
    res.send(null);
  }
});

app.get("/year", async (req,res)=>{
  let year = await db.query(
    `SELECT DISTINCT TO_CHAR(entry_date, 'YYYY') AS date
    FROM user_entry 
    WHERE entry_id = $1  
    ORDER BY date DESC`, [id]
    );
    let myData=[];
      year.rows.forEach((items) => { //transferring each row data to myData array
           myData.push(items.date);
      });
    res.send(myData);
});

app.get("/IsLogin", (req,res,)=>{
  console.log("IsLogin");
  if(req.isAuthenticated()){
    id = req.user.id;
    res.send(req.user);
  } else {
    res.send({...req.user, password:"Mismatch"});
  }
});

app.get("/IsLoginGoogle", (req,res,)=>{
  console.log("IsLoginGoogle");
  if(req.isAuthenticated()){
    id = req.user.id;
    res.redirect("http://localhost:3000");
  } else {
    console.log(req.user);
  }
});

app.get("/auth/google", 
passport.authenticate("google", {
  scope: ["profile", "email"],
})
// (req, res)=>{
//   console.log("google");
// }
);

app.get(
  "/auth/google/home",
  passport.authenticate("google", {
    successRedirect: "/isLoginGoogle",
    failureRedirect: "/isLoginGoogle",
  })
);

app.get("/auth/facebook", 
passport.authenticate("facebook")
);

app.get(
  "/auth/facebook/home",
  passport.authenticate("facebook", {
    successRedirect: "/isLoginGoogle",
    failureRedirect: "/isLoginGoogle",
  })
);

app.get("/IsFailed", (req,res)=>{
  console.log("IsFailed");
  console.log(req.isAuthenticated());
  res.send({...req.user, notFound:"No Match"});
});

app.get("/Logout", (req, res)=>{
  setTimeout(()=>{
    req.logout(()=>{
    console.log("User Logout!");
    req.session.destroy();
    res.clearCookie("cookiename").send(null);//sending back something(null) so .then will execute in frontend
  });
}, 300);
});

//ROUTE FOR ADDING DATA to the DATABASE
////////////////////////////////////////////////////////
 app.post("/", async (req,res)=>{
    // const {date, merchant, amount} = req.body;
    // data = [...data, {date:date, merchant:merchant, amount:amount}];
    // res.send(data);

    const received = req.body;
    addData(received);
      data = await fetchData({month:received.month, cycle:received.cycle, year:received.year});//setting the value of data using fetchData (check fetchData)   
      res.send(data);
    });

app.post("/Login", async (req, res) => {
  setTimeout(async() => {
    const result = await db.query("SELECT * FROM user_cred WHERE user_email = $1", [
      req.body.username,
    ]);
    if (result.rows.length > 0) {
      passport.authenticate("local", {
      successRedirect: "/IsLogin",
      failureRedirect: "/IsLogin"
     })(req, res);
    } else {
      res.redirect("/IsFailed");
    }
  }, 300);
  
});

// app.post("/Login", 
// (req, res)=>{ passport.authenticate("local", function(err, user){
//   if(user){
//       req.login(user, ()=>{ //needed for calling serialize and deserialize
//         res.redirect("/IsLogin");
//       });
//       } else {
//           console.log("Access denied!");
//           res.send(null);
//       }    
// })(req, res);//passing req and res to passport
// }
// );

app.post("/Register", async (req,res)=>{
  setTimeout(async() => {
    const {username, password, fname, lname} = req.body;
  try {
    const checkResult = await db.query("SELECT * FROM user_cred WHERE user_email = $1", [
      username,
    ]);

    if (checkResult.rows.length > 0) {
      res.send(null);
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          //RETURNING * return the values after inserting into the database
          const result = await db.query(
            "INSERT INTO user_cred (user_email, user_pass, fname, lname) VALUES ($1, $2, $3, $4) RETURNING *",
            [username, hash, fname, lname]
          );
          const user = result.rows[0];
//calling req.login after saving data in the database
          req.login(user, (err) => { //needed to authenticate and calling serialize and deserialize
            if(err){
              console.log("Authentication fail!");
              console.log(err);
            }
            else{
              console.log("Authentication success!");
              res.redirect("/IsLogin");
            }  
          })
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
console.log("Register initiated");
  }, 300);
});

app.patch("/update", async (req,res)=>{
    // const {id,date,merchant,amount} = req.body;
    // data.splice(id,1,{date: date, merchant: merchant, amount: amount});
    // res.send(data);

    const received = req.body;
    updateData(received);
    data = await fetchData({month:received.month, cycle:received.cycle, year:received.year});//setting the value of data using fetchData (check fetchData)
    res.send(data);
});

app.delete("/delete", async (req,res)=>{
    // const id = req.body.id;//Check App.js under handelDelete
    // //req.body should be declared in axios.delete under an object named(always as "data") Check App.js under handelDelete
    // data = data.filter(function(item, index){return(index != id)});
    // res.send(data);
    const received = req.body;
    deleteData(received);
    data = await fetchData({month:received.month, cycle:received.cycle, year:received.year});//setting the value of data using fetchData (check fetchData)
    res.send(data);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });