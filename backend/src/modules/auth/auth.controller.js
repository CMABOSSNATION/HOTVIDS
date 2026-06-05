const db = require("../../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {v4:uuidv4} = require("uuid");

exports.register = async (req,res) => {
  try {
    const {username,email,password} = req.body;
    if(!username||!email||!password) return res.status(400).json({error:"All fields required"});
    const hash = await bcrypt.hash(password,10);
    const id = uuidv4();
    await db.query(
      "INSERT INTO users (id,username,email,password,password_hash) VALUES (?,?,?,?,?)",
      [id,username,email,hash,hash]
    );
    const token = jwt.sign({id,email},process.env.JWT_SECRET||"hotvid_uganda_secret_2024",{expiresIn:"7d"});
    res.status(201).json({token,user:{id,username,email}});
  } catch(e){
    if(e.code==="ER_DUP_ENTRY") return res.status(400).json({error:"Email or username already exists"});
    res.status(500).json({error:e.message});
  }
};

exports.login = async (req,res) => {
  try {
    const {email,password} = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE email=?",[email]);
    if(!rows.length) return res.status(401).json({error:"Invalid credentials"});
    const user = rows[0];
    const ok = await bcrypt.compare(password,user.password||user.password_hash);
    if(!ok) return res.status(401).json({error:"Invalid credentials"});
    const token = jwt.sign({id:user.id,email},process.env.JWT_SECRET||"hotvid_uganda_secret_2024",{expiresIn:"7d"});
    res.json({token,user:{id:user.id,username:user.username,email:user.email}});
  } catch(e){res.status(500).json({error:e.message});}
};
