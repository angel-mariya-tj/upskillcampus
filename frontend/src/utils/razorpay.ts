import api from '../services/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PayWithRazorpayParams {
  bookingId: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export const payWithRazorpay = async ({ bookingId, onSuccess, onError }: PayWithRazorpayParams) => {
  try {
    // 1. Create order on backend
    const response = await api.post('/payments/create-order', { bookingId });
    const { orderId, amount, currency, keyId, serviceName } = response.data.data;

    // Check if window.Razorpay script exists
    if (!window.Razorpay) {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
      if (onError) onError(new Error('Razorpay SDK unavailable'));
      return;
    }

    // 2. Configure Razorpay Options
    const options = {
      key: keyId,
      amount: amount,
      currency: currency || 'INR',
      name: 'Servanta Marketplace',
      description: `Payment for ${serviceName}`,
      order_id: orderId,
      handler: async (paymentResponse: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          // 3. Send payment signature for backend verification
          const verifyRes = await api.post('/payments/verify', {
            bookingId,
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
            razorpaySignature: paymentResponse.razorpay_signature,
            paymentMethod: (paymentResponse as any).method || 'card',
          });

          if (onSuccess) onSuccess(verifyRes.data.data);
        } catch (err: any) {
          alert('Payment verification failed on server: ' + (err.response?.data?.message || err.message));
          if (onError) onError(err);
        }
      },
      modal: {
        ondismiss: () => {
          console.log('Payment modal dismissed by user');
        },
      },
      prefill: {
        name: 'Customer',
        email: 'customer@servanta.com',
      },
      theme: {
        color: '#4F46E5', // Primary brand color
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response: any) => {
      alert(`Payment failed: ${response.error.description}`);
      if (onError) onError(response.error);
    });

    rzp.open();
  } catch (err: any) {
    alert('Failed to initiate payment: ' + (err.response?.data?.message || err.message));
    if (onError) onError(err);
  }
};
