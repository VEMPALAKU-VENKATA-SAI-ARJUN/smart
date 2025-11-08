import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Payment.css';

const PaymentCancel = () => (
  <div className="payment-container">
    <div className="payment-card cancel">
      <h1>❌ Payment Canceled</h1>
      <p>You canceled the checkout process. You can try again anytime.</p>
      <Link to="/">Return to Gallery</Link>
    </div>
  </div>
);

export default PaymentCancel;
