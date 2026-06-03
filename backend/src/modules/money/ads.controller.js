const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

exports.getNextAd = async (req, res) => {
  try {
    const [ads] = await db.execute(
      `SELECT * FROM ads WHERE status = 'active' AND target_country = 'UG' AND starts_at <= NOW() AND ends_at >= NOW() AND spent_ugx < budget_ugx ORDER BY RAND() LIMIT 1`
    );
    if (!ads.length) return res.json({ ad: null });
    res.json({ ad: ads[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.recordImpression = async (req, res) => {
  try {
    const { ad_id, type } = req.body;
    await db.execute(
      'INSERT INTO ad_impressions (id, ad_id, user_id, type) VALUES (?,?,?,?)',
      [uuidv4(), ad_id, req.body.user_id || null, type || 'preroll']
    );
    await db.execute(
      'UPDATE ads SET impressions = impressions + 1 WHERE id = ?',
      [ad_id]
    );
    res.json({ recorded: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createAd = async (req, res) => {
  try {
    const { title, video_url, banner_url, budget_ugx, starts_at, ends_at } = req.body;
    const id = uuidv4();
    await db.execute(
      'INSERT INTO ads (id, advertiser_id, title, video_url, banner_url, budget_ugx, starts_at, ends_at) VALUES (?,?,?,?,?,?,?,?)',
      [id, req.user.id, title, video_url, banner_url, budget_ugx, starts_at, ends_at]
    );
    res.status(201).json({ id, message: 'Ad created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAdStats = async (req, res) => {
  try {
    const [ads] = await db.execute(
      'SELECT * FROM ads WHERE advertiser_id = ?',
      [req.user.id]
    );
    res.json({ ads });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
EOF~

 
