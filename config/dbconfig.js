const mongoose = require("mongoose")
const MONGO_URI = "mongodb://127.0.0.1:27017/myapp"
const connectdb = (req, res) =>{
    mongoose.connect(MONGO_URI)
    console.log("mongodb connected")
}

module.exports = connectdb;