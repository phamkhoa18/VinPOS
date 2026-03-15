import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Shop from '@/lib/models/Shop';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import Customer from '@/lib/models/Customer';
import { successResponse, errorResponse } from '@/lib/auth';

export async function POST() {
  try {
    await connectDB();

    // Check if already seeded
    const existingAdmin = await User.findOne({ email: 'admin@vinpos.com' });
    if (existingAdmin) {
      return successResponse({ message: 'Dữ liệu mẫu đã tồn tại', alreadySeeded: true });
    }

    // 1. Create Admin
    const admin = await User.create({
      email: 'admin@vinpos.com',
      password: '123456',
      name: 'Admin VinPOS',
      phone: '0901234567',
      role: 'admin',
    });

    // 2. Create Shop Owner
    const owner = await User.create({
      email: 'shop@vinpos.com',
      password: '123456',
      name: 'Nguyễn Văn An',
      phone: '0912345678',
      role: 'shop_owner',
    });

    // 3. Create Shop
    const shop = await Shop.create({
      name: 'VinPOS Demo Store',
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      phone: '0912345678',
      email: 'shop@vinpos.com',
      ownerId: owner._id,
    });

    // Update owner with shopId
    owner.shopId = shop._id;
    await owner.save();

    // 4. Create Employee
    await User.create({
      email: 'nhanvien@vinpos.com',
      password: '123456',
      name: 'Trần Thị Bình',
      phone: '0923456789',
      role: 'employee',
      shopId: shop._id,
    });

    // 5. Create Categories
    const categories = await Category.insertMany([
      { name: 'Điện thoại', description: 'Smartphone các loại', icon: 'smartphone', shopId: shop._id },
      { name: 'Laptop', description: 'Máy tính xách tay', icon: 'laptop', shopId: shop._id },
      { name: 'Phụ kiện', description: 'Phụ kiện điện tử', icon: 'shield', shopId: shop._id },
      { name: 'Tablet', description: 'Máy tính bảng', icon: 'tablet', shopId: shop._id },
      { name: 'Đồng hồ thông minh', description: 'Smartwatch', icon: 'watch', shopId: shop._id },
      { name: 'Âm thanh', description: 'Loa, tai nghe', icon: 'speaker', shopId: shop._id },
    ]);

    // 6. Create Products
    const products = [
      { name: 'iPhone 15 Pro Max', sku: 'IP15PM', barcode: '8901234560001', categoryId: categories[0]._id, price: 34990000, costPrice: 30000000, stock: 25, unit: 'Chiếc', image: 'smartphone', description: 'iPhone 15 Pro Max 256GB' },
      { name: 'iPhone 15 Pro', sku: 'IP15P', barcode: '8901234560002', categoryId: categories[0]._id, price: 29990000, costPrice: 25500000, stock: 30, unit: 'Chiếc', image: 'smartphone' },
      { name: 'iPhone 15', sku: 'IP15', barcode: '8901234560003', categoryId: categories[0]._id, price: 22990000, costPrice: 19500000, stock: 40, unit: 'Chiếc', image: 'smartphone' },
      { name: 'Samsung Galaxy S24 Ultra', sku: 'SGS24U', barcode: '8901234560004', categoryId: categories[0]._id, price: 33990000, costPrice: 28500000, stock: 20, unit: 'Chiếc', image: 'smartphone' },
      { name: 'Samsung Galaxy S24+', sku: 'SGS24P', barcode: '8901234560005', categoryId: categories[0]._id, price: 26990000, costPrice: 22500000, stock: 25, unit: 'Chiếc', image: 'smartphone' },
      { name: 'Samsung Galaxy A55', sku: 'SGA55', barcode: '8901234560006', categoryId: categories[0]._id, price: 10490000, costPrice: 8500000, stock: 50, unit: 'Chiếc', image: 'smartphone' },
      { name: 'Xiaomi 14 Ultra', sku: 'XI14U', barcode: '8901234560007', categoryId: categories[0]._id, price: 23990000, costPrice: 20000000, stock: 15, unit: 'Chiếc', image: 'smartphone' },
      { name: 'OPPO Find X7 Ultra', sku: 'OFX7U', barcode: '8901234560008', categoryId: categories[0]._id, price: 22990000, costPrice: 19000000, stock: 18, unit: 'Chiếc', image: 'smartphone' },
      { name: 'MacBook Pro 14 M3', sku: 'MBP14M3', barcode: '8901234560009', categoryId: categories[1]._id, price: 49990000, costPrice: 43000000, stock: 10, unit: 'Chiếc', image: 'laptop' },
      { name: 'MacBook Air M3', sku: 'MBA3', barcode: '8901234560010', categoryId: categories[1]._id, price: 27990000, costPrice: 23500000, stock: 15, unit: 'Chiếc', image: 'laptop' },
      { name: 'Dell XPS 15', sku: 'DXPS15', barcode: '8901234560011', categoryId: categories[1]._id, price: 42990000, costPrice: 36000000, stock: 8, unit: 'Chiếc', image: 'laptop' },
      { name: 'ThinkPad X1 Carbon', sku: 'TPX1C', barcode: '8901234560012', categoryId: categories[1]._id, price: 38990000, costPrice: 33000000, stock: 12, unit: 'Chiếc', image: 'laptop' },
      { name: 'ASUS ROG Strix G16', sku: 'ARSG16', barcode: '8901234560013', categoryId: categories[1]._id, price: 35990000, costPrice: 30000000, stock: 7, unit: 'Chiếc', image: 'laptop' },
      { name: 'Ốp lưng iPhone 15', sku: 'OL-IP15', barcode: '8901234560014', categoryId: categories[2]._id, price: 350000, costPrice: 120000, stock: 200, unit: 'Chiếc', image: 'shield' },
      { name: 'Cáp sạc Type-C', sku: 'CSC-TC', barcode: '8901234560015', categoryId: categories[2]._id, price: 250000, costPrice: 80000, stock: 300, unit: 'Sợi', image: 'cable' },
      { name: 'Củ sạc nhanh 65W', sku: 'CS65W', barcode: '8901234560016', categoryId: categories[2]._id, price: 490000, costPrice: 200000, stock: 150, unit: 'Chiếc', image: 'charger' },
      { name: 'Kính cường lực', sku: 'KCL', barcode: '8901234560017', categoryId: categories[2]._id, price: 150000, costPrice: 30000, stock: 500, unit: 'Miếng', image: 'shield' },
      { name: 'Bao da Samsung S24', sku: 'BD-S24', barcode: '8901234560018', categoryId: categories[2]._id, price: 450000, costPrice: 150000, stock: 100, unit: 'Chiếc', image: 'shield' },
      { name: 'iPad Pro M4 11"', sku: 'IPDM4', barcode: '8901234560019', categoryId: categories[3]._id, price: 28990000, costPrice: 25000000, stock: 12, unit: 'Chiếc', image: 'tablet' },
      { name: 'iPad Air M2', sku: 'IPDAM2', barcode: '8901234560020', categoryId: categories[3]._id, price: 18990000, costPrice: 16000000, stock: 15, unit: 'Chiếc', image: 'tablet' },
      { name: 'Samsung Galaxy Tab S9', sku: 'SGTS9', barcode: '8901234560021', categoryId: categories[3]._id, price: 19990000, costPrice: 16500000, stock: 10, unit: 'Chiếc', image: 'tablet' },
      { name: 'Apple Watch Series 9', sku: 'AWS9', barcode: '8901234560022', categoryId: categories[4]._id, price: 11990000, costPrice: 9500000, stock: 20, unit: 'Chiếc', image: 'watch' },
      { name: 'Apple Watch Ultra 2', sku: 'AWU2', barcode: '8901234560023', categoryId: categories[4]._id, price: 22990000, costPrice: 19500000, stock: 8, unit: 'Chiếc', image: 'watch' },
      { name: 'Samsung Galaxy Watch 6', sku: 'SGW6', barcode: '8901234560024', categoryId: categories[4]._id, price: 7490000, costPrice: 5800000, stock: 15, unit: 'Chiếc', image: 'watch' },
      { name: 'AirPods Pro 2', sku: 'APP2', barcode: '8901234560025', categoryId: categories[5]._id, price: 6790000, costPrice: 5200000, stock: 35, unit: 'Chiếc', image: 'headphones' },
      { name: 'AirPods Max', sku: 'APM', barcode: '8901234560026', categoryId: categories[5]._id, price: 13990000, costPrice: 11500000, stock: 10, unit: 'Chiếc', image: 'headphones' },
      { name: 'Sony WH-1000XM5', sku: 'SXM5', barcode: '8901234560027', categoryId: categories[5]._id, price: 8490000, costPrice: 6800000, stock: 12, unit: 'Chiếc', image: 'headphones' },
      { name: 'JBL Flip 6', sku: 'JBLF6', barcode: '8901234560028', categoryId: categories[5]._id, price: 2990000, costPrice: 2200000, stock: 25, unit: 'Chiếc', image: 'speaker' },
      { name: 'HomePod Mini', sku: 'HPM', barcode: '8901234560029', categoryId: categories[5]._id, price: 2490000, costPrice: 1800000, stock: 20, unit: 'Chiếc', image: 'speaker' },
      { name: 'Marshall Stanmore III', sku: 'MS3', barcode: '8901234560030', categoryId: categories[5]._id, price: 9990000, costPrice: 8000000, stock: 5, unit: 'Chiếc', image: 'speaker' },
    ];

    await Product.insertMany(products.map((p) => ({ ...p, shopId: shop._id })));

    // 7. Create Customers
    await Customer.insertMany([
      { name: 'Lê Văn Cường', phone: '0934567890', email: 'cuong@email.com', address: '456 Lê Lợi, Q1, HCM', shopId: shop._id, totalOrders: 5, totalSpent: 125000000, points: 12500 },
      { name: 'Phạm Thị Dung', phone: '0945678901', email: 'dung@email.com', address: '789 CMT8, Q3, HCM', shopId: shop._id, totalOrders: 3, totalSpent: 45000000, points: 4500 },
      { name: 'Hoàng Văn Em', phone: '0956789012', address: '321 Nguyễn Trãi, Q5, HCM', shopId: shop._id, totalOrders: 8, totalSpent: 230000000, points: 23000 },
      { name: 'Ngô Thị Phương', phone: '0967890123', email: 'phuong@email.com', address: '654 Hai Bà Trưng, Q1, HCM', shopId: shop._id, totalOrders: 2, totalSpent: 18000000, points: 1800 },
      { name: 'Đặng Quang Hải', phone: '0978901234', address: '987 Võ Văn Ngân, Thủ Đức, HCM', shopId: shop._id, totalOrders: 12, totalSpent: 380000000, points: 38000 },
      { name: 'Bùi Minh Tuấn', phone: '0989012345', email: 'tuan@email.com', shopId: shop._id, totalOrders: 1, totalSpent: 34990000, points: 3499 },
      { name: 'Vũ Ngọc Lan', phone: '0990123456', email: 'lan@email.com', address: '159 Pasteur, Q3, HCM', shopId: shop._id, totalOrders: 6, totalSpent: 95000000, points: 9500 },
      { name: 'Mai Hoàng Long', phone: '0901122334', address: '753 Trần Hưng Đạo, Q1, HCM', shopId: shop._id, totalOrders: 4, totalSpent: 67000000, points: 6700 },
    ]);

    return successResponse({
      message: 'Đã tạo dữ liệu mẫu thành công!',
      accounts: {
        admin: { email: 'admin@vinpos.com', password: '123456' },
        shopOwner: { email: 'shop@vinpos.com', password: '123456' },
        employee: { email: 'nhanvien@vinpos.com', password: '123456' },
      },
      data: {
        users: 3,
        shop: shop.name,
        categories: categories.length,
        products: products.length,
        customers: 8,
      },
    }, 201);
  } catch (error) {
    console.error('Seed error:', error);
    return errorResponse('Lỗi khi tạo dữ liệu mẫu: ' + (error as Error).message);
  }
}
