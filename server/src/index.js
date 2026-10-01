import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import db from "./db.js";
import { auth, adminOnly, comparePassword, hashPassword, signToken, currentUser } from "./auth.js";
import { createPaymentOrder, verifyPayment } from "./services/paymentService.js";

const app = express();
const port = Number(process.env.PORT || 4000);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 15*60*1000, limit: 300 }));

const safeProduct = (p) => ({...p, discount: Math.max(0, Math.round((1-p.price/p.mrp)*100)), specs: typeof p.specs==="string"?JSON.parse(p.specs||"{}"):p.specs});
const productQuery = `
SELECT p.*, c.name category, c.slug category_slug, b.name brand
FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id
`;

app.get("/api/health", (_,res)=>res.json({ok:true,service:"buywi-api"}));

app.post("/api/auth/register", async (req,res)=>{
  const schema=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8),phone:z.string().optional()});
  const parsed=schema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:"Invalid registration details"});
  try {
    const hash=await hashPassword(parsed.data.password);
    const info=db.prepare("INSERT INTO users(name,email,password_hash,phone) VALUES(?,?,?,?)").run(parsed.data.name,parsed.data.email.toLowerCase(),hash,parsed.data.phone||null);
    const user=currentUser(info.lastInsertRowid); res.json({user,token:signToken(user)});
  } catch { res.status(409).json({error:"Email already registered"}); }
});

app.post("/api/auth/login", async (req,res)=>{
  const {email,password}=req.body||{};
  const user=db.prepare("SELECT * FROM users WHERE email=?").get(String(email||"").toLowerCase());
  if(!user || !(await comparePassword(String(password||""),user.password_hash))) return res.status(401).json({error:"Invalid email or password"});
  if(user.status!=="active") return res.status(403).json({error:"Account disabled"});
  const safe=currentUser(user.id); res.json({user:safe,token:signToken(safe)});
});
app.get("/api/auth/me",auth(),(req,res)=>res.json({user:currentUser(req.user.id)}));

app.get("/api/categories",(_,res)=>res.json(db.prepare("SELECT * FROM categories WHERE active=1 ORDER BY name").all()));
app.get("/api/banners",(_,res)=>res.json(db.prepare("SELECT * FROM banners WHERE active=1 ORDER BY sort_order").all()));

app.get("/api/products",(req,res)=>{
  const {q,category,brand,min,max,sort="featured",page=1,limit=24}=req.query;
  const where=["p.active=1"], args=[];
  if(q){where.push("(p.name LIKE ? OR b.name LIKE ? OR c.name LIKE ?)");args.push(`%${q}%`,`%${q}%`,`%${q}%`);}
  if(category){where.push("c.slug=?");args.push(category);}
  if(brand){where.push("b.slug=?");args.push(brand);}
  if(min){where.push("p.price>=?");args.push(Number(min));}
  if(max){where.push("p.price<=?");args.push(Number(max));}
  const order={price_asc:"p.price ASC",price_desc:"p.price DESC",rating:"p.rating DESC",newest:"p.created_at DESC",discount:"(p.mrp-p.price)/p.mrp DESC",featured:"p.featured DESC,p.trending DESC,p.created_at DESC"}[sort]||"p.featured DESC";
  const count=db.prepare(`SELECT COUNT(*) n FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id WHERE ${where.join(" AND ")}`).get(...args).n;
  const offset=(Number(page)-1)*Number(limit);
  const rows=db.prepare(`${productQuery} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args,Number(limit),offset).map(safeProduct);
  res.json({products:rows,total:count,page:Number(page),pages:Math.ceil(count/Number(limit))});
});
app.get("/api/products/:idOrSlug",(req,res)=>{
  const p=db.prepare(`${productQuery} WHERE p.id=? OR p.slug=?`).get(req.params.idOrSlug,req.params.idOrSlug);
  if(!p)return res.status(404).json({error:"Product not found"});
  res.json(safeProduct(p));
});
app.get("/api/brands",(_,res)=>res.json(db.prepare("SELECT * FROM brands ORDER BY name").all()));

function ensureCart(userId){ let c=db.prepare("SELECT * FROM carts WHERE user_id=?").get(userId); if(!c){const x=db.prepare("INSERT INTO carts(user_id) VALUES(?)").run(userId);c={id:x.lastInsertRowid,user_id:userId};} return c; }
app.get("/api/cart",auth(),(req,res)=>{
  const c=ensureCart(req.user.id);
  const items=db.prepare(`SELECT ci.id,ci.quantity,p.* FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=?`).all(c.id).map(x=>({...safeProduct(x),item_id:x.id}));
  res.json({items});
});
app.post("/api/cart",auth(),(req,res)=>{
  const {productId,quantity=1}=req.body; const p=db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(productId);
  if(!p)return res.status(404).json({error:"Product unavailable"});
  if(quantity<1 || quantity>p.stock)return res.status(400).json({error:"Requested quantity unavailable"});
  const c=ensureCart(req.user.id);
  db.prepare("INSERT INTO cart_items(cart_id,product_id,quantity) VALUES(?,?,?) ON CONFLICT(cart_id,product_id) DO UPDATE SET quantity=excluded.quantity").run(c.id,productId,quantity);
  res.json({message:"Added to cart"});
});
app.put("/api/cart/:itemId",auth(),(req,res)=>{
  const q=Math.max(1,Number(req.body.quantity||1));
  const row=db.prepare(`SELECT ci.*,p.stock FROM cart_items ci JOIN carts c ON c.id=ci.cart_id JOIN products p ON p.id=ci.product_id WHERE ci.id=? AND c.user_id=?`).get(req.params.itemId,req.user.id);
  if(!row)return res.status(404).json({error:"Cart item not found"});
  if(q>row.stock)return res.status(400).json({error:"Not enough stock"});
  db.prepare("UPDATE cart_items SET quantity=? WHERE id=?").run(q,row.id);res.json({message:"Cart updated"});
});
app.delete("/api/cart/:itemId",auth(),(req,res)=>{
  db.prepare("DELETE FROM cart_items WHERE id IN (SELECT ci.id FROM cart_items ci JOIN carts c ON c.id=ci.cart_id WHERE ci.id=? AND c.user_id=?)").run(req.params.itemId,req.user.id);res.json({message:"Removed"});
});

app.get("/api/wishlist",auth(),(req,res)=>{
  let w=db.prepare("SELECT * FROM wishlists WHERE user_id=?").get(req.user.id);
  if(!w){const x=db.prepare("INSERT INTO wishlists(user_id) VALUES(?)").run(req.user.id);w={id:x.lastInsertRowid};}
  res.json(db.prepare(`SELECT p.* FROM wishlist_items wi JOIN products p ON p.id=wi.product_id WHERE wi.wishlist_id=?`).all(w.id).map(safeProduct));
});
app.post("/api/wishlist/:productId",auth(),(req,res)=>{
  let w=db.prepare("SELECT * FROM wishlists WHERE user_id=?").get(req.user.id); if(!w){const x=db.prepare("INSERT INTO wishlists(user_id) VALUES(?)").run(req.user.id);w={id:x.lastInsertRowid};}
  const exists=db.prepare("SELECT id FROM wishlist_items WHERE wishlist_id=? AND product_id=?").get(w.id,req.params.productId);
  if(exists) db.prepare("DELETE FROM wishlist_items WHERE id=?").run(exists.id); else db.prepare("INSERT INTO wishlist_items(wishlist_id,product_id) VALUES(?,?)").run(w.id,req.params.productId);
  res.json({liked:!exists});
});

app.get("/api/addresses",auth(),(req,res)=>res.json(db.prepare("SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC,id DESC").all(req.user.id)));
app.post("/api/addresses",auth(),(req,res)=>{
  const a=z.object({full_name:z.string().min(2),phone:z.string().min(8),line1:z.string().min(3),area:z.string().optional(),city:z.string(),state:z.string(),pincode:z.string().min(4),type:z.string().default("Home"),is_default:z.boolean().default(false)}).safeParse(req.body);
  if(!a.success)return res.status(400).json({error:"Invalid address"});
  if(a.data.is_default)db.prepare("UPDATE addresses SET is_default=0 WHERE user_id=?").run(req.user.id);
  const x=db.prepare("INSERT INTO addresses(user_id,full_name,phone,line1,area,city,state,pincode,type,is_default) VALUES(?,?,?,?,?,?,?,?,?,?)").run(req.user.id,a.data.full_name,a.data.phone,a.data.line1,a.data.area||"",a.data.city,a.data.state,a.data.pincode,a.data.type,a.data.is_default?1:0);
  res.json(db.prepare("SELECT * FROM addresses WHERE id=?").get(x.lastInsertRowid));
});

app.post("/api/coupons/apply",auth(),(req,res)=>{
  const code=String(req.body.code||"").toUpperCase(); const c=db.prepare("SELECT * FROM coupons WHERE code=? AND active=1").get(code);
  const subtotal=Number(req.body.subtotal||0);
  if(!c || (c.expires_at && new Date(c.expires_at)<new Date()) || subtotal<c.min_order)return res.status(400).json({error:"Coupon is invalid or not applicable"});
  const discount=c.type==="percent"?Math.min(subtotal,subtotal*c.value/100):Math.min(subtotal,c.value);
  res.json({code:c.code,discount});
});

app.post("/api/payment/create",auth(),async(req,res)=>{ const {amount,receipt}=req.body; res.json(await createPaymentOrder({amount,currency:"INR",receipt})); });
app.post("/api/payment/verify",auth(),async(req,res)=>res.json(await verifyPayment(req.body)));

app.post("/api/orders",auth(),(req,res)=>{
  const {addressId,paymentMethod="COD",couponCode}=req.body;
  const address=db.prepare("SELECT * FROM addresses WHERE id=? AND user_id=?").get(addressId,req.user.id);
  if(!address)return res.status(400).json({error:"Select a valid address"});
  const c=ensureCart(req.user.id);
  const items=db.prepare(`SELECT ci.*,p.name,p.price,p.stock FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=?`).all(c.id);
  if(!items.length)return res.status(400).json({error:"Your cart is empty"});
  if(items.some(i=>i.quantity>i.stock))return res.status(400).json({error:"One or more items are out of stock"});
  const subtotal=items.reduce((s,i)=>s+i.price*i.quantity,0);
  let discount=0;
  if(couponCode){const cp=db.prepare("SELECT * FROM coupons WHERE code=? AND active=1").get(String(couponCode).toUpperCase()); if(cp && subtotal>=cp.min_order)discount=cp.type==="percent"?subtotal*cp.value/100:cp.value;}
  const shipping=subtotal-discount>=999?0:79; const tax=Math.round((subtotal-discount)*0.05); const total=Math.max(0,subtotal-discount+shipping+tax);
  if(paymentMethod==="COD" && total>Number(process.env.COD_MAX||100000))return res.status(400).json({error:"COD is unavailable for this order amount"});
  const orderNumber=`ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const tx=db.transaction(()=>{
    const x=db.prepare("INSERT INTO orders(order_number,user_id,address_json,subtotal,discount,shipping,tax,total,payment_method,payment_status,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(orderNumber,req.user.id,JSON.stringify(address),subtotal,discount,shipping,tax,total,paymentMethod,paymentMethod==="COD"?"pending":"paid","Order Placed");
    for(const i of items){db.prepare("INSERT INTO order_items(order_id,product_id,product_name,price,quantity) VALUES(?,?,?,?,?)").run(x.lastInsertRowid,i.product_id,i.name,i.price,i.quantity);db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(i.quantity,i.product_id);}
    db.prepare("DELETE FROM cart_items WHERE cart_id=?").run(c.id);
    db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)").run(req.user.id,"Order placed",`Your order ${orderNumber} has been placed.`);
    return x.lastInsertRowid;
  });
  const id=tx();res.json({order:db.prepare("SELECT * FROM orders WHERE id=?").get(id)});
});

app.get("/api/orders",auth(),(req,res)=>{
  const orders=db.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC").all(req.user.id).map(o=>({...o,items:db.prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id)}));res.json(orders);
});
app.get("/api/orders/:id",auth(),(req,res)=>{
  const o=db.prepare("SELECT * FROM orders WHERE id=? AND user_id=?").get(req.params.id,req.user.id); if(!o)return res.status(404).json({error:"Order not found"});
  res.json({...o,address:JSON.parse(o.address_json),items:db.prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id)});
});

app.post("/api/reviews",auth(),(req,res)=>{
  const {productId,rating,body}=req.body; const r=Number(rating); if(r<1||r>5)return res.status(400).json({error:"Rating must be 1-5"});
  const bought=db.prepare(`SELECT oi.id FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.user_id=? AND oi.product_id=? AND o.status='Delivered' LIMIT 1`).get(req.user.id,productId);
  db.prepare("INSERT INTO reviews(user_id,product_id,rating,body,verified) VALUES(?,?,?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET rating=excluded.rating,body=excluded.body").run(req.user.id,productId,r,body||"",bought?1:0);
  const avg=db.prepare("SELECT AVG(rating) avg,COUNT(*) n FROM reviews WHERE product_id=? AND approved=1").get(productId);
  db.prepare("UPDATE products SET rating=?,review_count=? WHERE id=?").run(avg.avg,avg.n,productId);
  res.json({message:"Review saved"});
});

app.get("/api/admin/dashboard",auth(),adminOnly,(req,res)=>{
  const sales=db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE payment_status IN ('paid','pending')").get().n;
  const orders=db.prepare("SELECT COUNT(*) n FROM orders").get().n;
  const customers=db.prepare("SELECT COUNT(*) n FROM users WHERE role='customer'").get().n;
  const products=db.prepare("SELECT COUNT(*) n FROM products WHERE active=1").get().n;
  const low=db.prepare("SELECT COUNT(*) n FROM products WHERE stock<=low_stock_threshold").get().n;
  const byStatus=db.prepare("SELECT status,COUNT(*) count FROM orders GROUP BY status").all();
  const byCat=db.prepare(`SELECT c.name,COALESCE(SUM(oi.price*oi.quantity),0) revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id JOIN categories c ON c.id=p.category_id GROUP BY c.id ORDER BY revenue DESC LIMIT 8`).all();
  res.json({sales,orders,customers,products,low,byStatus,byCat});
});
app.get("/api/admin/products",auth(),adminOnly,(req,res)=>res.json(db.prepare(`${productQuery} ORDER BY p.created_at DESC`).all().map(safeProduct)));
app.post("/api/admin/products",auth(),adminOnly,(req,res)=>{
  const p=req.body; const cat=db.prepare("SELECT id FROM categories WHERE slug=? OR name=?").get(p.category,p.category); const brand=db.prepare("SELECT id FROM brands WHERE slug=? OR name=?").get(p.brand,p.brand);
  const slug=String(p.name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const x=db.prepare("INSERT INTO products(name,slug,brand_id,category_id,description,price,mrp,stock,sku,image,specs) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(p.name,slug,brand?.id,cat?.id,p.description||"",Number(p.price),Number(p.mrp||p.price),Number(p.stock||0),p.sku||`SKU-${Date.now()}`,p.image||"data:image/svg+xml,",JSON.stringify(p.specs||{}));
  res.json(db.prepare(`${productQuery} WHERE p.id=?`).get(x.lastInsertRowid));
});
app.put("/api/admin/products/:id",auth(),adminOnly,(req,res)=>{
  const p=req.body; db.prepare("UPDATE products SET name=?,price=?,mrp=?,stock=?,active=?,description=? WHERE id=?").run(p.name,Number(p.price),Number(p.mrp),Number(p.stock),p.active?1:0,p.description||"",req.params.id);res.json({message:"Updated"});
});
app.delete("/api/admin/products/:id",auth(),adminOnly,(req,res)=>{db.prepare("UPDATE products SET active=0 WHERE id=?").run(req.params.id);res.json({message:"Archived"});});
app.get("/api/admin/orders",auth(),adminOnly,(req,res)=>res.json(db.prepare(`SELECT o.*,u.name customer,u.email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC`).all()));
app.put("/api/admin/orders/:id",auth(),adminOnly,(req,res)=>{const allowed=["Order Placed","Payment Confirmed","Processing","Packed","Shipped","Out for Delivery","Delivered","Cancelled","Return Requested","Return Approved","Refunded"];if(!allowed.includes(req.body.status))return res.status(400).json({error:"Invalid status"});db.prepare("UPDATE orders SET status=?,tracking_number=? WHERE id=?").run(req.body.status,req.body.tracking_number||null,req.params.id);res.json({message:"Order updated"});});
app.get("/api/admin/customers",auth(),adminOnly,(req,res)=>res.json(db.prepare(`SELECT u.id,u.name,u.email,u.phone,u.status,u.created_at,COUNT(o.id) orders,COALESCE(SUM(o.total),0) spending FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.created_at DESC`).all()));

app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:"Something went wrong"});});
app.listen(port,()=>console.log(`Buywi API running on http://localhost:${port}`));
