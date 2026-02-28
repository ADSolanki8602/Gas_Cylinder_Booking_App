import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, User, LogOut, Settings, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600 mt-1">Gas Cylinder Booking Management</p>
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
        {/* Admin Info Card */}
        <Card className="mb-6" data-testid="admin-info-card">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <User className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Logged in as</p>
                <p className="text-lg font-semibold" data-testid="admin-name">{user?.name}</p>
                <p className="text-sm text-gray-500">Admin ID: {user?.agencyCustomerId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Orders Management */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            data-testid="orders-management-card"
            onClick={() => navigate('/admin/orders')}
          >
            <CardHeader>
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <CardTitle>Orders Management</CardTitle>
                  <CardDescription>View and update order status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" data-testid="manage-orders-button">
                Manage Orders
              </Button>
            </CardContent>
          </Card>

          {/* Price Management */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            data-testid="price-management-card"
            onClick={() => navigate('/admin/prices')}
          >
            <CardHeader>
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <Settings className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <CardTitle>Price Management</CardTitle>
                  <CardDescription>Update cylinder prices</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" data-testid="manage-prices-button">
                Manage Prices
              </Button>
            </CardContent>
          </Card>

          {/* Future: Offers & Coupons */}
          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Package className="w-8 h-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <CardTitle>Offers & Coupons</CardTitle>
                  <CardDescription>Coming Soon</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
