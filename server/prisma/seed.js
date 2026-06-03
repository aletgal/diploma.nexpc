'use strict'

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Products — Ready-built PCs (prices in KZT)
// ---------------------------------------------------------------------------
const products = [
  {
    name: 'NEX Starter Pro',
    description:
      'A balanced entry-level gaming PC built for smooth 1080p performance. Handles modern titles at high settings without breaking the bank.',
    price: 360000,
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80'],
    category: 'READY_PC',
    stock: 12,
    featured: true,
    specs: {
      CPU: 'AMD Ryzen 5 5600',
      GPU: 'NVIDIA RTX 3060 12GB',
      RAM: '16GB DDR4-3200',
      Storage: '512GB NVMe SSD',
      Motherboard: 'B550 ATX',
      PSU: '650W 80+ Bronze',
      Case: 'Mid-Tower ATX',
      OS: 'Windows 11 Home',
    },
  },
  {
    name: 'NEX Apex 4K',
    description:
      'Our flagship 4K gaming rig. Drives ultra-high-resolution displays with ease and handles demanding creative workloads alongside gaming.',
    price: 1125000,
    images: ['https://images.unsplash.com/photo-1593640408182-31c228f5d4d2?w=800&q=80'],
    category: 'READY_PC',
    stock: 5,
    featured: true,
    specs: {
      CPU: 'Intel Core i9-14900K',
      GPU: 'NVIDIA RTX 4090 24GB',
      RAM: '64GB DDR5-6000',
      Storage: '2TB NVMe Gen4 SSD',
      Motherboard: 'Z790 ATX',
      PSU: '1000W 80+ Platinum',
      Case: 'Full-Tower E-ATX',
      Cooling: '360mm AIO Liquid',
      OS: 'Windows 11 Pro',
    },
  },
  {
    name: 'NEX Creator Studio',
    description:
      'Optimised for video editing, 3D rendering, and content creation. Massive thread count and memory bandwidth for professional workloads.',
    price: 900000,
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80'],
    category: 'READY_PC',
    stock: 8,
    featured: true,
    specs: {
      CPU: 'AMD Ryzen 9 7950X',
      GPU: 'NVIDIA RTX 4080 16GB',
      RAM: '128GB DDR5-5200',
      Storage: '4TB NVMe Gen4 SSD + 8TB HDD',
      Motherboard: 'X670E ATX',
      PSU: '850W 80+ Gold',
      Case: 'Full-Tower',
      Cooling: '280mm AIO Liquid',
      OS: 'Windows 11 Pro',
    },
  },
  {
    name: 'NEX Compact X',
    description:
      'Full desktop power in a tiny form factor. Perfect for LAN parties, dorm rooms, or minimalist setups that refuse to sacrifice performance.',
    price: 562500,
    images: ['https://images.unsplash.com/photo-1563770557593-5a3e6e04a26d?w=800&q=80'],
    category: 'READY_PC',
    stock: 10,
    featured: false,
    specs: {
      CPU: 'AMD Ryzen 7 7700X',
      GPU: 'NVIDIA RTX 4070 12GB',
      RAM: '32GB DDR5-5600',
      Storage: '1TB NVMe SSD',
      Motherboard: 'B650 Mini-ITX',
      PSU: '750W SFX 80+ Gold',
      Case: 'Mini-ITX',
      OS: 'Windows 11 Home',
    },
  },
  {
    name: 'NEX Office Elite',
    description:
      'A silent, efficient workstation for productivity. Handles multitasking, video calls, and office applications without a hint of fan noise.',
    price: 292500,
    images: ['https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80'],
    category: 'READY_PC',
    stock: 20,
    featured: false,
    specs: {
      CPU: 'Intel Core i5-13400',
      GPU: 'Intel UHD 730 (integrated)',
      RAM: '16GB DDR4-3200',
      Storage: '512GB NVMe SSD',
      Motherboard: 'H770 Micro-ATX',
      PSU: '450W 80+ Bronze',
      Case: 'Micro-ATX Tower',
      OS: 'Windows 11 Home',
    },
  },
  {
    name: 'NEX Mid-Range Champion',
    description:
      'The sweet spot for 1440p gaming. Exceptional price-to-performance that demolishes titles at high refresh rates.',
    price: 517500,
    images: ['https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80'],
    category: 'READY_PC',
    stock: 15,
    featured: true,
    specs: {
      CPU: 'AMD Ryzen 7 5800X3D',
      GPU: 'AMD Radeon RX 7800 XT 16GB',
      RAM: '32GB DDR4-3600',
      Storage: '1TB NVMe SSD',
      Motherboard: 'X570 ATX',
      PSU: '750W 80+ Gold',
      Case: 'Mid-Tower ATX',
      OS: 'Windows 11 Home',
    },
  },
  {
    name: 'NEX Silent Workstation',
    description:
      'Fanless chassis design keeps noise at zero. Ideal for studios, medical, and home-office environments where silence is critical.',
    price: 675000,
    images: ['https://images.unsplash.com/photo-1602837385569-0bb04f5bb1da?w=800&q=80'],
    category: 'READY_PC',
    stock: 6,
    featured: false,
    specs: {
      CPU: 'Intel Core i7-13700T',
      GPU: 'NVIDIA RTX 4060 8GB',
      RAM: '64GB DDR5-4800',
      Storage: '2TB NVMe SSD',
      Motherboard: 'B760 Micro-ATX',
      PSU: '500W Fanless 80+ Platinum',
      Case: 'Fanless Steel Chassis',
      OS: 'Windows 11 Pro',
    },
  },
  {
    name: 'NEX Budget Blaster',
    description:
      'Maximum value for eSports gaming. Crushes Valorant, CS2, Fortnite, and Apex at 144Hz+ on a shoestring budget.',
    price: 225000,
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    category: 'READY_PC',
    stock: 25,
    featured: false,
    specs: {
      CPU: 'AMD Ryzen 5 5500',
      GPU: 'AMD Radeon RX 6600 8GB',
      RAM: '8GB DDR4-3200',
      Storage: '256GB NVMe SSD',
      Motherboard: 'B450 Micro-ATX',
      PSU: '550W 80+ Bronze',
      Case: 'Micro-ATX Tower',
      OS: 'Windows 11 Home',
    },
  },
]

// ---------------------------------------------------------------------------
// Components — individual parts (prices in KZT)
// Keys are used below for product-component linking
// ---------------------------------------------------------------------------
const componentDefs = {
  // GPUs
  gpu_rtx4090: {
    name: 'ASUS ROG Strix RTX 4090 OC',
    category: 'GPU',
    manufacturer: 'ASUS',
    model: 'ROG Strix RTX 4090 OC',
    color: 'Black',
    price: 540000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400',
    images: ['https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&q=80'],
    specs: {},
    specData: {
      coreClock: '2640 MHz',
      memoryClock: '21 Gbps',
      memoryType: 'GDDR6X',
      memorySize: '24GB',
      dimensions: '357 x 149 x 75 mm',
    },
  },
  gpu_rtx4080s: {
    name: 'MSI Gaming X Trio RTX 4080 Super',
    category: 'GPU',
    manufacturer: 'MSI',
    model: 'Gaming X Trio RTX 4080 Super',
    color: 'Black/Red',
    price: 380000,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400',
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80'],
    specs: {},
    specData: {
      coreClock: '2610 MHz',
      memoryClock: '23 Gbps',
      memoryType: 'GDDR6X',
      memorySize: '16GB',
      dimensions: '337 x 140 x 60 mm',
    },
  },
  gpu_rtx4070ti: {
    name: 'Gigabyte RTX 4070 Ti Gaming OC',
    category: 'GPU',
    manufacturer: 'Gigabyte',
    model: 'RTX 4070 Ti Gaming OC',
    color: 'Black',
    price: 270000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400',
    images: ['https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&q=80'],
    specs: {},
    specData: {
      coreClock: '2640 MHz',
      memoryClock: '21 Gbps',
      memoryType: 'GDDR6X',
      memorySize: '12GB',
      dimensions: '336 x 135 x 58 mm',
    },
  },
  gpu_rx7900xtx: {
    name: 'Sapphire Pulse RX 7900 XTX',
    category: 'GPU',
    manufacturer: 'Sapphire',
    model: 'Pulse RX 7900 XTX',
    color: 'Black/Silver',
    price: 350000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400',
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80'],
    specs: {},
    specData: {
      coreClock: '2500 MHz',
      memoryClock: '20 Gbps',
      memoryType: 'GDDR6',
      memorySize: '24GB',
      dimensions: '322 x 123 x 44 mm',
    },
  },
  gpu_rtx4060: {
    name: 'ASUS Dual RTX 4060 OC',
    category: 'GPU',
    manufacturer: 'ASUS',
    model: 'Dual RTX 4060 OC',
    color: 'White',
    price: 135000,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400',
    images: ['https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&q=80'],
    specs: {},
    specData: {
      coreClock: '2535 MHz',
      memoryClock: '17 Gbps',
      memoryType: 'GDDR6',
      memorySize: '8GB',
      dimensions: '240 x 124 x 40 mm',
    },
  },

  // CPUs
  cpu_r9_7950x: {
    name: 'AMD Ryzen 9 7950X',
    category: 'CPU',
    manufacturer: 'AMD',
    model: 'Ryzen 9 7950X',
    color: 'Silver',
    price: 180000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1555617778-02518510b9d5?w=400',
    images: ['https://images.unsplash.com/photo-1555617778-02518510b9d5?w=800&q=80'],
    specs: {},
    specData: {
      socket: 'AM5',
      baseClock: '4.5 GHz',
      boostClock: '5.7 GHz',
      cores: 16,
      l3Cache: '64MB',
      tdp: '170W',
      integratedGraphics: false,
    },
  },
  cpu_i9_14900k: {
    name: 'Intel Core i9-14900K',
    category: 'CPU',
    manufacturer: 'Intel',
    model: 'Core i9-14900K',
    color: 'Silver',
    price: 190000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1555617778-02518510b9d5?w=400',
    images: ['https://images.unsplash.com/photo-1555617778-02518510b9d5?w=800&q=80'],
    specs: {},
    specData: {
      socket: 'LGA1700',
      baseClock: '3.2 GHz',
      boostClock: '6.0 GHz',
      cores: 24,
      l3Cache: '36MB',
      tdp: '125W',
      integratedGraphics: true,
    },
  },
  cpu_r7_7700x: {
    name: 'AMD Ryzen 7 7700X',
    category: 'CPU',
    manufacturer: 'AMD',
    model: 'Ryzen 7 7700X',
    color: 'Silver',
    price: 120000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1555617778-02518510b9d5?w=400',
    images: ['https://images.unsplash.com/photo-1555617778-02518510b9d5?w=800&q=80'],
    specs: {},
    specData: {
      socket: 'AM5',
      baseClock: '4.5 GHz',
      boostClock: '5.4 GHz',
      cores: 8,
      l3Cache: '32MB',
      tdp: '105W',
      integratedGraphics: false,
    },
  },
  cpu_i5_13600k: {
    name: 'Intel Core i5-13600K',
    category: 'CPU',
    manufacturer: 'Intel',
    model: 'Core i5-13600K',
    color: 'Silver',
    price: 90000,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1555617778-02518510b9d5?w=400',
    images: ['https://images.unsplash.com/photo-1555617778-02518510b9d5?w=800&q=80'],
    specs: {},
    specData: {
      socket: 'LGA1700',
      baseClock: '3.5 GHz',
      boostClock: '5.1 GHz',
      cores: 14,
      l3Cache: '24MB',
      tdp: '125W',
      integratedGraphics: true,
    },
  },
  cpu_r5_7600x: {
    name: 'AMD Ryzen 5 7600X',
    category: 'CPU',
    manufacturer: 'AMD',
    model: 'Ryzen 5 7600X',
    color: 'Silver',
    price: 75000,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1555617778-02518510b9d5?w=400',
    images: ['https://images.unsplash.com/photo-1555617778-02518510b9d5?w=800&q=80'],
    specs: {},
    specData: {
      socket: 'AM5',
      baseClock: '4.7 GHz',
      boostClock: '5.3 GHz',
      cores: 6,
      l3Cache: '32MB',
      tdp: '105W',
      integratedGraphics: false,
    },
  },

  // Motherboards
  mb_x670e_hero: {
    name: 'ASUS ROG Crosshair X670E Hero',
    category: 'MOTHERBOARD',
    manufacturer: 'ASUS',
    model: 'ROG Crosshair X670E Hero',
    color: 'Black',
    price: 135000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    specs: {},
    specData: {
      chipset: 'X670E',
      socket: 'AM5',
      slots: 4,
      formFactor: 'ATX',
      ramSlots: 4,
      maxRamSpeed: 'DDR5-6400',
      supportedRamType: 'DDR5',
    },
  },
  mb_b650_tomahawk: {
    name: 'MSI MAG B650 Tomahawk',
    category: 'MOTHERBOARD',
    manufacturer: 'MSI',
    model: 'MAG B650 Tomahawk',
    color: 'Black',
    price: 72000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    specs: {},
    specData: {
      chipset: 'B650',
      socket: 'AM5',
      formFactor: 'ATX',
      slots: 4,
      ramSlots: 4,
      maxRamSpeed: 'DDR5-6000',
      supportedRamType: 'DDR5',
    },
  },
  mb_z790_hero: {
    name: 'ASUS ROG Maximus Z790 Hero',
    category: 'MOTHERBOARD',
    manufacturer: 'ASUS',
    model: 'ROG Maximus Z790 Hero',
    color: 'Black',
    price: 162000,
    stock: 6,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    specs: {},
    specData: {
      chipset: 'Z790',
      socket: 'LGA1700',
      formFactor: 'ATX',
      slots: 4,
      ramSlots: 4,
      maxRamSpeed: 'DDR5-6400',
      supportedRamType: 'DDR5',
    },
  },
  mb_b760m_ds3h: {
    name: 'Gigabyte B760M DS3H',
    category: 'MOTHERBOARD',
    manufacturer: 'Gigabyte',
    model: 'B760M DS3H',
    color: 'Black',
    price: 36000,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    specs: {},
    specData: {
      chipset: 'B760',
      socket: 'LGA1700',
      formFactor: 'mATX',
      slots: 2,
      ramSlots: 2,
      maxRamSpeed: 'DDR4-3200',
      supportedRamType: 'DDR4',
    },
  },
  mb_x870e_hero: {
    name: 'ASUS ROG Crosshair X870E Hero',
    category: 'MOTHERBOARD',
    manufacturer: 'ASUS',
    model: 'ROG Crosshair X870E Hero',
    color: 'Black',
    price: 162000,
    stock: 6,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    specs: {},
    specData: {
      chipset: 'X870E',
      socket: 'AM5',
      formFactor: 'ATX',
      slots: 4,
      ramSlots: 4,
      maxRamSpeed: 'DDR5-6400',
      supportedRamType: 'DDR5',
    },
  },
  mb_x870_tomahawk: {
    name: 'MSI MAG X870 Tomahawk WiFi',
    category: 'MOTHERBOARD',
    manufacturer: 'MSI',
    model: 'MAG X870 Tomahawk WiFi',
    color: 'Black',
    price: 90000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    specs: {},
    specData: {
      chipset: 'X870',
      socket: 'AM5',
      formFactor: 'ATX',
      slots: 4,
      ramSlots: 4,
      maxRamSpeed: 'DDR5-6000',
      supportedRamType: 'DDR5',
    },
  },
  mb_x870e_ace: {
    name: 'MSI MEG X870E Ace Max',
    category: 'MOTHERBOARD',
    manufacturer: 'MSI',
    model: 'MEG X870E Ace Max',
    color: 'Black',
    price: 225000,
    stock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    specs: {},
    specData: {
      chipset: 'X870E',
      socket: 'AM5',
      formFactor: 'ATX',
      slots: 4,
      ramSlots: 4,
      maxRamSpeed: 'DDR5-6400',
      supportedRamType: 'DDR5',
    },
  },
  mb_b850e_wifi: {
    name: 'ASUS TUF Gaming B850-E WiFi',
    category: 'MOTHERBOARD',
    manufacturer: 'ASUS',
    model: 'TUF Gaming B850-E WiFi',
    color: 'Black',
    price: 81000,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    specs: {},
    specData: {
      chipset: 'B850',
      socket: 'AM5',
      formFactor: 'ATX',
      slots: 4,
      ramSlots: 4,
      maxRamSpeed: 'DDR5-6400',
      supportedRamType: 'DDR5',
    },
  },

  // RAMs
  ram_corsair_dom_32: {
    name: 'Corsair Dominator Platinum DDR5-6000 32GB',
    category: 'RAM',
    manufacturer: 'Corsair',
    model: 'Dominator Platinum RGB',
    color: 'White',
    price: 72000,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400',
    images: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&q=80'],
    specs: {},
    specData: {
      memoryClock: '6000 MHz',
      memoryType: 'DDR5',
      memorySize: '32GB',
      kitSize: 2,
      stickSize: 16,
      timings: 'CL30',
      sticksInKit: 2,
    },
  },
  ram_gskill_trident_64: {
    name: 'G.Skill Trident Z5 DDR5-6400 64GB',
    category: 'RAM',
    manufacturer: 'G.Skill',
    model: 'Trident Z5 RGB',
    color: 'Black/Silver',
    price: 126000,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400',
    images: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&q=80'],
    specs: {},
    specData: {
      memoryClock: '6400 MHz',
      memoryType: 'DDR5',
      memorySize: '64GB',
      kitSize: 2,
      stickSize: 32,
      timings: 'CL32',
      sticksInKit: 2,
    },
  },
  ram_kingston_ddr4_32: {
    name: 'Kingston Fury Beast DDR4-3600 32GB',
    category: 'RAM',
    manufacturer: 'Kingston',
    model: 'Fury Beast',
    color: 'Black',
    price: 36000,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400',
    images: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&q=80'],
    specs: {},
    specData: {
      memoryClock: '3600 MHz',
      memoryType: 'DDR4',
      memorySize: '32GB',
      kitSize: 2,
      stickSize: 16,
      timings: 'CL18',
      sticksInKit: 2,
    },
  },
  ram_corsair_vengeance_16: {
    name: 'Corsair Vengeance DDR4-3200 16GB',
    category: 'RAM',
    manufacturer: 'Corsair',
    model: 'Vengeance LPX',
    color: 'Black',
    price: 18000,
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400',
    images: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&q=80'],
    specs: {},
    specData: {
      memoryClock: '3200 MHz',
      memoryType: 'DDR4',
      memorySize: '16GB',
      kitSize: 2,
      stickSize: 8,
      timings: 'CL16',
      sticksInKit: 2,
    },
  },

  // Cases
  case_o11_evo: {
    name: 'Lian Li O11 Dynamic EVO',
    category: 'CASE',
    manufacturer: 'Lian Li',
    model: 'O11 Dynamic EVO',
    color: 'Black',
    price: 54000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      formFactor: 'ATX',
      gpuLength: '420mm',
      radiatorSupport: '360mm, 240mm',
    },
  },
  case_fractal_north: {
    name: 'Fractal Design North',
    category: 'CASE',
    manufacturer: 'Fractal Design',
    model: 'North',
    color: 'Walnut/Black',
    price: 45000,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      formFactor: 'ATX',
      gpuLength: '355mm',
      radiatorSupport: '360mm, 240mm',
    },
  },
  case_nzxt_h9: {
    name: 'NZXT H9 Flow',
    category: 'CASE',
    manufacturer: 'NZXT',
    model: 'H9 Flow',
    color: 'White',
    price: 63000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      formFactor: 'ATX',
      gpuLength: '435mm',
      radiatorSupport: '360mm, 280mm, 240mm',
    },
  },
  case_nr200p: {
    name: 'Cooler Master NR200P',
    category: 'CASE',
    manufacturer: 'Cooler Master',
    model: 'NR200P',
    color: 'White',
    price: 36000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      formFactor: 'Mini-ITX',
      gpuLength: '330mm',
      radiatorSupport: '240mm',
    },
  },

  // PSUs
  psu_corsair_rm1000x: {
    name: 'Corsair RM1000x',
    category: 'PSU',
    manufacturer: 'Corsair',
    model: 'RM1000x',
    color: 'Black',
    price: 85500,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
    images: ['https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80'],
    specs: {},
    specData: {
      modularity: 'Full-Modular',
      power: '1000W',
      certificate: '80+ Gold',
    },
  },
  psu_seasonic_850: {
    name: 'Seasonic Focus GX-850',
    category: 'PSU',
    manufacturer: 'Seasonic',
    model: 'Focus GX-850',
    color: 'Black',
    price: 63000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
    images: ['https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80'],
    specs: {},
    specData: {
      modularity: 'Full-Modular',
      power: '850W',
      certificate: '80+ Gold',
    },
  },
  psu_bequiet_750: {
    name: 'be quiet! Straight Power 11 750W',
    category: 'PSU',
    manufacturer: 'be quiet!',
    model: 'Straight Power 11',
    color: 'Black',
    price: 54000,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
    images: ['https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80'],
    specs: {},
    specData: {
      modularity: 'Full-Modular',
      power: '750W',
      certificate: '80+ Platinum',
    },
  },
  psu_evga_650: {
    name: 'EVGA SuperNOVA 650 G6',
    category: 'PSU',
    manufacturer: 'EVGA',
    model: 'SuperNOVA 650 G6',
    color: 'Black',
    price: 40500,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
    images: ['https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80'],
    specs: {},
    specData: {
      modularity: 'Full-Modular',
      power: '650W',
      certificate: '80+ Gold',
    },
  },
  psu_corsair_cx550f: {
    name: 'Corsair CX550F',
    category: 'PSU',
    manufacturer: 'Corsair',
    model: 'CX550F RGB',
    color: 'White',
    price: 27000,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
    images: ['https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80'],
    specs: {},
    specData: {
      modularity: 'Semi-Modular',
      power: '550W',
      certificate: '80+ Bronze',
    },
  },

  // Cooling
  cool_noctua_d15: {
    name: 'Noctua NH-D15',
    category: 'COOLING',
    manufacturer: 'Noctua',
    model: 'NH-D15',
    color: 'Brown/Black',
    price: 36000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400',
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80'],
    specs: {},
    specData: {
      socket: 'AM4, AM5, LGA1700, LGA1200',
      tdp: '250W',
      waterCooling: false,
    },
  },
  cool_corsair_h150i: {
    name: 'Corsair iCUE H150i Elite Capellix XT',
    category: 'COOLING',
    manufacturer: 'Corsair',
    model: 'iCUE H150i Elite Capellix XT',
    color: 'Black',
    price: 90000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400',
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80'],
    specs: {},
    specData: {
      socket: 'AM4, AM5, LGA1700, LGA1200',
      tdp: '300W',
      waterCooling: true,
    },
  },
  cool_arctic_240: {
    name: 'Arctic Liquid Freezer II 240',
    category: 'COOLING',
    manufacturer: 'Arctic',
    model: 'Liquid Freezer II 240',
    color: 'Black',
    price: 36000,
    stock: 18,
    imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400',
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80'],
    specs: {},
    specData: {
      socket: 'AM4, AM5, LGA1700, LGA1200',
      tdp: '250W',
      waterCooling: true,
    },
  },
  cool_deepcool_ak620: {
    name: 'DeepCool AK620',
    category: 'COOLING',
    manufacturer: 'DeepCool',
    model: 'AK620',
    color: 'Black',
    price: 22500,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400',
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80'],
    specs: {},
    specData: {
      socket: 'AM4, AM5, LGA1700, LGA1200',
      tdp: '260W',
      waterCooling: false,
    },
  },

  // Case Fans
  fan_bequiet_sw4_120: {
    name: 'Be Quiet! Silent Wings 4 120mm',
    category: 'FAN',
    manufacturer: 'Be Quiet!',
    model: 'Silent Wings 4 120mm',
    color: 'Black',
    price: 9000,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      dimensions: '120mm',
      noise: '15.4dB',
      rgb: false,
    },
  },

  fan_corsair_ll120: {
    name: 'Corsair LL120 RGB',
    category: 'FAN',
    manufacturer: 'Corsair',
    model: 'LL120 RGB',
    color: 'Black',
    price: 13500,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      dimensions: '120mm',
      noise: '25dB',
      rgb: true,
    },
  },

  fan_lianli_uni_140: {
    name: 'Lian Li UNI FAN SL140',
    category: 'FAN',
    manufacturer: 'Lian Li',
    model: 'UNI FAN SL140',
    color: 'Black',
    price: 18000,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      dimensions: '140mm',
      noise: '22dB',
      rgb: true,
    },
  },

  fan_noctua_nfa12x25: {
    name: 'Noctua NF-A12x25',
    category: 'FAN',
    manufacturer: 'Noctua',
    model: 'NF-A12x25',
    color: 'Brown',
    price: 13500,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      dimensions: '120mm',
      noise: '22.6dB',
      rgb: false,
    },
  },

  fan_arctic_p14: {
    name: 'Arctic P14 PWM',
    category: 'FAN',
    manufacturer: 'Arctic',
    model: 'P14 PWM',
    color: 'Black',
    price: 4500,
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      dimensions: '140mm',
      noise: '22.5dB',
      rgb: false,
    },
  },

  fan_corsair_ll120_3pack: {
    name: 'Corsair LL120 RGB 3-Pack',
    category: 'FAN',
    manufacturer: 'Corsair',
    model: 'LL120 RGB 3-Pack',
    color: 'Black',
    price: 36000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      dimensions: '120mm',
      noise: '25dB',
      rgb: true,
    },
  },

  fan_arctic_p14_3pack: {
    name: 'Arctic P14 PWM 3-Pack',
    category: 'FAN',
    manufacturer: 'Arctic',
    model: 'P14 PWM 3-Pack',
    color: 'Black',
    price: 11250,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      dimensions: '140mm',
      noise: '22.5dB',
      rgb: false,
    },
  },

  fan_noctua_nfa12_2pack: {
    name: 'Noctua NF-A12x25 2-Pack',
    category: 'FAN',
    manufacturer: 'Noctua',
    model: 'NF-A12x25 2-Pack',
    color: 'Brown',
    price: 25200,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400',
    images: ['https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=800&q=80'],
    specs: {},
    specData: {
      dimensions: '120mm',
      noise: '22.6dB',
      rgb: false,
    },
  },

  // Storage
  storage_samsung_990pro_2tb: {
    name: 'Samsung 990 Pro 2TB NVMe',
    category: 'STORAGE',
    manufacturer: 'Samsung',
    model: '990 Pro',
    color: 'Black',
    price: 54000,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&q=80'],
    specs: {},
    specData: {
      memoryType: 'NVMe',
      memorySize: '2TB',
      readSpeed: '7450 MB/s',
      writeSpeed: '6900 MB/s',
    },
  },
  storage_wd_sn850x_1tb: {
    name: 'WD Black SN850X 1TB',
    category: 'STORAGE',
    manufacturer: 'Western Digital',
    model: 'Black SN850X',
    color: 'Black',
    price: 36000,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&q=80'],
    specs: {},
    specData: {
      memoryType: 'NVMe',
      memorySize: '1TB',
      readSpeed: '7300 MB/s',
      writeSpeed: '6600 MB/s',
    },
  },
  storage_crucial_p3_500gb: {
    name: 'Crucial P3 Plus 500GB NVMe',
    category: 'STORAGE',
    manufacturer: 'Crucial',
    model: 'P3 Plus',
    color: 'Black',
    price: 20250,
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&q=80'],
    specs: {},
    specData: {
      memoryType: 'NVMe',
      memorySize: '500GB',
      readSpeed: '5000 MB/s',
      writeSpeed: '3600 MB/s',
    },
  },
  storage_seagate_barracuda_4tb: {
    name: 'Seagate Barracuda 4TB HDD',
    category: 'STORAGE',
    manufacturer: 'Seagate',
    model: 'Barracuda',
    color: 'Silver',
    price: 27000,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&q=80'],
    specs: {},
    specData: {
      memoryType: 'HDD',
      memorySize: '4TB',
      readSpeed: '190 MB/s',
      writeSpeed: '190 MB/s',
    },
  },
}

// ---------------------------------------------------------------------------
// Product → component links (by componentDefs key)
// ---------------------------------------------------------------------------
const productComponentLinks = {
  // NEX Starter Pro — Ryzen 5 5600 / RTX 3060 → closest matches
  'NEX Starter Pro': [
    'cpu_r5_7600x',        // closest Ryzen 5
    'gpu_rtx4060',         // closest budget NVIDIA GPU
    'ram_corsair_vengeance_16', // 16GB DDR4-3200 exact match
    'storage_crucial_p3_500gb', // closest to 512GB NVMe
    'psu_corsair_cx550f',  // 550W Bronze (product: 650W Bronze)
  ],
  // NEX Apex 4K — i9-14900K / RTX 4090 (exact matches available)
  'NEX Apex 4K': [
    'cpu_i9_14900k',
    'gpu_rtx4090',
    'ram_gskill_trident_64',    // 64GB DDR5-6000 (closest)
    'storage_samsung_990pro_2tb',
    'mb_z790_hero',
    'psu_corsair_rm1000x',
    'cool_corsair_h150i',       // 360mm AIO exact match
  ],
  // NEX Creator Studio — Ryzen 9 7950X / RTX 4080 (exact CPU match)
  'NEX Creator Studio': [
    'cpu_r9_7950x',
    'gpu_rtx4080s',             // RTX 4080 Super closest to RTX 4080
    'ram_gskill_trident_64',    // closest DDR5 64GB kit
    'storage_samsung_990pro_2tb',
    'mb_x670e_hero',            // X670E exact match
    'psu_seasonic_850',         // 850W Gold exact match
    'cool_arctic_240',          // 240mm AIO (closest to 280mm)
  ],
  // NEX Compact X — Ryzen 7 7700X / RTX 4070 (exact CPU match)
  'NEX Compact X': [
    'cpu_r7_7700x',
    'gpu_rtx4070ti',            // closest RTX 4070
    'ram_corsair_dom_32',       // 32GB DDR5 closest to DDR5-5600
    'storage_wd_sn850x_1tb',   // 1TB NVMe exact match
    'mb_b650_tomahawk',         // B650 matches
    'case_nr200p',              // Mini-ITX exact match
    'psu_bequiet_750',          // 750W Platinum (product: 750W SFX Gold)
  ],
  // NEX Office Elite — i5-13400 / integrated GPU
  'NEX Office Elite': [
    'cpu_i5_13600k',            // closest Intel i5 13th gen
    'ram_corsair_vengeance_16', // 16GB DDR4-3200 exact match
    'storage_crucial_p3_500gb', // closest to 512GB
    'mb_b760m_ds3h',           // B760 matches
  ],
  // NEX Mid-Range Champion — Ryzen 7 5800X3D / RX 7800 XT
  'NEX Mid-Range Champion': [
    'cpu_r7_7700x',             // closest AMD Ryzen 7
    'gpu_rx7900xtx',            // closest AMD GPU available
    'ram_kingston_ddr4_32',     // 32GB DDR4-3600 exact match
    'storage_wd_sn850x_1tb',   // 1TB NVMe
    'psu_bequiet_750',          // 750W (product: 750W Gold)
  ],
  // NEX Silent Workstation — i7-13700T / RTX 4060
  'NEX Silent Workstation': [
    'cpu_i5_13600k',            // closest Intel 13th gen available
    'gpu_rtx4060',              // RTX 4060 exact GPU match
    'ram_gskill_trident_64',    // 64GB DDR5 (closest to DDR5-4800 64GB)
    'storage_samsung_990pro_2tb',
    'mb_b760m_ds3h',           // B760 matches
    'psu_evga_650',             // closest to 500W (next tier up)
  ],
  // NEX Budget Blaster — Ryzen 5 5500 / RX 6600
  'NEX Budget Blaster': [
    'cpu_r5_7600x',             // closest Ryzen 5
    'gpu_rtx4060',              // closest budget GPU (RX 6600 not in list)
    'ram_corsair_vengeance_16', // closest to 8GB DDR4-3200
    'storage_crucial_p3_500gb', // closest to 256GB
    'psu_corsair_cx550f',       // 550W Bronze exact match
  ],
}

// ---------------------------------------------------------------------------
// Admin user
// ---------------------------------------------------------------------------
async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@nexpc.com' } })
  if (existing) return existing
  const hash = await bcrypt.hash('Admin1234!', 12)
  return prisma.user.create({
    data: { email: 'admin@nexpc.com', password: hash, name: 'NEX Admin', role: 'ADMIN' },
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🌱  Starting seed...\n')

  const admin = await seedAdmin()
  console.log(`✅  Admin user: ${admin.email}  (password: Admin1234!)`)

  // Upsert products by name (findFirst + update or create)
  const productMap = {}
  for (const data of products) {
    const existing = await prisma.product.findFirst({ where: { name: data.name } })
    const p = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data })
    productMap[p.name] = p
  }
  console.log(`✅  Upserted ${products.length} products`)

  // Upsert components by name (findFirst + update or create)
  const componentMap = {}
  for (const [key, data] of Object.entries(componentDefs)) {
    const existing = await prisma.component.findFirst({ where: { name: data.name } })
    const c = existing
      ? await prisma.component.update({ where: { id: existing.id }, data })
      : await prisma.component.create({ data })
    componentMap[key] = c
  }
  console.log(`✅  Upserted ${Object.keys(componentDefs).length} components`)

  // Rebuild product-component links (clear only links, not products/components)
  await prisma.productComponent.deleteMany()
  let linkCount = 0
  for (const [productName, compKeys] of Object.entries(productComponentLinks)) {
    const product = productMap[productName]
    if (!product) {
      console.warn(`⚠️   Product not found: ${productName}`)
      continue
    }
    for (const key of compKeys) {
      const component = componentMap[key]
      if (!component) {
        console.warn(`⚠️   Component key not found: ${key}`)
        continue
      }
      await prisma.productComponent.create({
        data: { productId: product.id, componentId: component.id },
      })
      linkCount++
    }
  }
  console.log(`✅  Created ${linkCount} product-component links`)

  console.log('\n🎉  Seed complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('   Admin login  →  admin@nexpc.com')
  console.log('   Password     →  Admin1234!')
  console.log('   Dev server   →  http://localhost:3000')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
