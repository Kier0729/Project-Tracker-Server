import express from "express";
import bodyParser from "body-parser";
import cors from "cors"; // use to link server(node/express) the frontend(react)
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

const app = express();
const port = 4000;
const saltRounds = 10;
const CLIENT_URI = "http://localhost:3000";
let id;

//Needed to send data // use to link server(node/express) the frontend(react)
////////////////////////////////////////////////////////////
const corsOptions = {
  // origin: "*",
  // credentials: true,
  // optionSuccessStatus: 200
  origin: "http://localhost:3000",
  credentials: true,
}

app.use(cors(corsOptions));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "JDG",
    resave: false,
    saveUninitialized: true,
    cookie: { //HOW LONG COOKIE WILL BE SAVE (1000 miliseconds = 1 second * 60 = 1 min * 60 = 1hr )
      maxAge: 1000 * 60 * 60,
    }
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

//for acquiring the data in the database
////////////////////////////////////////////////////////////
async function fetchData(month){
  try{
      //TO_CHAR(entry_date, 'MM/DD/YYYY') AS date to get the date and set date format in postgresql
      const result = await db.query("SELECT id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount FROM user_entry WHERE entry_id = $1 AND EXTRACT(MONTH FROM entry_date) = $2 ORDER BY id ASC",[id, month]);
      let myData=[];
      result.rows.forEach((items) => { //transferring each row data to myData array
           myData.push(items);
      });
      return myData; //return/pass myData value if fetchData is called
    } catch (error) {
      console.log(error.message);
    }
}

//for acquiring the data in the database for all months
////////////////////////////////////////////////////////////
// async function fetchData(){
//   try{
//       //TO_CHAR(entry_date, 'MM/DD/YYYY') AS date to get the date and set date format in postgresql
//       const result = await db.query("SELECT id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount FROM user_entry WHERE entry_id = $1 ORDER BY id ASC",[id]);
//       let myData=[];
//       result.rows.forEach((items) => { //transferring each row data to myData array
//            myData.push(items);
//       });
//       return myData; //return/pass myData value if fetchData is called
//     } catch (error) {
//       console.log(error.message);
//     }
// }

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

passport.serializeUser((user, cb) => {
  cb(null, user);
  console.log("serializeUser");
  // console.log(user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
  console.log("deserializeUser");
});

app.post("/fetch", async (req,res)=>{
    console.log("/fetch");
    const month = req.body.selectedMonth;
    console.log(month);
    console.log(id);
    if(req.user){
        data = await fetchData(month);//setting the value of data using fetchData (check fetchData)
        console.log("fetch");
        res.send(data);
    }  
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

app.get("/IsFailed", (req,res)=>{
  console.log("IsFailed");
  console.log(req.isAuthenticated());
  // console.log(req.user);
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
      data = await fetchData(received.selectedMonth);//setting the value of data using fetchData (check fetchData)   
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
    data = await fetchData(received.selectedMonth);//setting the value of data using fetchData (check fetchData)
    res.send(data);
});

app.delete("/delete", async (req,res)=>{
    // const id = req.body.id;//Check App.js under handelDelete
    // //req.body should be declared in axios.delete under an object named(always as "data") Check App.js under handelDelete
    // data = data.filter(function(item, index){return(index != id)});
    // res.send(data);
    const received = req.body;
    console.log(received);
    deleteData(received);
    data = await fetchData(received.selectedMonth);//setting the value of data using fetchData (check fetchData)
    res.send(data);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });