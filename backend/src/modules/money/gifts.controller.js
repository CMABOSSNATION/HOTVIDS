const db = require("../../config/database");
const {v4:uuidv4} = require("uuid");

const GIFTS = {
  rose:{name:"Rose",emoji:"🌹",price:500},
  trophy:{name:"Trophy",emoji:"🏆",price:5000},
  rocket:{name:"Rocket",emoji:"🚀",price:25000},
  crown:{name:"Crown",emoji:"👑",price:100000},
  diamond:{name:"Diamond",emoji:"💎",price:500000}
};

exports.listGifts = (req,res) => res.json(GIFTS);

exports.sendGift = async (req,res) => {
  try {
    const {recipient_id,gift_type,video_id} = req.body;
    const gift = GIFTS[gift_type];
    if(!gift) return res.status(400).json({error:"Invalid gift type"});
    const [wallet] = await db.query("SELECT balance FROM wallets WHERE user_id=?",[req.user.id]);
    const balance = wallet.length ? wallet[0].balance : 0;
    if(balance < gift.price) return res.status(400).json({error:"Insufficient balance. Top up your wallet."});
    await db.query("UPDATE wallets SET balance=balance-? WHERE user_id=?",[gift.price,req.user.id]);
    const creator_earn = Math.floor(gift.price*0.7);
    await db.query("INSERT INTO wallets (id,user_id,balance) VALUES (?,?,?) ON DUPLICATE KEY UPDATE balance=balance+?",[uuidv4(),recipient_id,creator_earn,creator_earn]);
    await db.query("INSERT INTO gift_transactions (id,sender_id,recipient_id,gift_type,amount,video_id) VALUES (?,?,?,?,?,?)",[uuidv4(),req.user.id,recipient_id,gift_type,gift.price,video_id||null]);
    res.json({message:"Gift sent!",gift:gift.name,emoji:gift.emoji});
  } catch(e){res.status(500).json({error:e.message});}
};

exports.getWallet = async (req,res) => {
  try {
    const [rows] = await db.query("SELECT balance FROM wallets WHERE user_id=?",[req.user.id]);
    res.json({balance:rows.length?rows[0].balance:0});
  } catch(e){res.status(500).json({error:e.message});}
};
