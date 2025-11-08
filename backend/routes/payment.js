// routes/payment.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const Transaction = require('../models/Transaction');
const Artwork = require('../models/Artwork');
require('dotenv').config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { artworkId, buyerId } = req.body;

    const artwork = await Artwork.findById(artworkId).populate('artist');
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    if (artwork.artist._id.toString() === buyerId) {
      return res.status(400).json({ error: 'You cannot buy your own artwork' });
    }

    if (!artwork.isForSale || artwork.isSold) {
      return res.status(400).json({ error: 'Artwork is not available for sale' });
    }

    const platformFeePercent = 10;
    const platformFee = (artwork.price * platformFeePercent) / 100;
    const artistEarnings = artwork.price - platformFee;

    // ✅ Ensure URL format
    const FRONTEND_URL =
      process.env.FRONTEND_URL?.startsWith('http')
        ? process.env.FRONTEND_URL
        : 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: artwork.currency?.toLowerCase() || 'inr',
            product_data: {
              name: artwork.title,
              images: [artwork.thumbnail || artwork.images?.[0]?.url || 'https://placehold.co/600x400'],
              description: artwork.description?.slice(0, 100) || 'Artwork purchase',
            },
            unit_amount: artwork.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/payment-cancel`,
      metadata: {
        artworkId: artwork._id.toString(),
        buyerId,
        sellerId: artwork.artist._id.toString(),
        platformFee,
        artistEarnings,
      },
    });

    await Transaction.create({
      buyer: buyerId,
      seller: artwork.artist._id,
      artwork: artwork._id,
      amount: artwork.price,
      platformFee,
      artistEarnings,
      paymentMethod: 'Stripe Checkout',
      status: 'pending',
      metadata: { sessionId: session.id },
    });

    console.log('✅ Stripe session created successfully:', session.id);
    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Stripe error:', error);
    res.status(500).json({ error: error.message || 'Payment session creation failed' });
  }
});
// ✅ Confirm Payment and Update Transaction
router.post('/confirm-payment', async (req, res) => {
  try {
    const { sessionId } = req.body;

    // 1️⃣ Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return res.status(404).json({ error: 'Stripe session not found' });

    // 2️⃣ Find the transaction
    const transaction = await Transaction.findOne({ 'metadata.sessionId': sessionId });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    // 3️⃣ Skip if already confirmed
    if (transaction.status === 'completed') {
      return res.json({ success: true, message: 'Payment already confirmed' });
    }

    // 4️⃣ Mark transaction completed
    transaction.status = 'completed';
    transaction.paymentId = session.payment_intent || session.id;
    await transaction.save();

    // 5️⃣ Update the sold artwork
    await Artwork.findByIdAndUpdate(transaction.artwork, {
      isSold: true,
      isForSale: false,
      soldTo: transaction.buyer,
      soldAt: new Date(),
      status: 'sold' // ✅ optional but nice for analytics
    });

    console.log(`✅ Payment confirmed for session ${sessionId}`);
    res.json({ success: true, message: 'Payment confirmed successfully' });
  } catch (error) {
    console.error('❌ Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

module.exports = router;
