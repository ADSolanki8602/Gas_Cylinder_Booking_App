import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCylinderPrices, updateCylinderPrice } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminPricesPage = () => {
  const navigate = useNavigate();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      const data = await getCylinderPrices();
      setPrices(data);
    } catch (error) {
      toast.error('Failed to load prices');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cylinderType, currentPrice) => {
    setEditingType(cylinderType);
    setEditPrice(currentPrice.toString());
  };

  const handleCancel = () => {
    setEditingType(null);
    setEditPrice('');
  };

  const handleSave = async (cylinderType) => {
    const newPrice = parseFloat(editPrice);
    
    if (isNaN(newPrice) || newPrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setUpdating(true);
    try {
      await updateCylinderPrice(cylinderType, newPrice);
      toast.success('Price updated successfully');
      
      // Update local state
      setPrices(prices.map(price => 
        price.cylinderType === cylinderType
          ? { ...price, price: newPrice, updatedAt: new Date().toISOString() }
          : price
      ));
      
      setEditingType(null);
      setEditPrice('');
    } catch (error) {
      toast.error('Failed to update price');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4" data-testid="admin-prices-page">
      <div className="max-w-4xl mx-auto">
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
            <CardTitle>Price Management</CardTitle>
            <CardDescription>
              Update cylinder prices. All prices include GST.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {prices.map((price) => (
                <div
                  key={price.cylinderType}
                  className="p-4 border rounded-lg bg-white"
                  data-testid="price-item"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{price.cylinderType} Cylinder</h3>
                      {price.updatedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last updated: {format(new Date(price.updatedAt), 'PPp')}
                        </p>
                      )}
                    </div>

                    {editingType === price.cylinderType ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">₹</span>
                          <Input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-32"
                            data-testid="price-input"
                            step="0.01"
                            min="0"
                            autoFocus
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSave(price.cylinderType)}
                          disabled={updating}
                          data-testid="save-price-button"
                        >
                          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                          disabled={updating}
                          data-testid="cancel-price-button"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold" data-testid="current-price">₹{price.price.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">(incl. GST)</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(price.cylinderType, price.price)}
                          data-testid="edit-price-button"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Price changes will apply to all new orders immediately. Existing orders will not be affected.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPricesPage;
