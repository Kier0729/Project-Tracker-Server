import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
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

env.config();

//commented this because i decided to use proxy
//Needed to send data // use to link server(node/express) the frontend(react) different
////////////////////////////////////////////////////////////
const corsOptions = {
  // origin: "*",
  // credentials: true,
  // optionSuccessStatus: 200
  // origin: "http://localhost:3000",
  origin: "https://project-tracker-8zss.onrender.com",
  // methods: "GET, POST, PATCH, PUT, DELETE",
  credentials: true,
}

// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "https://project-tracker-8zss.onrender.com"); // update to match the domain you will make the request from
//   // res.header("Access-Control-Allow-Origin", "http://localhost:3000");
//   res.header(
//       "Access-Control-Allow-Headers",
//       "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   res.header("Access-Control-Allow-Credentials", "true");
//   next();
// });

app.use(cors(corsOptions));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("trust proxy", 1);
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { //HOW LONG COOKIE WILL BE SAVE (1000 miliseconds = 1 second * 60 = 1 min * 60 = 1hr )
      maxAge: 1000 * 60 * 60,
      sameSite: "none",
      secure: true,
    },  
  })
);

//SHOULD BE AFTER the session is initialize/created
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    connectionString: process.env.DB_CONNECTION_STRING,// needed for remote db connection
  });

db.connect();

let id;
//temporary array to save the value of database
////////////////////////////////////////////////////////////
let data =[
    // {date: "01/01/2024", merchant: "Shopee", amount: "1.00"},
    // {date: "02/02/2024", merchant: "Lazada", amount: "2.00"},
    // {date: "12/31/2023", merchant: "SM Dept", amount: "3.00"}
];
let adminData =[];
let dataOption =[];

let year = [];

  async function fetchYear(){
    let myData=[];
    console.log("fetchYear");
      return Promise.all(dataOption.id.map(async items =>{
      const result = await db.query(
        `SELECT DISTINCT TO_CHAR(entry_date, 'YYYY') AS date
        FROM user_entry 
        WHERE entry_id = $1  
        ORDER BY date DESC`, [items]
        );
          result.rows.forEach(items =>{
          year.push(items.date);
        })
        return year;
    })
    )
  }

//to check if the selected user has data saved in the database
async function hasData(receieved){
  let myData=[];
  try{
    return Promise.all(receieved.id.map( async items =>{
      const result = await db.query("SELECT id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount FROM user_entry WHERE entry_id = $1 ORDER BY entry_date ASC",[items]);
      result.rows.forEach((item) => { //transferring each row data to myData array
        myData.push(item);    
     });
      return myData; 
    }));
  } catch(error){
    console.log(error.message);
    return [""];
  }
}

//for acquiring the data in the database
////////////////////////////////////////////////////////////
async function fetchData(receieved){
  console.log("fetchdata");
  console.log(id);
  console.log(receieved);
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
        OR entry_id = $1 AND EXTRACT(MONTH FROM entry_date) = $3 AND EXTRACT(DAY FROM entry_date) < $4 AND EXTRACT(YEAR FROM entry_date) = $6 ORDER BY entry_date ASC`
        ,[id, receieved.month, nextMonth, receieved.cycle, receieved.year, nextYear]);}
      let myData=[];
      result.rows.forEach((items) => { //transferring each row data to myData array
           myData.push(items);
      });
      // console.log(result.rows);
      return myData; //return/pass myData value if fetchData is called
    } catch (error) {
      console.log(error.message);
    }
}

async function updateDataAdmin(receieved){
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

//need to put .map inside a return Promise.all to return a value for async/await
let myData=[];      
return Promise.all(receieved.id.map( async items =>{
          
          if(receieved.month == 13){
        result = await db.query(`
        SELECT user_cred.fname, user_cred.lname, user_entry.id, entry_id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount 
        FROM user_entry
        JOIN user_cred ON user_cred.id = user_entry.entry_id
        WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) < $2 AND EXTRACT(YEAR FROM entry_date) = $3 
        ORDER BY entry_date ASC`,[items, receieved.month, receieved.year]);
        result.rows.forEach((items) => { //transferring each row data to myData array
          myData.push(items);
          adminData.push(items);
       });
       return myData;
      } 
        else {
          result = await db.query(
          // "SELECT id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount FROM user_entry WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) = $2 ORDER BY entry_date ASC"
          `SELECT user_cred.fname, user_cred.lname, user_entry.id, entry_id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount 
          FROM user_entry 
          JOIN user_cred ON user_cred.id = user_entry.entry_id 
          WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) = $2 AND EXTRACT(DAY FROM entry_date) >= $4 AND EXTRACT(YEAR FROM entry_date) = $5 
          OR entry_id = $1 AND EXTRACT(MONTH FROM entry_date) = $3 AND EXTRACT(DAY FROM entry_date) < $4 AND EXTRACT(YEAR FROM entry_date) = $6 
          ORDER BY entry_date ASC`
          ,[items, receieved.month, nextMonth, receieved.cycle, receieved.year, nextYear]);
          result.rows.forEach((items) => { //transferring each row data to myData array
             myData.push(items);
             adminData.push(items);
          });
        //if myData below will be set to return it will wait for the cycle of receieved.id.map above, before returning the value to promise.all 
        return myData; //return/pass myData value if fetchData is called
            }
        })  
      );
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
              console.log("Authentication Passed!");
              return cb(null, user);
            } else { //FAIL authentication
              //cb returns (noerror(null), false(user is not authenticated))
              console.log("Authentication Failed!");
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
  // callbackURL: "http://localhost:4000/auth/google/home",
  callbackURL: "https://project-tracker-server-h8ni.onrender.com/auth/google/home",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
},  
  async function (request, accessToken, refreshToken, profile, cb){
      return cb(null, await checkUser(profile));
  }
  ));

  passport.use(
    "facebook",
    new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    // callbackURL: "http://localhost:4000/auth/facebook/Home",
    callbackURL: "https://project-tracker-server-h8ni.onrender.com/auth/facebook/Home",
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
  // console.log(user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
  console.log("deserializeUser");
  // console.log(user);
});

app.post("/fetch", async (req,res)=>{
    console.log("/fetch");
    const {month, cycle, year} = req.body;
    const receieved = {month:month, cycle:cycle, year:year};
    if(dataOption.id){
      adminData = [];
      dataOption = {id:dataOption.id, month:month, cycle:cycle, year:year}
      let myData;
      myData = await updateDataAdmin(dataOption);
//either send myData/adminData who has same value  
    res.send(adminData);
    }
    else{
      if(req.user){
        data = await fetchData(receieved);//setting the value of data using fetchData (check fetchData)
        res.send(data);
    } else {
      res.send(null);
    }
    }
});

//fetch adminData by clicking view
app.post("/updateDataAdmin", async (req,res)=>{
    adminData = [];
    dataOption = [];
    year = [];
    let myData;
    let receieved = {id:req.body.id, cycle:req.body.cycle, month:req.body.selectedMonth, year: req.body.selectedYear};
    dataOption = receieved;
    console.log(receieved);
    myData = await updateDataAdmin(receieved);
//either send myData/adminData who has same value  
    res.send(adminData);
});

app.get("/fetchDataAdmin", async (req,res)=>{
  console.log("fetchDataAdmin");
  adminData = [];
  let myData = [];
  myData = await updateDataAdmin(dataOption);
  res.send(adminData);
});

app.get("/fetchAdmin", async (req,res)=>{
  if(req.user){
      data = await fetchAdmin();//setting the value of data using fetchData (check fetchData)
      console.log("fetchAdmin");
      res.send({listUser:data});
  } else {
    res.send(null);
  }
});

app.post("/toNavigate", async (req,res)=>{
if(req.user){
    let data = await hasData(req.body);
    console.log("toNavigate");
    res.send(data);
  } else {
    res.send(null);
  }
});

app.get("/year", async (req,res)=>{
  console.log("/year"); 
  if(!dataOption.id){
    let year;
    console.log("!option");
    console.log(dataOption);
    year = await db.query(
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
  } 
  else {
    console.log(dataOption);
    console.log("option.id");
    let data = [];
    let myData = [];
    year = [];
    data = await fetchYear();
    
    year = year.sort();
    year = year.reverse();
    if(year.length > 1){
      let y = 1;
      for(let x=0; x < year.length; x++){
        year[x] != year[y] && myData.push(year[x]);
        if (y == year.length-1) { 
          myData.push(year[y]);
          x++;
        }
        else if (y < year.length-1){y++}     
    }
    } else {
      myData.push(year);
    }
    console.log(myData);
    res.send(myData);
  }
});

app.get("/IsLogin", (req,res,)=>{
  console.log("IsLogin");
  console.log(req.user);
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
    res.redirect("https://project-tracker-8zss.onrender.com/");
    // res.redirect("http://localhost:3000");
  } else {
    console.log(req.user);
  }
});

app.get("/auth/google", 
passport.authenticate("google", {
    scope: ["profile", "email"],
  })
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
  data =[];
  adminData =[];
  dataOption =[];
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
