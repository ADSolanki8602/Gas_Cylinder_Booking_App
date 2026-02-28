import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCylinderPrices, createOrder, validateCoupon } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BookCylinderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prices, setPrices] = useState([]);
  const [formData, setFormData] = useState({
    cylinderType: '',
    quantity: 1,
    deliveryAddress: user?.address || '',
    mobile: user?.mobile || '',
    couponCode: '',
    paymentMethod: 'cod'
  });
  const [couponData, setCouponData] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      const data = await getCylinderPrices();
      setPrices(data);
    } catch (error) {
      toast.error('Failed to load cylinder prices');
    }
  };

  const selectedPrice = prices.find(p => p.cylinderType === formData.cylinderType);
  const subtotal = selectedPrice ? selectedPrice.price * formData.quantity : 0;
  const discount = couponData?.discount || 0;
  const total = subtotal - discount;

  const handleValidateCoupon = async () => {
    if (!formData.couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    if (!selectedPrice) {
      toast.error('Please select a cylinder type first');
      return;
    }

    setValidatingCoupon(true);
    try {
      const result = await validateCoupon(formData.couponCode, subtotal);
      if (result.valid) {
        setCouponData(result);
        toast.success(`Coupon applied! Discount: ₹${result.discount.toFixed(2)}`);
      } else {
        setCouponData(null);
        toast.error(result.message);
      }
    } catch (error) {
      setCouponData(null);
      toast.error('Invalid coupon code');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.cylinderType) {
      toast.error('Please select a cylinder type');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        agencyCustomerId: user.agencyCustomerId,
        deliveryAddress: formData.deliveryAddress,
        mobile: formData.mobile,
        cylinderType: formData.cylinderType,
        quantity: formData.quantity,
        couponCode: couponData ? formData.couponCode : null,
        paymentMethod: formData.paymentMethod
      };

      const order = await createOrder(orderData);

      if (formData.paymentMethod === 'online') {
        navigate(`/payment/${order.orderId}`, { state: { order } });
      } else {
        toast.success('Order placed successfully!');
        navigate('/orders');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" data-testid="book-cylinder-page">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center">
                <Package className="w-6 h-6 mr-2 text-blue-600" />
                <div>
                  <CardTitle>Book Gas Cylinder</CardTitle>
                  <CardDescription>Fill in the details for your delivery</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Customer Info (Read-only) */}
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Customer Name</p>
                      <p className="font-semibold" data-testid="customer-name">{user?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer ID</p>
                      <p className="font-semibold" data-testid="customer-id">{user?.agencyCustomerId}</p>
                    </div>
                  </div>
                </div>

                {/* Cylinder Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="cylinderType">Cylinder Type *</Label>
                  <Select
                    value={formData.cylinderType}
                    onValueChange={(value) => {
                      setFormData({ ...formData, cylinderType: value });
                      setCouponData(null);
                    }}
                  >
                    <SelectTrigger data-testid="cylinder-type-select">
                      <SelectValue placeholder="Select cylinder type" />
                    </SelectTrigger>
                    <SelectContent>
                      {prices.map((price) => (
                        <SelectItem key={price.cylinderType} value={price.cylinderType}>
                          {price.cylinderType} - ₹{price.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    data-testid="quantity-input"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.quantity}
                    onChange={(e) => {
                      setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 });
                      setCouponData(null);
                    }}
                    required
                  />
                </div>

                {/* Mobile Number */}
                <div className="space-y-2">
                  <Label htmlFor="mobile">Contact Number *</Label>
                  <Input
                    id="mobile"
                    data-testid="mobile-input"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    maxLength={10}
                    required
                  />
                </div>

                {/* Delivery Address */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                  <Textarea
                    id="deliveryAddress"
                    data-testid="delivery-address-input"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                {/* Coupon Code */}
                <div className="space-y-2">
                  <Label htmlFor="couponCode">Coupon Code (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="couponCode"
                      data-testid="coupon-input"
                      value={formData.couponCode}
                      onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                      placeholder="Enter coupon code"
                    />
                    <Button
                      type="button"
                      data-testid="apply-coupon-button"
                      variant="outline"
                      onClick={handleValidateCoupon}
                      disabled={validatingCoupon}
                    >
                      {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                  {couponData && (
                    <p className="text-sm text-green-600" data-testid="coupon-success">
                      ✓ Coupon applied successfully!
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cod" id="cod" data-testid="payment-cod" />
                      <Label htmlFor="cod" className="cursor-pointer">Cash on Delivery (COD)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="online" data-testid="payment-online" />
                      <Label htmlFor="online" className="cursor-pointer">Online Payment</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button
                  type="submit"
                  data-testid="place-order-button"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : formData.paymentMethod === 'online' ? 'Proceed to Payment' : 'Place Order'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Bill Summary */}
          <Card className="lg:col-span-1 h-fit sticky top-4">
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3" data-testid="bill-summary">
              {selectedPrice ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Cylinder ({formData.cylinderType})</span>
                    <span>₹{selectedPrice.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Quantity</span>
                    <span>× {formData.quantity}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span data-testid="subtotal">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span data-testid="discount">- ₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>GST</span>
                    <span>Included</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span data-testid="total-amount">₹{total.toFixed(2)}</span>
                  </div>
                  <Badge className="w-full justify-center" variant="secondary">
                    {formData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                  </Badge>
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center">Select a cylinder type to see price details</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookCylinderPage;
