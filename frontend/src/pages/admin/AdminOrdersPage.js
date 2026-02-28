import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrders, updateOrderStatus } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated successfully');
      
      // Update local state
      setOrders(orders.map(order => 
        order.orderId === orderId 
          ? { ...order, orderStatus: newStatus }
          : order
      ));
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingOrder(null);
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

  const getPaymentStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-600',
      'completed': 'bg-green-600',
      'failed': 'bg-red-600'
    };
    return colors[status] || 'bg-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4" data-testid="admin-orders-page">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-4"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Orders Management</CardTitle>
            <CardDescription>
              View all orders and update their delivery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8" data-testid="no-orders">
                <p className="text-gray-600">No orders found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order, index) => (
                  <div key={order.orderId} data-testid="admin-order-item">
                    {index > 0 && <Separator className="my-6" />}
                    <div className="space-y-4">
                      {/* Order Header */}
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <p className="text-sm text-gray-600">Order ID</p>
                          <p className="font-semibold" data-testid="order-id">{order.orderId}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(order.createdAt), 'PPp')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                            {order.paymentStatus.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusColor(order.orderStatus)}>
                            {order.orderStatus.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {/* Customer Details */}
                      <div className="bg-blue-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Customer Name</p>
                          <p className="font-semibold">{order.customerName}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Customer ID</p>
                          <p className="font-semibold">{order.agencyCustomerId}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Contact Number</p>
                          <p className="font-semibold">{order.mobile}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Delivery Address</p>
                          <p className="font-semibold">{order.deliveryAddress}</p>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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

                      {/* Status Update */}
                      <div className="flex items-center gap-4">
                        <Label className="text-sm font-semibold">Update Status:</Label>
                        <Select
                          value={order.orderStatus}
                          onValueChange={(value) => handleStatusUpdate(order.orderId, value)}
                          disabled={updatingOrder === order.orderId}
                        >
                          <SelectTrigger className="w-[200px]" data-testid="status-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="dispatched">Dispatched</SelectItem>
                            <SelectItem value="on-the-way">On the Way</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                        {updatingOrder === order.orderId && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
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

const Label = ({ children, className }) => (
  <span className={className}>{children}</span>
);

export default AdminOrdersPage;
