import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserOrders } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, CheckCircle2, Truck, Clock, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getUserOrders();
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'received': 'bg-blue-600',
      'dispatched': 'bg-yellow-600',
      'on-the-way': 'bg-orange-600',
      'delivered': 'bg-green-600'
    };
    return colors[status] || 'bg-gray-600';
  };

  const getStatusIcon = (status, isActive) => {
    if (!isActive) return <Circle className="w-4 h-4" />;
    
    const icons = {
      'received': <Clock className="w-4 h-4" />,
      'dispatched': <Package className="w-4 h-4" />,
      'on-the-way': <Truck className="w-4 h-4" />,
      'delivered': <CheckCircle2 className="w-4 h-4" />
    };
    return icons[status] || <Circle className="w-4 h-4" />;
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-600',
      'completed': 'bg-green-600',
      'failed': 'bg-red-600'
    };
    return colors[status] || 'bg-gray-600';
  };

  const orderStatuses = ['received', 'dispatched', 'on-the-way', 'delivered'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" data-testid="orders-page">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>
              Track your cylinder orders and delivery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8" data-testid="no-orders">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">No orders yet</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/book-cylinder')}
                  data-testid="book-first-order-button"
                >
                  Book Your First Order
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order, index) => (
                  <div key={order.orderId} data-testid="order-item">
                    {index > 0 && <Separator className="my-6" />}
                    <div className="space-y-4">
                      {/* Order Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-600">Order ID</p>
                          <p className="font-semibold" data-testid="order-id">{order.orderId}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(order.createdAt), 'PPp')}
                          </p>
                        </div>
                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                          {order.paymentStatus.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Order Details */}
                      <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Cylinder Type</p>
                          <p className="font-semibold">{order.cylinderType}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Quantity</p>
                          <p className="font-semibold">{order.quantity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Amount</p>
                          <p className="font-semibold" data-testid="order-amount">₹{order.totalAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Payment Method</p>
                          <p className="font-semibold capitalize">{order.paymentMethod}</p>
                        </div>
                      </div>

                      {/* Order Status Timeline */}
                      <div>
                        <p className="text-sm font-semibold mb-3">Delivery Status</p>
                        <div className="space-y-3" data-testid="order-status-timeline">
                          {orderStatuses.map((status, idx) => {
                            const currentStatusIndex = orderStatuses.indexOf(order.orderStatus);
                            const isActive = idx <= currentStatusIndex;
                            
                            return (
                              <div key={status} className="flex items-center">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                  isActive ? getStatusColor(status) : 'bg-gray-300'
                                } text-white`}>
                                  {getStatusIcon(status, isActive)}
                                </div>
                                <div className="ml-3">
                                  <p className={`text-sm font-medium capitalize ${
                                    isActive ? 'text-gray-900' : 'text-gray-500'
                                  }`}>
                                    {status.replace('-', ' ')}
                                  </p>
                                </div>
                                {status === order.orderStatus && (
                                  <Badge className="ml-auto" variant="outline">Current</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="text-sm">
                        <p className="text-gray-600">Delivery Address</p>
                        <p className="mt-1">{order.deliveryAddress}</p>
                        <p className="mt-1 text-gray-600">Contact: {order.mobile}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrdersPage;
