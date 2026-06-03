const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

exports.getGifts = async (req, res) => {
  try {
    const [gifts] = await db.execute('SELECT * FROM gifts');
    res.json({ gifts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.sendGift = async (req, res) => {
  try {
    const { gift_id, receiver_id, video_id } = req.body;
    const [gifts] = await db.execute('SELECT * FROM gifts WHERE id = ?', [gift_id]);
    if (!gifts.length) return res.status(404).json({ error: 'Gift not found' });
    const gift = gifts[0];
    const platform_cut = Math.floor(gift.price_ugx * 0.30);
    const creator_cut = gift.price_ugx - platform_cut;
    const id = uuidv4();
    await db.execute(
      'INSERT INTO gift_transactions (id, sender_id, receiver_id, gift_id, amount_ugx, platform_cut_ugx, creator_cut_ugx, video_id) VALUES (?,?,?,?,?,?,?,?)',
      [id, req.user.id, receiver_id, gift_id, gift.price_ugx, platform_cut, creator_cut, video_id]
    );
    await db.execute(
      'UPDATE wallets SET balance_ugx = balance_ugx + ?, total_earned_ugx = total_earned_ugx + ? WHERE user_id = ?',
      [creator_cut, creator_cut, receiver_id]
    );
    res.json({ message: 'Gift sent', gift: gift.name, amount: gift.price_ugx });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getWallet = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    if (!rows.length) {
      await db.execute('INSERT INTO wallets (id, user_id) VALUES (?,?)', [uuidv4(), req.user.id]);
      return res.json({ balance_ugx: 0, total_earned_ugx: 0 });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
