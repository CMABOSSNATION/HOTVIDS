const db = require("../../config/database");
const {v4:uuidv4} = require("uuid");
const axios = require("axios");

exports.getUploadUrl = async (req,res) => {
  try {
    const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;
    const CF_TOKEN = process.env.CF_API_TOKEN;
    if(!CF_ACCOUNT||!CF_TOKEN) return res.status(500).json({error:"Cloudflare not configured"});
    const resp = await axios.post(
      "https://api.cloudflare.com/client/v4/accounts/"+CF_ACCOUNT+"/stream/direct_upload",
      {maxDurationSeconds:300},
      {headers:{Authorization:"Bearer "+CF_TOKEN,"Content-Type":"application/json"}}
    );
    res.json({uploadURL:resp.data.result.uploadURL,uid:resp.data.result.uid});
  } catch(e){res.status(500).json({error:e.message});}
};

exports.saveVideo = async (req,res) => {
  try {
    const {title,description,cloudflare_video_id,hashtags} = req.body;
    if(!title) return res.status(400).json({error:"Title is required"});
    if(!cloudflare_video_id) return res.status(400).json({error:"Video ID is required"});
    const id = uuidv4();
    await db.query(
      "INSERT INTO videos (id,creator_id,title,description,cloudflare_video_id,hashtags,status) VALUES (?,?,?,?,?,?,?)",
      [id, req.user.id, title, description||"", cloudflare_video_id, hashtags||"", "live"]
    );
    res.status(201).json({id,message:"Video saved successfully"});
  } catch(e){res.status(500).json({error:e.message});}
};
