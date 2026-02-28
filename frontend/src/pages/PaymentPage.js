import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { initiatePayment, verifyPayment } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const PaymentPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;
  const [paymentStatus, setPaymentStatus] = useState('initiated'); // initiated, processing, success, failed
  const [paymentId, setPaymentId] = useState(null);

  useEffect(() => {
    if (!order) {
      navigate('/dashboard');
      return;
    }
    initPayment();
  }, []);

  const initPayment = async () => {
    try {
      const result = await initiatePayment(orderId, order.totalAmount);
      setPaymentId(result.paymentId);
    } catch (error) {
      toast.error('Failed to initiate payment');
      setPaymentStatus('failed');
    }
  };

  const handlePayment = async (success) => {
    setPaymentStatus('processing');

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await verifyPayment(orderId, paymentId, success);
      setPaymentStatus(success ? 'success' : 'failed');

      if (success) {
        toast.success('Payment successful!');
        setTimeout(() => navigate('/orders'), 2000);
      } else {
        toast.error('Payment failed!');
      }
    } catch (error) {
      toast.error('Payment verification failed');
      setPaymentStatus('failed');
    }
  };

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" data-testid="payment-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {paymentStatus === 'processing' && <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />}
            {paymentStatus === 'success' && <CheckCircle2 className="w-16 h-16 text-green-600" />}
            {paymentStatus === 'failed' && <XCircle className="w-16 h-16 text-red-600" />}
            {paymentStatus === 'initiated' && <CreditCard className="w-16 h-16 text-blue-600" />}
          </div>
          <CardTitle>
            {paymentStatus === 'initiated' && 'Complete Payment'}
            {paymentStatus === 'processing' && 'Processing Payment...'}
            {paymentStatus === 'success' && 'Payment Successful!'}
            {paymentStatus === 'failed' && 'Payment Failed'}
          </CardTitle>
          <CardDescription>
            {paymentStatus === 'initiated' && 'Choose payment option to complete your order'}
            {paymentStatus === 'processing' && 'Please wait while we process your payment'}
            {paymentStatus === 'success' && 'Your order has been placed successfully'}
            {paymentStatus === 'failed' && 'Your payment could not be processed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2" data-testid="payment-details">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order ID</span>
              <span className="font-semibold" data-testid="order-id">{order.orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cylinder Type</span>
              <span className="font-semibold">{order.cylinderType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Quantity</span>
              <span className="font-semibold">{order.quantity}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total Amount</span>
              <span data-testid="payment-amount">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Actions */}
          {paymentStatus === 'initiated' && (
            <div className="space-y-2">
              <Button
                className="w-full"
                data-testid="pay-now-button"
                onClick={() => handlePayment(true)}
              >
                Pay ₹{order.totalAmount.toFixed(2)}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                data-testid="simulate-failure-button"
                onClick={() => handlePayment(false)}
              >
                Simulate Payment Failure
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
            </div>
          )}

          {paymentStatus === 'success' && (
            <Button
              className="w-full"
              data-testid="view-order-button"
              onClick={() => navigate('/orders')}
            >
              View Orders
            </Button>
          )}

          {paymentStatus === 'failed' && (
            <div className="space-y-2">
              <Button
                className="w-full"
                data-testid="retry-payment-button"
                onClick={() => setPaymentStatus('initiated')}
              >
                Retry Payment
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPage;
