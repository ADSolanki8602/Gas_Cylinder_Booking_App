import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveOffers } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, User, LogOut, Clock } from 'lucide-react';
import { toast } from 'sonner';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const data = await getActiveOffers();
      setOffers(data);
    } catch (error) {
      console.error('Failed to load offers:', error);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" data-testid="customer-dashboard">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gas Cylinder Booking</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome, {user?.name}!</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                data-testid="profile-button"
                onClick={() => navigate('/profile')}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="logout-button"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Info Card */}
        <Card className="mb-6" data-testid="customer-info-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Customer ID</p>
                <p className="text-lg font-semibold" data-testid="customer-id">{user?.agencyCustomerId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mobile</p>
                <p className="text-lg font-semibold" data-testid="customer-mobile">{user?.mobile}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-semibold" data-testid="customer-email">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Offers */}
        {offers.length > 0 && (
          <Card className="mb-6" data-testid="offers-section">
            <CardHeader>
              <CardTitle>Active Offers</CardTitle>
              <CardDescription>Check out our latest deals and discounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50"
                    data-testid="offer-item"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{offer.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
                      </div>
                      <Badge className="bg-green-600">{offer.discountPercentage}% OFF</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            data-testid="book-cylinder-card"
            onClick={() => navigate('/book-cylinder')}
          >
            <CardHeader>
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <CardTitle>Book Gas Cylinder</CardTitle>
                  <CardDescription>Order a new cylinder delivery</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" data-testid="book-now-button">
                Book Now
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            data-testid="order-history-card"
            onClick={() => navigate('/orders')}
          >
            <CardHeader>
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>Track your orders and view history</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="view-orders-button">
                View Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
