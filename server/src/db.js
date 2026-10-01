import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const uploadedLogo = "C:/Users/muhsi/.gemini/antigravity-ide/brain/7dbd9042-85e3-4ca3-9841-d1ccae211fa7/.user_uploaded/media_1790786852506.jpg";
  const clientPublic = path.join(__dirname, "../../client/public");
  const destLogo = path.join(clientPublic, "buywi-logo.jpg");
  if (fs.existsSync(uploadedLogo)) {
    if (!fs.existsSync(clientPublic)) fs.mkdirSync(clientPublic, { recursive: true });
    fs.copyFileSync(uploadedLogo, destLogo);
  }
} catch (_) {}

const db = new Database(path.join(__dirname, "../shopora.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand_id INTEGER,
  category_id INTEGER,
  description TEXT,
  price REAL NOT NULL,
  mrp REAL NOT NULL,
  rating REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  sku TEXT UNIQUE NOT NULL,
  image TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  trending INTEGER NOT NULL DEFAULT 0,
  bestseller INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  specs TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  area TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  type TEXT NOT NULL DEFAULT 'Home',
  is_default INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  UNIQUE(cart_id, product_id),
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS wishlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wishlist_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  UNIQUE(wishlist_id, product_id),
  FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  min_order REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  address_json TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  shipping REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'Order Placed',
  tracking_number TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  body TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  approved INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta TEXT,
  image TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
`);

try {
  db.prepare("INSERT OR IGNORE INTO brands(name, slug) VALUES(?, ?)").run("VIOVI", "viovi");

  const vioviBrand = db.prepare("SELECT id FROM brands WHERE slug='viovi'").get();
  const homeKitchenCat = db.prepare("SELECT id FROM categories WHERE slug='home-kitchen'").get();

  const vioviProduct = {
    name: "VIOVI COB LED Torch Light Key Chain",
    slug: "viovi-cob-led-torch-light-key-chain",
    brand_id: vioviBrand?.id || null,
    category_id: homeKitchenCat?.id || null,
    description: "Multifunctional rechargeable mini COB LED flashlight emitting up to 500 lumens with wide-angle beam. Features a strong magnetic base, 180° foldable stand, carabiner clip, and built-in bottle opener. Includes USB Type-C fast charging. Water and impact resistant for camping, repairs, and daily carry.",
    price: 199,
    mrp: 978,
    rating: 4.5,
    review_count: 18,
    stock: 45,
    low_stock_threshold: 5,
    sku: "SKU-VIOVI-153768896",
    image: "https://cdn2.shopclues.com/images1/thumbnails/118621/320/320/153768896-118621663-1789735158.jpg",
    featured: 1,
    trending: 1,
    bestseller: 1,
    specs: JSON.stringify({
      "Type": "Rechargeable COB LED Keychain Light",
      "Brightness": "500 Lumens",
      "Material": "Aluminum Alloy & ABS Plastic",
      "Battery": "500mAh USB Rechargeable Lithium Polymer",
      "Charging Port": "Type-C Fast Charging",
      "Special Features": "Magnet Base, 180° Foldable Stand, Carabiner, Bottle Opener",
      "Dimensions": "5 cm x 5 cm x 3 cm",
      "Country of Origin": "India"
    })
  };

  db.prepare(`
    INSERT INTO products (
      name, slug, brand_id, category_id, description, price, mrp,
      rating, review_count, stock, low_stock_threshold, sku, image,
      featured, trending, bestseller, active, specs
    ) VALUES (
      @name, @slug, @brand_id, @category_id, @description, @price, @mrp,
      @rating, @review_count, @stock, @low_stock_threshold, @sku, @image,
      @featured, @trending, @bestseller, 1, @specs
    )
    ON CONFLICT(slug) DO UPDATE SET
      price = excluded.price,
      mrp = excluded.mrp,
      image = excluded.image,
      description = excluded.description,
      specs = excluded.specs
  `).run(vioviProduct);
} catch (e) {
  console.warn("Auto-seed error for VIOVI product:", e.message);
}

try {
  const adminUser = db.prepare("SELECT * FROM users WHERE email='admin@shopora.local'").get();
  if (adminUser) {
    db.prepare("INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)").run(
      "Buywi Admin", "admin@buywi.local", adminUser.password_hash, "admin"
    );
  }
  const custUser = db.prepare("SELECT * FROM users WHERE email='customer@shopora.local'").get();
  if (custUser) {
    db.prepare("INSERT OR IGNORE INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)").run(
      "Demo Customer", "customer@buywi.local", custUser.password_hash, custUser.phone || "9876543210"
    );
  }
} catch (_) {}

export default db;

