import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/Payment.css';

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  useEffect(() => {
    if (sessionId) {
      axios.post(`${import.meta.env.VITE_API_URL}/api/payments/confirm-payment`, { sessionId })
        .then(res => console.log('✅ Payment confirmed:', res.data))
        .catch(err => console.error('❌ Payment confirmation failed:', err));
    }
  }, [sessionId]);

  return (
    <div className="payment-container">
      <div className="payment-card success">
        <h1>✅ Payment Successful!</h1>
        <p>Your purchase has been confirmed and added to your profile.</p>
        <Link to="/profile">Go to My Purchases</Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
