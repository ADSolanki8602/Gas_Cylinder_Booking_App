from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="Gas Cylinder Booking API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ==================== ENUMS ====================
class UserRole(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"

class CylinderType(str, Enum):
    KG_5 = "5kg"
    KG_14 = "14kg"
    KG_19 = "19kg"

class OrderStatus(str, Enum):
    RECEIVED = "received"
    DISPATCHED = "dispatched"
    ON_THE_WAY = "on-the-way"
    DELIVERED = "delivered"

class PaymentMethod(str, Enum):
    ONLINE = "online"
    COD = "cod"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

# ==================== MODELS ====================

# User Models
class UserBase(BaseModel):
    name: str
    email: EmailStr
    mobile: str
    address: str

class UserRegister(UserBase):
    password: str
    role: UserRole = UserRole.CUSTOMER

class UserLogin(BaseModel):
    login_id: str  # Can be mobile or agencyCustomerId
    password: str

class User(UserBase):
    id: str
    role: UserRole
    agencyCustomerId: str
    createdAt: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    address: Optional[str] = None

# Cylinder Price Models
class CylinderPrice(BaseModel):
    cylinderType: CylinderType
    price: float
    updatedAt: datetime
    updatedBy: Optional[str] = None

class CylinderPriceUpdate(BaseModel):
    price: float

# Order Models
class OrderCreate(BaseModel):
    agencyCustomerId: str
    deliveryAddress: str
    mobile: str
    cylinderType: CylinderType
    quantity: int = Field(ge=1, le=10)
    couponCode: Optional[str] = None
    paymentMethod: PaymentMethod

class Order(BaseModel):
    orderId: str
    userId: str
    customerName: str
    agencyCustomerId: str
    mobile: str
    deliveryAddress: str
    cylinderType: CylinderType
    quantity: int
    pricePerUnit: float
    couponCode: Optional[str] = None
    discount: float
    totalAmount: float
    paymentMethod: PaymentMethod
    paymentStatus: PaymentStatus
    orderStatus: OrderStatus
    createdAt: datetime
    updatedAt: datetime

class OrderStatusUpdate(BaseModel):
    orderStatus: OrderStatus

# Payment Models
class PaymentInitiate(BaseModel):
    orderId: str
    amount: float

class PaymentVerify(BaseModel):
    orderId: str
    paymentId: str
    success: bool

# Coupon Models (for future use)
class Coupon(BaseModel):
    id: str
    code: str
    discountType: Literal["percentage", "fixed"]
    discountValue: float
    minOrderAmount: float
    validFrom: datetime
    validTo: datetime
    isActive: bool
    createdAt: datetime

class CouponCreate(BaseModel):
    code: str
    discountType: Literal["percentage", "fixed"]
    discountValue: float
    minOrderAmount: float = 0
    validFrom: datetime
    validTo: datetime

# Offer Models (for future use)
class Offer(BaseModel):
    id: str
    title: str
    description: str
    discountPercentage: float
    validFrom: datetime
    validTo: datetime
    isActive: bool
    createdAt: datetime

class OfferCreate(BaseModel):
    title: str
    description: str
    discountPercentage: float
    validFrom: datetime
    validTo: datetime

# Response Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class MessageResponse(BaseModel):
    message: str

# ==================== UTILITY FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = verify_token(token)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def generate_agency_customer_id() -> str:
    return f"AGC{uuid.uuid4().hex[:8].upper()}"

# ==================== ROUTES ====================

# Health Check
@api_router.get("/")
async def root():
    return {"message": "Gas Cylinder Booking API", "status": "running"}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if mobile already exists
    existing_user = await db.users.find_one({"mobile": user_data.mobile})
    if existing_user:
        raise HTTPException(status_code=400, detail="Mobile number already registered")
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    agency_customer_id = generate_agency_customer_id()
    hashed_pw = hash_password(user_data.password)
    
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "mobile": user_data.mobile,
        "address": user_data.address,
        "password": hashed_pw,
        "role": user_data.role,
        "agencyCustomerId": agency_customer_id,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create token
    token = create_access_token(user_id, user_data.role)
    
    # Return user without password
    user_response = User(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        mobile=user_data.mobile,
        address=user_data.address,
        role=user_data.role,
        agencyCustomerId=agency_customer_id,
        createdAt=datetime.fromisoformat(user_doc["createdAt"])
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Try to find user by mobile or agencyCustomerId
    user = await db.users.find_one({
        "$or": [
            {"mobile": credentials.login_id},
            {"agencyCustomerId": credentials.login_id}
        ]
    }, {"_id": 0})
    
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_access_token(user['id'], user['role'])
    
    # Return user without password
    user_response = User(
        id=user['id'],
        name=user['name'],
        email=user['email'],
        mobile=user['mobile'],
        address=user['address'],
        role=user['role'],
        agencyCustomerId=user['agencyCustomerId'],
        createdAt=datetime.fromisoformat(user['createdAt'])
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(
        id=current_user['id'],
        name=current_user['name'],
        email=current_user['email'],
        mobile=current_user['mobile'],
        address=current_user['address'],
        role=current_user['role'],
        agencyCustomerId=current_user['agencyCustomerId'],
        createdAt=datetime.fromisoformat(current_user['createdAt'])
    )

@api_router.put("/auth/profile", response_model=User)
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Check if mobile is being updated and if it already exists
    if "mobile" in update_fields:
        existing = await db.users.find_one({"mobile": update_fields["mobile"], "id": {"$ne": current_user['id']}})
        if existing:
            raise HTTPException(status_code=400, detail="Mobile number already in use")
    
    # Check if email is being updated and if it already exists
    if "email" in update_fields:
        existing = await db.users.find_one({"email": update_fields["email"], "id": {"$ne": current_user['id']}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    await db.users.update_one({"id": current_user['id']}, {"$set": update_fields})
    
    updated_user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    
    return User(
        id=updated_user['id'],
        name=updated_user['name'],
        email=updated_user['email'],
        mobile=updated_user['mobile'],
        address=updated_user['address'],
        role=updated_user['role'],
        agencyCustomerId=updated_user['agencyCustomerId'],
        createdAt=datetime.fromisoformat(updated_user['createdAt'])
    )

# ==================== CYLINDER PRICE ROUTES ====================

@api_router.get("/prices", response_model=List[CylinderPrice])
async def get_prices():
    prices = await db.cylinder_prices.find({}, {"_id": 0}).to_list(10)
    
    # If no prices exist, initialize with defaults
    if not prices:
        default_prices = [
            {
                "cylinderType": CylinderType.KG_5,
                "price": 515.0,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "updatedBy": None
            },
            {
                "cylinderType": CylinderType.KG_14,
                "price": 869.0,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "updatedBy": None
            },
            {
                "cylinderType": CylinderType.KG_19,
                "price": 1650.0,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "updatedBy": None
            }
        ]
        await db.cylinder_prices.insert_many(default_prices)
        prices = default_prices
    
    return [CylinderPrice(
        cylinderType=p['cylinderType'],
        price=p['price'],
        updatedAt=datetime.fromisoformat(p['updatedAt']),
        updatedBy=p.get('updatedBy')
    ) for p in prices]

@api_router.put("/admin/prices/{cylinder_type}", response_model=CylinderPrice)
async def update_price(
    cylinder_type: CylinderType,
    price_update: CylinderPriceUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    updated_at = datetime.now(timezone.utc).isoformat()
    
    result = await db.cylinder_prices.update_one(
        {"cylinderType": cylinder_type},
        {
            "$set": {
                "price": price_update.price,
                "updatedAt": updated_at,
                "updatedBy": admin_user['id']
            }
        },
        upsert=True
    )
    
    updated_price = await db.cylinder_prices.find_one({"cylinderType": cylinder_type}, {"_id": 0})
    
    return CylinderPrice(
        cylinderType=updated_price['cylinderType'],
        price=updated_price['price'],
        updatedAt=datetime.fromisoformat(updated_price['updatedAt']),
        updatedBy=updated_price.get('updatedBy')
    )

# ==================== CUSTOMER LOOKUP ROUTE ====================

@api_router.get("/customers/{agency_customer_id}", response_model=User)
async def get_customer_by_agency_id(
    agency_customer_id: str,
    current_user: dict = Depends(get_current_user)
):
    customer = await db.users.find_one({"agencyCustomerId": agency_customer_id}, {"_id": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return User(
        id=customer['id'],
        name=customer['name'],
        email=customer['email'],
        mobile=customer['mobile'],
        address=customer['address'],
        role=customer['role'],
        agencyCustomerId=customer['agencyCustomerId'],
        createdAt=datetime.fromisoformat(customer['createdAt'])
    )

# ==================== ORDER ROUTES ====================

@api_router.post("/orders", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get cylinder price
    price_doc = await db.cylinder_prices.find_one({"cylinderType": order_data.cylinderType})
    if not price_doc:
        raise HTTPException(status_code=404, detail="Cylinder price not found")
    
    price_per_unit = price_doc['price']
    subtotal = price_per_unit * order_data.quantity
    discount = 0.0
    
    # Validate coupon if provided (for future use)
    if order_data.couponCode:
        coupon = await db.coupons.find_one({
            "code": order_data.couponCode,
            "isActive": True
        })
        if coupon:
            valid_from = datetime.fromisoformat(coupon['validFrom'])
            valid_to = datetime.fromisoformat(coupon['validTo'])
            now = datetime.now(timezone.utc)
            
            if valid_from <= now <= valid_to and subtotal >= coupon.get('minOrderAmount', 0):
                if coupon['discountType'] == 'percentage':
                    discount = subtotal * (coupon['discountValue'] / 100)
                else:
                    discount = coupon['discountValue']
    
    total_amount = subtotal - discount
    
    # Create order
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    order_doc = {
        "orderId": order_id,
        "userId": current_user['id'],
        "customerName": current_user['name'],
        "agencyCustomerId": current_user['agencyCustomerId'],
        "mobile": order_data.mobile,
        "deliveryAddress": order_data.deliveryAddress,
        "cylinderType": order_data.cylinderType,
        "quantity": order_data.quantity,
        "pricePerUnit": price_per_unit,
        "couponCode": order_data.couponCode,
        "discount": discount,
        "totalAmount": total_amount,
        "paymentMethod": order_data.paymentMethod,
        "paymentStatus": PaymentStatus.PENDING if order_data.paymentMethod == PaymentMethod.ONLINE else PaymentStatus.COMPLETED,
        "orderStatus": OrderStatus.RECEIVED,
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.orders.insert_one(order_doc)
    
    return Order(**{k: v if k not in ['createdAt', 'updatedAt'] else datetime.fromisoformat(v) for k, v in order_doc.items()})

@api_router.get("/orders", response_model=List[Order])
async def get_user_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"userId": current_user['id']},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(100)
    
    return [Order(**{k: v if k not in ['createdAt', 'updatedAt'] else datetime.fromisoformat(v) for k, v in order.items()}) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    order = await db.orders.find_one({"orderId": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns this order or is admin
    if order['userId'] != current_user['id'] and current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return Order(**{k: v if k not in ['createdAt', 'updatedAt'] else datetime.fromisoformat(v) for k, v in order.items()})

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payment/initiate")
async def initiate_payment(
    payment_data: PaymentInitiate,
    current_user: dict = Depends(get_current_user)
):
    order = await db.orders.find_one({"orderId": payment_data.orderId})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['userId'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Simulate payment gateway
    payment_id = f"PAY{uuid.uuid4().hex[:12].upper()}"
    
    return {
        "paymentId": payment_id,
        "orderId": payment_data.orderId,
        "amount": payment_data.amount,
        "status": "initiated"
    }

@api_router.post("/payment/verify")
async def verify_payment(
    payment_data: PaymentVerify,
    current_user: dict = Depends(get_current_user)
):
    order = await db.orders.find_one({"orderId": payment_data.orderId})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['userId'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update payment status
    new_status = PaymentStatus.COMPLETED if payment_data.success else PaymentStatus.FAILED
    
    await db.orders.update_one(
        {"orderId": payment_data.orderId},
        {
            "$set": {
                "paymentStatus": new_status,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "orderId": payment_data.orderId,
        "paymentId": payment_data.paymentId,
        "status": new_status,
        "message": "Payment successful" if payment_data.success else "Payment failed"
    }

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/orders", response_model=List[Order])
async def get_all_orders(admin_user: dict = Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    
    return [Order(**{k: v if k not in ['createdAt', 'updatedAt'] else datetime.fromisoformat(v) for k, v in order.items()}) for order in orders]

@api_router.put("/admin/orders/{order_id}/status", response_model=Order)
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    order = await db.orders.find_one({"orderId": order_id})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"orderId": order_id},
        {
            "$set": {
                "orderStatus": status_update.orderStatus,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    updated_order = await db.orders.find_one({"orderId": order_id}, {"_id": 0})
    
    return Order(**{k: v if k not in ['createdAt', 'updatedAt'] else datetime.fromisoformat(v) for k, v in updated_order.items()})

# ==================== COUPON ROUTES (for future use) ====================

@api_router.post("/admin/coupons", response_model=Coupon)
async def create_coupon(
    coupon_data: CouponCreate,
    admin_user: dict = Depends(get_admin_user)
):
    # Check if code already exists
    existing = await db.coupons.find_one({"code": coupon_data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon_id = str(uuid.uuid4())
    coupon_doc = {
        "id": coupon_id,
        **coupon_data.model_dump(),
        "validFrom": coupon_data.validFrom.isoformat(),
        "validTo": coupon_data.validTo.isoformat(),
        "isActive": True,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.coupons.insert_one(coupon_doc)
    
    return Coupon(**{k: v if k not in ['validFrom', 'validTo', 'createdAt'] else datetime.fromisoformat(v) for k, v in coupon_doc.items()})

@api_router.get("/admin/coupons", response_model=List[Coupon])
async def get_all_coupons(admin_user: dict = Depends(get_admin_user)):
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(100)
    return [Coupon(**{k: v if k not in ['validFrom', 'validTo', 'createdAt'] else datetime.fromisoformat(v) for k, v in coupon.items()}) for coupon in coupons]

@api_router.post("/coupons/validate")
async def validate_coupon(code: str, amount: float, current_user: dict = Depends(get_current_user)):
    coupon = await db.coupons.find_one({"code": code, "isActive": True})
    
    if not coupon:
        return {"valid": False, "message": "Invalid coupon code"}
    
    valid_from = datetime.fromisoformat(coupon['validFrom'])
    valid_to = datetime.fromisoformat(coupon['validTo'])
    now = datetime.now(timezone.utc)
    
    if not (valid_from <= now <= valid_to):
        return {"valid": False, "message": "Coupon has expired"}
    
    if amount < coupon.get('minOrderAmount', 0):
        return {"valid": False, "message": f"Minimum order amount ₹{coupon['minOrderAmount']} required"}
    
    discount = 0
    if coupon['discountType'] == 'percentage':
        discount = amount * (coupon['discountValue'] / 100)
    else:
        discount = coupon['discountValue']
    
    return {
        "valid": True,
        "discount": discount,
        "discountType": coupon['discountType'],
        "discountValue": coupon['discountValue']
    }

# ==================== OFFER ROUTES (for future use) ====================

@api_router.post("/admin/offers", response_model=Offer)
async def create_offer(
    offer_data: OfferCreate,
    admin_user: dict = Depends(get_admin_user)
):
    offer_id = str(uuid.uuid4())
    offer_doc = {
        "id": offer_id,
        **offer_data.model_dump(),
        "validFrom": offer_data.validFrom.isoformat(),
        "validTo": offer_data.validTo.isoformat(),
        "isActive": True,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.offers.insert_one(offer_doc)
    
    return Offer(**{k: v if k not in ['validFrom', 'validTo', 'createdAt'] else datetime.fromisoformat(v) for k, v in offer_doc.items()})

@api_router.get("/offers", response_model=List[Offer])
async def get_active_offers():
    now = datetime.now(timezone.utc).isoformat()
    offers = await db.offers.find({
        "isActive": True,
        "validFrom": {"$lte": now},
        "validTo": {"$gte": now}
    }, {"_id": 0}).to_list(100)
    
    return [Offer(**{k: v if k not in ['validFrom', 'validTo', 'createdAt'] else datetime.fromisoformat(v) for k, v in offer.items()}) for offer in offers]

@api_router.get("/admin/offers", response_model=List[Offer])
async def get_all_offers(admin_user: dict = Depends(get_admin_user)):
    offers = await db.offers.find({}, {"_id": 0}).to_list(100)
    return [Offer(**{k: v if k not in ['validFrom', 'validTo', 'createdAt'] else datetime.fromisoformat(v) for k, v in offer.items()}) for offer in offers]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
