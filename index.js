import express from "express";
import bodyParser from "body-parser";
import cors from "cors"; // use to link server(node/express) the frontend(react)
import pg from "pg";

const app = express();
const port = 4000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "tracker",
    password: "qwerty1234",
    port: 5432,
  });

db.connect();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static("public"));

//Needed to send data // use to link server(node/express) the frontend(react)
////////////////////////////////////////////////////////////
const corsOptions = {
    origin: "*",
    credentials: true,
    optionSuccessStatus: 200
}
app.use(cors(corsOptions));

//temporary array to save the value of database
////////////////////////////////////////////////////////////
let data =[
    // {date: "01/01/2024", merchant: "Shopee", amount: "1.00"},
    // {date: "02/02/2024", merchant: "Lazada", amount: "2.00"},
    // {date: "12/31/2023", merchant: "SM Dept", amount: "3.00"}
];

//for acquiring the data in the database
////////////////////////////////////////////////////////////
async function fetchData(){
    try{
        //TO_CHAR(entry_date, 'MM/DD/YYYY') AS date to get the date and set date format in postgresql
        const result = await db.query("SELECT id, TO_CHAR(entry_date, 'MM/DD/YYYY') AS date, entry_merchant AS merchant, entry_amount AS amount FROM user_entry ORDER BY id ASC");
        let myData=[];
        result.rows.forEach((items) => { //transferring each row data to myData array
            myData.push(items);
        });
        return myData; //return/pass myData value if fetchData is called
      } catch (error) {
        console.log(error.message);
      }
}

async function addData(rcvd){
    try{
        const result = await db.query("INSERT INTO user_entry (entry_date, entry_merchant, entry_amount) VALUES ($1,$2,$3)",
        [rcvd.date, rcvd.merchant, rcvd.amount]);
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

app.get("/", async (req,res)=>{
    data = await fetchData();//setting the value of data using fetchData (check fetchData)
    res.send(data);
});

//ROUTE FOR ADDING DATA to the DATABASE
////////////////////////////////////////////////////////
 app.post("/", async (req,res)=>{
    // const {date, merchant, amount} = req.body;
    // data = [...data, {date:date, merchant:merchant, amount:amount}];
    // res.send(data);

    const received = req.body;
    addData(received);
    data = await fetchData();//setting the value of data using fetchData (check fetchData)
    res.send(data);
});

app.patch("/update", async (req,res)=>{
    // const {id,date,merchant,amount} = req.body;
    // data.splice(id,1,{date: date, merchant: merchant, amount: amount});
    // res.send(data);

    const received = req.body;
    updateData(received);
    data = await fetchData();//setting the value of data using fetchData (check fetchData)
    res.send(data);
});

app.delete("/delete", async (req,res)=>{
    // const id = req.body.id;//Check App.js under handelDelete
    // //req.body should be declared in axios.delete under an object named(always as "data") Check App.js under handelDelete
    // data = data.filter(function(item, index){return(index != id)});
    // res.send(data);
    const received = req.body;
    deleteData(received);
    data = await fetchData();//setting the value of data using fetchData (check fetchData)
    res.send(data);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });