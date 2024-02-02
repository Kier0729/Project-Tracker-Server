import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const port = 4000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static("public"));

//Needed to send data
////////////////////////////////////////////////////////////
const corsOptions = {
    origin: "*",
    credentials: true,
    optionSuccessStatus: 200
}
app.use(cors(corsOptions));
////////////////////////////////////////////////////////////

let data =[
    {date: "01/01/2024", merchant: "Shopee", amount: "1.00"},
    {date: "02/02/2024", merchant: "Lazada", amount: "2.00"},
    {date: "12/31/2023", merchant: "SM Dept", amount: "3.00"}
];

app.get("/", (req,res)=>{
    res.send(data);
});

app.post("/", (req,res)=>{
    const {date, merchant, amount} = req.body;
    data = [...data, {date:date, merchant:merchant, amount:amount}];
    res.send(data);
});

app.patch("/update", (req,res)=>{
    const {id,date,merchant,amount} = req.body;
    data.splice(id,1,{date: date, merchant: merchant, amount: amount});
    res.send(data);
});

app.delete("/delete", (req,res)=>{
    const id = req.body.id;//Check App.js under handelDelete
    //req.body should be declared in axios.delete under an object named(always as "data") Check App.js under handelDelete
    data = data.filter(function(item, index){return(index != id)});
    res.send(data);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });