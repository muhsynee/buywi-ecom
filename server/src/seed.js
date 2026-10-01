import db from "./db.js";
import { hashPassword } from "./auth.js";

const categories = [
  ["Electronics","electronics"],["Mobiles","mobiles"],["Computers","computers"],["Fashion","fashion"],
  ["Home & Kitchen","home-kitchen"],["Beauty","beauty"],["Toys & Games","toys-games"],["Sports","sports"],
  ["Books","books"],["Gaming","gaming"],["Grocery","grocery"],["Accessories","accessories"],
  ["Smart Home","smart-home"],["TV & Entertainment","tv-entertainment"]
];
const brands = ["NovaTech","Auralux","PixelForge","UrbanWeave","HomeNest","GlowLab","PlayPeak","Stride","GameCore","DailyFresh","VIOVI"];

const img = (label, hue=220) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="hsl(${hue},70%,28%)"/><stop offset="1" stop-color="hsl(${(hue+55)%360},80%,55%)"/></linearGradient></defs><rect width="900" height="700" rx="48" fill="url(#g)"/><circle cx="710" cy="150" r="180" fill="white" opacity=".12"/><circle cx="120" cy="580" r="220" fill="white" opacity=".08"/><text x="450" y="355" fill="white" font-family="Arial" font-size="52" text-anchor="middle" font-weight="700">${label}</text><text x="450" y="415" fill="white" opacity=".8" font-family="Arial" font-size="22" text-anchor="middle">BUYWI COLLECTION</text></svg>`)}`;

for (const [name, slug] of categories) {
  db.prepare("INSERT OR IGNORE INTO categories(name,slug,image) VALUES(?,?,?)").run(name, slug, img(name, 190 + categories.findIndex(c=>c[1]===slug)*11));
}
for (const name of brands) {
  db.prepare("INSERT OR IGNORE INTO brands(name,slug) VALUES(?,?)").run(name, name.toLowerCase().replace(/\s+/g,"-"));
}

const adminHash = await hashPassword("Admin@12345");
const custHash = await hashPassword("Customer@12345");
db.prepare("INSERT OR IGNORE INTO users(name,email,password_hash,role) VALUES(?,?,?,?)").run("Buywi Admin","admin@buywi.local",adminHash,"admin");
db.prepare("INSERT OR IGNORE INTO users(name,email,password_hash,phone) VALUES(?,?,?,?)").run("Demo Customer","customer@buywi.local",custHash,"9876543210");

const productNames = [
  ["NovaTech X1 Pro Smartphone","Mobiles",32999,44999],["Auralux ANC Headphones","Electronics",4999,7999],
  ["PixelForge Air Laptop 14","Computers",58999,69999],["NovaTech Smart TV 55 4K","TV & Entertainment",39999,52999],
  ["UrbanWeave Essential Hoodie","Fashion",1499,2499],["UrbanWeave Everyday Sneakers","Fashion",2299,3499],
  ["HomeNest Air Fryer 5L","Home & Kitchen",4499,6499],["GlowLab Vitamin C Serum","Beauty",699,999],
  ["PlayPeak Remote Control Racer","Toys & Games",1299,1999],["Stride Pro Yoga Mat","Sports",999,1599],
  ["GameCore RGB Mechanical Keyboard","Gaming",2999,4499],["Auralux Wireless Earbuds","Electronics",2499,3999],
  ["NovaTech Smart Watch S2","Accessories",3499,5999],["HomeNest Mixer Grinder","Home & Kitchen",3299,4999],
  ["DailyFresh Premium Coffee","Grocery",549,699],["PixelForge USB-C Hub","Computers",1799,2699],
  ["UrbanWeave Linen Shirt","Fashion",1799,2799],["PlayPeak Building Blocks","Toys & Games",899,1299],
  ["Stride Resistance Bands","Sports",799,1199],["GameCore Gaming Mouse","Gaming",1499,2299],
  ["GlowLab Face Wash","Beauty",399,599],["NovaTech Power Bank 20000mAh","Accessories",1699,2499],
  ["HomeNest Smart Bulb","Smart Home",699,999],["Auralux Bluetooth Speaker","Electronics",2199,3299],
  ["PixelForge 27-inch Monitor","Computers",16999,21999],["NovaTech Tablet 11","Mobiles",21999,27999],
  ["UrbanWeave Kids Jacket","Fashion",1299,1999],["HomeNest Nonstick Cookware Set","Home & Kitchen",2499,3999],
  ["PlayPeak Plush Bear","Toys & Games",699,999],["Stride Running Bottle","Sports",499,799],
  ["GameCore Console Cooling Stand","Gaming",1899,2999],["GlowLab Sunscreen SPF50","Beauty",599,899],
  ["DailyFresh Almonds 500g","Grocery",499,599],["DailyFresh Green Tea","Grocery",349,449],
  ["PixelForge SSD 1TB","Computers",6499,7999],["NovaTech Phone Case","Accessories",499,799],
  ["Auralux Type-C Earphones","Electronics",799,1199],["HomeNest LED Desk Lamp","Smart Home",999,1499],
  ["PlayPeak Puzzle 1000pc","Toys & Games",899,1299],["Stride Dumbbell Pair 5kg","Sports",1999,2799],
  ["GameCore Controller","Gaming",2999,3999],["UrbanWeave Denim Jeans","Fashion",1999,2999],
  ["GlowLab Body Lotion","Beauty",499,699],["HomeNest Storage Organizer","Home & Kitchen",699,999],
  ["NovaTech Smart Door Sensor","Smart Home",1199,1699],["Auralux Soundbar","TV & Entertainment",6999,9999],
  ["PixelForge Webcam 1080p","Computers",2299,3299],["UrbanWeave Crossbody Bag","Accessories",1199,1899],
  ["PlayPeak STEM Science Kit","Toys & Games",1599,2299],["Stride Foam Roller","Sports",899,1299],
  ["DailyFresh Oats 1kg","Grocery",249,329],["NovaTech Mini Projector","TV & Entertainment",7999,10999],
  ["GameCore Gaming Headset","Gaming",2499,3499],["GlowLab Lip Care Set","Beauty",599,799],
  ["HomeNest Electric Kettle","Home & Kitchen",1299,1899],["Auralux Smart Speaker","Smart Home",3499,4999],
  ["PixelForge Wireless Keyboard","Computers",1599,2399],["UrbanWeave Cotton Kurta","Fashion",1399,2199],
  ["Stride Skipping Rope","Sports",399,599],["PlayPeak Board Game","Toys & Games",999,1499],
  ["DailyFresh Honey 500g","Grocery",399,499],["NovaTech Fast Charger","Accessories",999,1499],
  ["Auralux Studio Mic","Gaming",4499,5999],["HomeNest Robot Vacuum","Smart Home",15999,21999],
  ["PixelForge Gaming Monitor","Gaming",24999,32999],["UrbanWeave Tote Bag","Fashion",799,1199],
  ["GlowLab Hair Serum","Beauty",649,899],["DailyFresh Granola","Grocery",499,649],
  ["NovaTech 4K Action Camera","Electronics",8999,11999],["PlayPeak RC Drone","Toys & Games",4999,6999],
  ["Stride Sports Cap","Sports",599,899],["HomeNest Water Purifier","Home & Kitchen",12999,16999],
  ["Auralux Premium Earbuds","Electronics",6999,8999],["PixelForge Mini PC","Computers",29999,37999],
  ["UrbanWeave Oversized Tee","Fashion",899,1299],["GlowLab Clay Mask","Beauty",549,799],
  ["DailyFresh Cashews 500g","Grocery",549,699],["NovaTech Smart Plug","Smart Home",799,1199],
  ["GameCore Stream Deck","Gaming",6999,8999],["HomeNest Sandwich Maker","Home & Kitchen",1799,2499],
  ["VIOVI COB LED Torch Light Key Chain","Home & Kitchen",199,978]
];

const catMap = Object.fromEntries(db.prepare("SELECT id,name FROM categories").all().map(x=>[x.name,x.id]));
const brandMap = Object.fromEntries(db.prepare("SELECT id,name FROM brands").all().map(x=>[x.name,x.id]));
const insert = db.prepare(`INSERT OR IGNORE INTO products(name,slug,brand_id,category_id,description,price,mrp,rating,review_count,stock,low_stock_threshold,sku,image,featured,trending,bestseller,specs) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (let i=0;i<productNames.length;i++) {
  const [name,cat,price,mrp] = productNames[i];
  const brand = name.includes("VIOVI") ? "VIOVI" : brands[i % brands.length];
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const productImg = name.includes("VIOVI")
    ? "https://cdn2.shopclues.com/images1/thumbnails/118621/320/320/153768896-118621663-1789735158.jpg"
    : img(name.slice(0,22),190+(i*17)%150);
  const specs = name.includes("VIOVI")
    ? JSON.stringify({ "Type": "Rechargeable COB LED Keychain Light", "Brightness": "500 Lumens", "Charging": "Type-C USB", "Special": "Magnet Base & Bottle Opener", "Country": "India" })
    : JSON.stringify({ Color: "Midnight", Warranty: "1 Year", Country: "India" });
  insert.run(name,slug,brandMap[brand],catMap[cat],`Premium ${name} designed for everyday performance, comfort and value.`,price,mrp,(4+(i%10)/10),25+(i%70),5+(i%40),5,`SKU-${String(i+1).padStart(5,"0")}`,productImg,i<12||name.includes("VIOVI")?1:0,i%3===0?1:0,i%4===0||name.includes("VIOVI")?1:0,specs);
}
db.prepare("INSERT OR IGNORE INTO coupons(code,type,value,min_order) VALUES('WELCOME10','percent',10,999)").run();
db.prepare("INSERT OR IGNORE INTO coupons(code,type,value,min_order) VALUES('SAVE500','fixed',500,4999)").run();
db.prepare("INSERT OR IGNORE INTO banners(title,subtitle,cta,image,sort_order) VALUES('Big Electronics Sale','Up to 60% off on smart upgrades','Shop Electronics',?,1)").run(img("BIG SALE",220));
db.prepare("INSERT OR IGNORE INTO banners(title,subtitle,cta,image,sort_order) VALUES('Everyday Fashion','Fresh styles from ₹799','Explore Fashion',?,2)").run(img("FASHION",320));
console.log("Seed complete.");
