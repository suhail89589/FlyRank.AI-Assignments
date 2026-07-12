import express from 'express';


const app = express()


const PORT = 8000


app.get('/',(req, res)=>{
    res.json({message:"Welcome to our FlyRank.AI Backend"})
})

app.get('/status',(req, res)=>{
    res.json({status:"online", timestamp: new Date() });
})

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});