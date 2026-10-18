import { BerthSeed, CountrySeed, FlagSeed, ProvinceSeed } from '../../types/seed.types';

// Reference lists for `npm run seed`. Ids that the frontend hard-codes are pinned here:
// Thailand is country 219 and vessel flag 218; purpose types are 1..6 in this order.

export const THAILAND_COUNTRY_ID = 219;
export const THAILAND_FLAG_ID = 218;

const COUNTRY_LIST: [string, string, string][] = [
  ['AU', 'Australia', 'ออสเตรเลีย'],
  ['BD', 'Bangladesh', 'บังกลาเทศ'],
  ['BE', 'Belgium', 'เบลเยียม'],
  ['BR', 'Brazil', 'บราซิล'],
  ['BS', 'Bahamas', 'บาฮามาส'],
  ['CA', 'Canada', 'แคนาดา'],
  ['CN', 'China', 'จีน'],
  ['CY', 'Cyprus', 'ไซปรัส'],
  ['DE', 'Germany', 'เยอรมนี'],
  ['DK', 'Denmark', 'เดนมาร์ก'],
  ['EG', 'Egypt', 'อียิปต์'],
  ['ES', 'Spain', 'สเปน'],
  ['FR', 'France', 'ฝรั่งเศส'],
  ['GB', 'United Kingdom', 'สหราชอาณาจักร'],
  ['GR', 'Greece', 'กรีซ'],
  ['HK', 'Hong Kong', 'ฮ่องกง'],
  ['ID', 'Indonesia', 'อินโดนีเซีย'],
  ['IN', 'India', 'อินเดีย'],
  ['IT', 'Italy', 'อิตาลี'],
  ['JP', 'Japan', 'ญี่ปุ่น'],
  ['KH', 'Cambodia', 'กัมพูชา'],
  ['KR', 'South Korea', 'เกาหลีใต้'],
  ['KW', 'Kuwait', 'คูเวต'],
  ['LK', 'Sri Lanka', 'ศรีลังกา'],
  ['LR', 'Liberia', 'ไลบีเรีย'],
  ['MH', 'Marshall Islands', 'หมู่เกาะมาร์แชลล์'],
  ['MM', 'Myanmar', 'เมียนมา'],
  ['MT', 'Malta', 'มอลตา'],
  ['MY', 'Malaysia', 'มาเลเซีย'],
  ['NL', 'Netherlands', 'เนเธอร์แลนด์'],
  ['NO', 'Norway', 'นอร์เวย์'],
  ['NZ', 'New Zealand', 'นิวซีแลนด์'],
  ['OM', 'Oman', 'โอมาน'],
  ['PA', 'Panama', 'ปานามา'],
  ['PH', 'Philippines', 'ฟิลิปปินส์'],
  ['PK', 'Pakistan', 'ปากีสถาน'],
  ['QA', 'Qatar', 'กาตาร์'],
  ['RU', 'Russia', 'รัสเซีย'],
  ['SA', 'Saudi Arabia', 'ซาอุดีอาระเบีย'],
  ['SE', 'Sweden', 'สวีเดน'],
  ['SG', 'Singapore', 'สิงคโปร์'],
  ['TR', 'Türkiye', 'ตุรกี'],
  ['TW', 'Taiwan', 'ไต้หวัน'],
  ['US', 'United States', 'สหรัฐอเมริกา'],
  ['VN', 'Vietnam', 'เวียดนาม'],
  ['ZA', 'South Africa', 'แอฟริกาใต้'],
];

export const COUNTRIES: CountrySeed[] = [
  ...COUNTRY_LIST.map(([code, nameEn, nameTh], i) => ({ id: i + 1, code, nameEn, nameTh })),
  { id: THAILAND_COUNTRY_ID, code: 'TH', nameEn: 'Thailand', nameTh: 'ไทย' },
];

export const PROVINCES: ProvinceSeed[] = [
  {
    nameTh: 'กรุงเทพมหานคร',
    nameEn: 'Bangkok',
    geographyId: 2,
    districts: [
      { nameTh: 'คลองเตย', nameEn: 'Khlong Toei', subDistricts: [{ nameTh: 'คลองเตย', nameEn: 'Khlong Toei', zipcode: '10110' }, { nameTh: 'คลองตัน', nameEn: 'Khlong Tan', zipcode: '10110' }, { nameTh: 'พระโขนง', nameEn: 'Phra Khanong', zipcode: '10110' }] },
      { nameTh: 'บางรัก', nameEn: 'Bang Rak', subDistricts: [{ nameTh: 'สีลม', nameEn: 'Si Lom', zipcode: '10500' }, { nameTh: 'สุริยวงศ์', nameEn: 'Suriyawong', zipcode: '10500' }, { nameTh: 'บางรัก', nameEn: 'Bang Rak', zipcode: '10500' }] },
      { nameTh: 'สาทร', nameEn: 'Sathon', subDistricts: [{ nameTh: 'ทุ่งมหาเมฆ', nameEn: 'Thung Maha Mek', zipcode: '10120' }, { nameTh: 'ยานนาวา', nameEn: 'Yan Nawa', zipcode: '10120' }] },
      { nameTh: 'ห้วยขวาง', nameEn: 'Huai Khwang', subDistricts: [{ nameTh: 'ห้วยขวาง', nameEn: 'Huai Khwang', zipcode: '10310' }, { nameTh: 'บางกะปิ', nameEn: 'Bang Kapi', zipcode: '10310' }] },
    ],
  },
  {
    nameTh: 'ระยอง',
    nameEn: 'Rayong',
    geographyId: 5,
    districts: [
      { nameTh: 'เมืองระยอง', nameEn: 'Mueang Rayong', subDistricts: [{ nameTh: 'มาบตาพุด', nameEn: 'Map Ta Phut', zipcode: '21150' }, { nameTh: 'ห้วยโป่ง', nameEn: 'Huai Pong', zipcode: '21150' }, { nameTh: 'เนินพระ', nameEn: 'Noen Phra', zipcode: '21000' }, { nameTh: 'ท่าประดู่', nameEn: 'Tha Pradu', zipcode: '21000' }, { nameTh: 'ทับมา', nameEn: 'Thap Ma', zipcode: '21000' }] },
      { nameTh: 'บ้านฉาง', nameEn: 'Ban Chang', subDistricts: [{ nameTh: 'บ้านฉาง', nameEn: 'Ban Chang', zipcode: '21130' }, { nameTh: 'พลา', nameEn: 'Phla', zipcode: '21130' }, { nameTh: 'สำนักท้อน', nameEn: 'Samnak Thon', zipcode: '21130' }] },
      { nameTh: 'นิคมพัฒนา', nameEn: 'Nikhom Phatthana', subDistricts: [{ nameTh: 'นิคมพัฒนา', nameEn: 'Nikhom Phatthana', zipcode: '21180' }, { nameTh: 'มาบข่า', nameEn: 'Map Kha', zipcode: '21180' }] },
      { nameTh: 'ปลวกแดง', nameEn: 'Pluak Daeng', subDistricts: [{ nameTh: 'ปลวกแดง', nameEn: 'Pluak Daeng', zipcode: '21140' }, { nameTh: 'ตาสิทธิ์', nameEn: 'Ta Sit', zipcode: '21140' }] },
    ],
  },
  {
    nameTh: 'ชลบุรี',
    nameEn: 'Chon Buri',
    geographyId: 5,
    districts: [
      { nameTh: 'ศรีราชา', nameEn: 'Si Racha', subDistricts: [{ nameTh: 'ทุ่งสุขลา', nameEn: 'Thung Sukhla', zipcode: '20230' }, { nameTh: 'ศรีราชา', nameEn: 'Si Racha', zipcode: '20110' }, { nameTh: 'สุรศักดิ์', nameEn: 'Surasak', zipcode: '20110' }, { nameTh: 'บึง', nameEn: 'Bueng', zipcode: '20230' }] },
      { nameTh: 'เมืองชลบุรี', nameEn: 'Mueang Chon Buri', subDistricts: [{ nameTh: 'บางปลาสร้อย', nameEn: 'Bang Pla Soi', zipcode: '20000' }, { nameTh: 'แสนสุข', nameEn: 'Saen Suk', zipcode: '20130' }, { nameTh: 'เสม็ด', nameEn: 'Samet', zipcode: '20000' }] },
      { nameTh: 'สัตหีบ', nameEn: 'Sattahip', subDistricts: [{ nameTh: 'สัตหีบ', nameEn: 'Sattahip', zipcode: '20180' }, { nameTh: 'พลูตาหลวง', nameEn: 'Phlu Ta Luang', zipcode: '20180' }] },
      { nameTh: 'บางละมุง', nameEn: 'Bang Lamung', subDistricts: [{ nameTh: 'นาเกลือ', nameEn: 'Na Kluea', zipcode: '20150' }, { nameTh: 'หนองปรือ', nameEn: 'Nong Prue', zipcode: '20150' }] },
    ],
  },
  {
    nameTh: 'สมุทรปราการ',
    nameEn: 'Samut Prakan',
    geographyId: 2,
    districts: [
      { nameTh: 'เมืองสมุทรปราการ', nameEn: 'Mueang Samut Prakan', subDistricts: [{ nameTh: 'ปากน้ำ', nameEn: 'Pak Nam', zipcode: '10270' }, { nameTh: 'ท้ายบ้าน', nameEn: 'Thai Ban', zipcode: '10280' }] },
      { nameTh: 'พระประแดง', nameEn: 'Phra Pradaeng', subDistricts: [{ nameTh: 'บางพึ่ง', nameEn: 'Bang Phueng', zipcode: '10130' }, { nameTh: 'บางครุ', nameEn: 'Bang Khru', zipcode: '10130' }] },
      { nameTh: 'บางพลี', nameEn: 'Bang Phli', subDistricts: [{ nameTh: 'บางพลีใหญ่', nameEn: 'Bang Phli Yai', zipcode: '10540' }, { nameTh: 'ราชาเทวะ', nameEn: 'Racha Thewa', zipcode: '10540' }] },
    ],
  },
  {
    nameTh: 'ฉะเชิงเทรา',
    nameEn: 'Chachoengsao',
    geographyId: 5,
    districts: [
      { nameTh: 'เมืองฉะเชิงเทรา', nameEn: 'Mueang Chachoengsao', subDistricts: [{ nameTh: 'หน้าเมือง', nameEn: 'Na Mueang', zipcode: '24000' }, { nameTh: 'บางตีนเป็ด', nameEn: 'Bang Tin Pet', zipcode: '24000' }] },
      { nameTh: 'บางปะกง', nameEn: 'Bang Pakong', subDistricts: [{ nameTh: 'บางปะกง', nameEn: 'Bang Pakong', zipcode: '24130' }, { nameTh: 'ท่าข้าม', nameEn: 'Tha Kham', zipcode: '24130' }] },
    ],
  },
  {
    nameTh: 'นนทบุรี',
    nameEn: 'Nonthaburi',
    geographyId: 2,
    districts: [
      { nameTh: 'เมืองนนทบุรี', nameEn: 'Mueang Nonthaburi', subDistricts: [{ nameTh: 'สวนใหญ่', nameEn: 'Suan Yai', zipcode: '11000' }, { nameTh: 'บางกระสอ', nameEn: 'Bang Kraso', zipcode: '11000' }] },
      { nameTh: 'ปากเกร็ด', nameEn: 'Pak Kret', subDistricts: [{ nameTh: 'ปากเกร็ด', nameEn: 'Pak Kret', zipcode: '11120' }, { nameTh: 'บางพูด', nameEn: 'Bang Phut', zipcode: '11120' }] },
    ],
  },
  {
    nameTh: 'สงขลา',
    nameEn: 'Songkhla',
    geographyId: 6,
    districts: [
      { nameTh: 'เมืองสงขลา', nameEn: 'Mueang Songkhla', subDistricts: [{ nameTh: 'บ่อยาง', nameEn: 'Bo Yang', zipcode: '90000' }, { nameTh: 'เขารูปช้าง', nameEn: 'Khao Rup Chang', zipcode: '90000' }] },
      { nameTh: 'หาดใหญ่', nameEn: 'Hat Yai', subDistricts: [{ nameTh: 'หาดใหญ่', nameEn: 'Hat Yai', zipcode: '90110' }, { nameTh: 'คอหงส์', nameEn: 'Kho Hong', zipcode: '90110' }] },
    ],
  },
  {
    nameTh: 'ภูเก็ต',
    nameEn: 'Phuket',
    geographyId: 6,
    districts: [{ nameTh: 'เมืองภูเก็ต', nameEn: 'Mueang Phuket', subDistricts: [{ nameTh: 'ตลาดใหญ่', nameEn: 'Talat Yai', zipcode: '83000' }, { nameTh: 'รัษฎา', nameEn: 'Ratsada', zipcode: '83000' }] }],
  },
  {
    nameTh: 'สุราษฎร์ธานี',
    nameEn: 'Surat Thani',
    geographyId: 6,
    districts: [{ nameTh: 'เมืองสุราษฎร์ธานี', nameEn: 'Mueang Surat Thani', subDistricts: [{ nameTh: 'ตลาด', nameEn: 'Talat', zipcode: '84000' }, { nameTh: 'บางกุ้ง', nameEn: 'Bang Kung', zipcode: '84000' }] }],
  },
  {
    nameTh: 'เชียงใหม่',
    nameEn: 'Chiang Mai',
    geographyId: 1,
    districts: [{ nameTh: 'เมืองเชียงใหม่', nameEn: 'Mueang Chiang Mai', subDistricts: [{ nameTh: 'ศรีภูมิ', nameEn: 'Si Phum', zipcode: '50200' }, { nameTh: 'สุเทพ', nameEn: 'Suthep', zipcode: '50200' }] }],
  },
  {
    nameTh: 'ขอนแก่น',
    nameEn: 'Khon Kaen',
    geographyId: 3,
    districts: [{ nameTh: 'เมืองขอนแก่น', nameEn: 'Mueang Khon Kaen', subDistricts: [{ nameTh: 'ในเมือง', nameEn: 'Nai Mueang', zipcode: '40000' }, { nameTh: 'ศิลา', nameEn: 'Sila', zipcode: '40000' }] }],
  },
  {
    nameTh: 'ปทุมธานี',
    nameEn: 'Pathum Thani',
    geographyId: 2,
    districts: [{ nameTh: 'คลองหลวง', nameEn: 'Khlong Luang', subDistricts: [{ nameTh: 'คลองหนึ่ง', nameEn: 'Khlong Nueng', zipcode: '12120' }, { nameTh: 'คลองสอง', nameEn: 'Khlong Song', zipcode: '12120' }] }],
  },
];

export const VESSEL_TYPES = ['Bulk Carrier', 'Container Ship', 'General Cargo', 'Chemical Tanker', 'Oil Tanker', 'LPG Carrier', 'LNG Carrier', 'Tug Boat', 'Barge', 'Passenger Ship', 'Ro-Ro', 'Offshore Supply Vessel'];

const FLAG_LIST: [string, string][] = [
  ['pa', 'Panama'],
  ['lr', 'Liberia'],
  ['mh', 'Marshall Islands'],
  ['sg', 'Singapore'],
  ['hk', 'Hong Kong'],
  ['mt', 'Malta'],
  ['bs', 'Bahamas'],
  ['jp', 'Japan'],
  ['cn', 'China'],
  ['gr', 'Greece'],
  ['vn', 'Vietnam'],
  ['id', 'Indonesia'],
  ['my', 'Malaysia'],
  ['kr', 'South Korea'],
  ['in', 'India'],
  ['ph', 'Philippines'],
  ['cy', 'Cyprus'],
  ['no', 'Norway'],
  ['gb', 'United Kingdom'],
  ['us', 'United States'],
  ['tw', 'Taiwan'],
  ['dk', 'Denmark'],
  ['de', 'Germany'],
  ['nl', 'Netherlands'],
];

export const VESSEL_FLAGS: FlagSeed[] = [...FLAG_LIST.map(([code, name], i) => ({ id: i + 1, code, name })), { id: THAILAND_FLAG_ID, code: 'th', name: 'Thailand' }];

export const PORTS: { name: string; locode: string; country: string }[] = [
  { name: 'Map Ta Phut', locode: 'THMAT', country: 'TH' },
  { name: 'Laem Chabang', locode: 'THLCH', country: 'TH' },
  { name: 'Bangkok', locode: 'THBKK', country: 'TH' },
  { name: 'Sattahip', locode: 'THSAT', country: 'TH' },
  { name: 'Sriracha', locode: 'THSRI', country: 'TH' },
  { name: 'Songkhla', locode: 'THSGZ', country: 'TH' },
  { name: 'Singapore', locode: 'SGSIN', country: 'SG' },
  { name: 'Port Klang', locode: 'MYPKG', country: 'MY' },
  { name: 'Ho Chi Minh City', locode: 'VNSGN', country: 'VN' },
  { name: 'Hong Kong', locode: 'HKHKG', country: 'HK' },
  { name: 'Shanghai', locode: 'CNSHA', country: 'CN' },
  { name: 'Busan', locode: 'KRPUS', country: 'KR' },
  { name: 'Yokohama', locode: 'JPYOK', country: 'JP' },
  { name: 'Jakarta (Tanjung Priok)', locode: 'IDJKT', country: 'ID' },
  { name: 'Manila', locode: 'PHMNL', country: 'PH' },
  { name: 'Kaohsiung', locode: 'TWKHH', country: 'TW' },
  { name: 'Colombo', locode: 'LKCMB', country: 'LK' },
  { name: 'Mumbai (Nhava Sheva)', locode: 'INNSA', country: 'IN' },
  { name: 'Rotterdam', locode: 'NLRTM', country: 'NL' },
  { name: 'Houston', locode: 'USHOU', country: 'US' },
  { name: 'Ras Tanura', locode: 'SARTA', country: 'SA' },
  { name: 'Fremantle', locode: 'AUFRE', country: 'AU' },
];

export const BERTHS: BerthSeed[] = [
  { nameTh: 'ท่าเทียบเรือสาธารณะ MIT', nameEn: 'Map Ta Phut Industrial Terminal (MIT)', nameAlt: 'MIT', berthType: 'MIT', vesselType: 'General Cargo', rate: 8.56, jetties: ['MIT-1', 'MIT-2', 'MIT-3', 'MIT-4'] },
  { nameTh: 'ท่าเทียบเรือ TCT', nameEn: 'Thai Connectivity Terminal (TCT)', nameAlt: 'TCT', berthType: 'TCT', vesselType: 'Bulk Carrier', rate: 8.56, jetties: ['TCT-1', 'TCT-2', 'TCT-3'] },
  { nameTh: 'ท่าเทียบเรือ TTT', nameEn: 'Thai Tank Terminal (TTT)', nameAlt: 'TTT', berthType: 'Spacial', vesselType: 'Chemical Tanker', rate: 9.2, jetties: ['TTT-1', 'TTT-2', 'TTT-3'] },
  { nameTh: 'ท่าเทียบเรือ PTT LNG', nameEn: 'PTT LNG Terminal', nameAlt: 'PTT LNG1', berthType: 'Spacial', vesselType: 'LNG Carrier', rate: 12.5, jetties: ['LNG-1', 'LNG-2'] },
  { nameTh: 'ท่าเทียบเรือ MTT', nameEn: 'Map Ta Phut Tank Terminal (MTT)', nameAlt: 'MTT1', berthType: 'Spacial', vesselType: 'Oil Tanker', rate: 9.8, jetties: ['MTT-1', 'MTT-2'] },
  { nameTh: 'ท่าเทียบเรือ BLCP', nameEn: 'BLCP Power Coal Terminal', nameAlt: 'BLCP', berthType: 'Other', vesselType: 'Bulk Carrier', rate: 7.9, jetties: ['BLCP-1'] },
  { nameTh: 'ท่าเทียบเรือ NFC', nameEn: 'NFC Fertilizer Terminal', nameAlt: 'NFC', berthType: 'Other', vesselType: 'Bulk Carrier', rate: 7.9, jetties: ['NFC-1', 'NFC-2'] },
  { nameTh: 'ท่าเทียบเรือ GC Glycol', nameEn: 'GC Glycol Jetty', nameAlt: 'GCG', berthType: 'Other', vesselType: 'Chemical Tanker', rate: 9.2, jetties: ['GCG-1'] },
  { nameTh: 'ท่าเทียบเรือ PTT Tank', nameEn: 'PTT Tank Terminal', nameAlt: 'PTTT', berthType: 'Other', vesselType: 'LPG Carrier', rate: 10.4, jetties: ['PTTT-1', 'PTTT-2'] },
  { nameTh: 'ท่าเทียบเรือ Star Petroleum', nameEn: 'Star Petroleum Jetty', nameAlt: 'SPRC', berthType: 'Other', vesselType: 'Oil Tanker', rate: 9.8, jetties: ['SPRC-1', 'SPRC-2'] },
];

export const LOCATES = ['ท่าเทียบเรือ (Berth)', 'เขื่อนกันคลื่น (Breakwater)', 'ทุ่นจอดเรือ (Buoy)', 'เขตทอดสมอ A (Anchorage A)', 'เขตทอดสมอ B (Anchorage B)', 'ร่องน้ำเดินเรือ (Channel)'];
export const USE_BERTHS = ['ขนถ่ายสินค้า', 'รับน้ำมันเชื้อเพลิง', 'ซ่อมบำรุง', 'จอดรอเทียบท่า', 'รับ-ส่งผู้โดยสาร'];

export const PURPOSE_TYPES: { code: string; nameEn: string; nameTh: string }[] = [
  { code: 'Loading', nameEn: 'Loading', nameTh: 'ขนถ่ายสินค้าขึ้นเรือ' },
  { code: 'Discharge', nameEn: 'Discharge', nameTh: 'ขนถ่ายสินค้าลงจากเรือ' },
  { code: 'DischargeLoading', nameEn: 'Discharge/Loading', nameTh: 'ขนถ่ายสินค้าขึ้นและลง' },
  { code: 'SparePart', nameEn: 'Spare Part', nameTh: 'รับอะไหล่/เสบียง' },
  { code: 'Passenger', nameEn: 'Passenger', nameTh: 'ผู้โดยสาร' },
  { code: 'Other', nameEn: 'Other', nameTh: 'อื่น ๆ' },
];

export const PURPOSES: { name: string; type: string; government?: boolean }[] = [
  { name: 'ขนถ่ายสินค้าเหลว (Liquid Bulk)', type: 'Loading' },
  { name: 'ขนถ่ายสินค้าเทกอง (Dry Bulk)', type: 'Loading' },
  { name: 'ขนถ่ายสินค้าทั่วไป (General Cargo)', type: 'Loading' },
  { name: 'ขนถ่ายตู้สินค้า (Container)', type: 'Loading' },
  { name: 'รับสินค้าเหลว (Liquid Bulk)', type: 'Discharge' },
  { name: 'รับสินค้าเทกอง (Dry Bulk)', type: 'Discharge' },
  { name: 'รับสินค้าทั่วไป (General Cargo)', type: 'Discharge' },
  { name: 'รับก๊าซ (LPG/LNG)', type: 'Discharge' },
  { name: 'ขนถ่ายสินค้าขึ้นและลง', type: 'DischargeLoading' },
  { name: 'รับอะไหล่และเสบียง', type: 'SparePart' },
  { name: 'รับ-ส่งผู้โดยสาร', type: 'Passenger' },
  { name: 'ซ่อมบำรุง (Maintenance)', type: 'Other' },
  { name: 'รับน้ำมันเชื้อเพลิง (Bunkering)', type: 'Other' },
  { name: 'จอดรอ (Lay-up)', type: 'Other' },
  { name: 'ตรวจการณ์ (Patrol)', type: 'Other', government: true },
  { name: 'ฝึกซ้อม (Exercise)', type: 'Other', government: true },
];

export const CARGO_TYPES = ['กราบซ้าย (Port side)', 'กราบขวา (Starboard side)', 'หัวเรือ (Bow)', 'ท้ายเรือ (Stern)'];

export const CARGO_WHARFAGES: { name: string; purposeTypes: string }[] = [
  { name: 'Liquid Bulk', purposeTypes: '1,2,3' },
  { name: 'Dry Bulk', purposeTypes: '1,2,3' },
  { name: 'Container', purposeTypes: '1,2,3' },
  { name: 'General Cargo', purposeTypes: '1,2,3' },
  { name: 'Gas (LPG/LNG)', purposeTypes: '1,2,3' },
  { name: 'Break Bulk', purposeTypes: '1,2,3' },
  { name: 'Project Cargo', purposeTypes: '1,2,3,4' },
];

export const PRODUCT_GROUPS: { name: string; types: { name: string; products: string[] }[] }[] = [
  { name: 'ปิโตรเคมี', types: [{ name: 'Ethylene', products: ['Ethylene (Polymer grade)'] }, { name: 'Propylene', products: ['Propylene (Polymer grade)', 'Propylene (Chemical grade)'] }, { name: 'Benzene', products: ['Benzene'] }, { name: 'Paraxylene', products: ['Paraxylene (PX)'] }, { name: 'Styrene Monomer', products: ['Styrene Monomer (SM)'] }] },
  { name: 'เคมีภัณฑ์', types: [{ name: 'Caustic Soda', products: ['Caustic Soda 50%'] }, { name: 'Methanol', products: ['Methanol'] }, { name: 'Sulfuric Acid', products: ['Sulfuric Acid 98%'] }, { name: 'Mono Ethylene Glycol', products: ['MEG (Fiber grade)'] }] },
  { name: 'ก๊าซ', types: [{ name: 'LPG', products: ['LPG (Propane/Butane mix)'] }, { name: 'LNG', products: ['LNG'] }, { name: 'Ammonia', products: ['Anhydrous Ammonia'] }] },
  { name: 'น้ำมัน', types: [{ name: 'Crude Oil', products: ['Arabian Light Crude', 'Murban Crude'] }, { name: 'Diesel', products: ['Diesel B7', 'Diesel B10'] }, { name: 'Naphtha', products: ['Naphtha (Light)'] }, { name: 'Jet Fuel', products: ['Jet A-1'] }] },
  { name: 'สินค้าเทกอง', types: [{ name: 'Coal', products: ['Sub-bituminous Coal', 'Bituminous Coal'] }, { name: 'Iron Ore', products: ['Iron Ore Fines'] }, { name: 'Fertilizer', products: ['Urea (Granular)', 'DAP'] }, { name: 'Grain', products: ['Soybean Meal', 'Wheat'] }] },
  { name: 'สินค้าทั่วไป', types: [{ name: 'Steel Products', products: ['Steel Coils', 'Steel Plates'] }, { name: 'Machinery', products: ['Industrial Machinery'] }, { name: 'Containers', products: ['20ft Container', '40ft Container'] }] },
];

export const PILOTS: { name: string; number: string; tel: string }[] = [
  { name: 'กัปตันสมชาย วงศ์สว่าง', number: 'PL-001', tel: '081-234-5601' },
  { name: 'กัปตันวิชัย ทองดี', number: 'PL-002', tel: '081-234-5602' },
  { name: 'กัปตันประยุทธ์ ศรีสุข', number: 'PL-003', tel: '081-234-5603' },
  { name: 'กัปตันอนันต์ บุญมา', number: 'PL-004', tel: '081-234-5604' },
  { name: 'กัปตันธีรพงษ์ แก้วใส', number: 'PL-005', tel: '081-234-5605' },
  { name: 'กัปตันสุรชัย พานทอง', number: 'PL-006', tel: '081-234-5606' },
  { name: 'กัปตันนพดล ชัยมงคล', number: 'PL-007', tel: '081-234-5607' },
  { name: 'กัปตันเอกชัย รุ่งเรือง', number: 'PL-008', tel: '081-234-5608' },
];

export const TUGS: { name: string; type: string }[] = [
  { name: 'MTP Tug 1', type: 'ASD Tug 60T' },
  { name: 'MTP Tug 2', type: 'ASD Tug 60T' },
  { name: 'MTP Tug 3', type: 'ASD Tug 70T' },
  { name: 'Rayong Tug 5', type: 'Conventional 40T' },
  { name: 'Rayong Tug 6', type: 'Conventional 45T' },
  { name: 'Sattahip Tug 2', type: 'ASD Tug 50T' },
  { name: 'Siam Tug 9', type: 'Tractor Tug 55T' },
  { name: 'Siam Tug 10', type: 'Tractor Tug 55T' },
];

export const PAYMENT_METHODS: { name: string; days: number }[] = [
  { name: 'เงินสด (Cash)', days: 1 },
  { name: 'โอนเงิน (Bank transfer)', days: 30 },
  { name: 'เครดิต 45 วัน', days: 45 },
  { name: 'เช็ค (Cheque)', days: 15 },
];

export const PAYMENT_TERMS: { name: string; days: number }[] = [
  { name: 'ชำระทันที', days: 0 },
  { name: '15 วัน', days: 15 },
  { name: '30 วัน', days: 30 },
  { name: '45 วัน', days: 45 },
  { name: '60 วัน', days: 60 },
];

export const AUTHORITIES = ['กองทัพเรือ', 'กรมเจ้าท่า', 'กรมศุลกากร', 'ตำรวจน้ำ', 'กรมประมง', 'กรมทรัพยากรทางทะเลและชายฝั่ง'];

export const CARGO_OWNERS = [
  'บริษัท พีทีที โกลบอล เคมิคอล จำกัด (มหาชน)',
  'บริษัท เอสซีจี เคมิคอลส์ จำกัด (มหาชน)',
  'บริษัท ไทยออยล์ จำกัด (มหาชน)',
  'บริษัท สตาร์ ปิโตรเลียม รีไฟน์นิ่ง จำกัด (มหาชน)',
  'บริษัท บีแอลซีพี เพาเวอร์ จำกัด',
  'บริษัท ปุ๋ยเอ็นเอฟซี จำกัด (มหาชน)',
  'บริษัท ไทยแทงค์เทอร์มินัล จำกัด',
  'บริษัท พีทีที แอลเอ็นจี จำกัด',
  'บริษัท อินโดรามา เวนเจอร์ส จำกัด (มหาชน)',
  'บริษัท วีนิไทย จำกัด (มหาชน)',
  'บริษัท ไทยพลาสติกและเคมีภัณฑ์ จำกัด (มหาชน)',
  'บริษัท โกลว์ พลังงาน จำกัด (มหาชน)',
];

export const CUSTOMERS: { name: string; taxId: string; contact: string; phone: string }[] = [
  { name: 'บริษัท สยามมารีน โลจิสติกส์ จำกัด', taxId: '0105551012345', contact: 'คุณอรุณี ศรีสมบูรณ์', phone: '02-345-6781' },
  { name: 'บริษัท ไทยคาร์โก้ ชิปปิ้ง จำกัด', taxId: '0105552023456', contact: 'คุณวิภาวี ทองประเสริฐ', phone: '02-345-6782' },
  { name: 'บริษัท ตะวันออก มารีไทม์ จำกัด', taxId: '0215553034567', contact: 'คุณสมศักดิ์ รัตนพงษ์', phone: '038-345-678' },
  { name: 'บริษัท อ่าวไทย เอเจนซี่ จำกัด', taxId: '0215554045678', contact: 'คุณพรทิพย์ ชูวงศ์', phone: '038-456-789' },
  { name: 'บริษัท ระยอง พอร์ต เซอร์วิส จำกัด', taxId: '0215555056789', contact: 'คุณธนากร เพชรรัตน์', phone: '038-567-890' },
  { name: 'บริษัท เอเชีย ชิป เอเจนซี่ จำกัด', taxId: '0105556067890', contact: 'คุณกมลวรรณ อินทร์แก้ว', phone: '02-678-9012' },
  { name: 'บริษัท มาบตาพุด ทรานสปอร์ต จำกัด', taxId: '0215557078901', contact: 'คุณประวิทย์ มั่นคง', phone: '038-678-901' },
  { name: 'บริษัท แปซิฟิก โอเชียน ไลน์ จำกัด', taxId: '0105558089012', contact: 'คุณสุนิสา วัฒนกุล', phone: '02-789-0123' },
  { name: 'บริษัท บูรพา ชิปปิ้ง แอนด์ เทรดดิ้ง จำกัด', taxId: '0205559090123', contact: 'คุณอำนาจ สุขสวัสดิ์', phone: '038-890-123' },
  { name: 'บริษัท ไทยอินเตอร์ มารีน จำกัด', taxId: '0105560101234', contact: 'คุณจิราภรณ์ นาคทอง', phone: '02-901-2345' },
];

export const TERMS_CONTENT = `ข้อกำหนดและเงื่อนไขการใช้งานระบบ PMIS (Port Management Information System)

1. ผู้ใช้งานต้องเป็นตัวแทนเรือที่ได้รับการอนุมัติจากสำนักงานท่าเรืออุตสาหกรรมมาบตาพุด และต้องรักษาความลับของบัญชีผู้ใช้งาน
2. ข้อมูลเรือ ใบคำร้อง และเอกสารแนบที่ยื่นผ่านระบบต้องเป็นความจริงและเป็นปัจจุบัน ผู้ยื่นต้องรับผิดชอบต่อความถูกต้องของข้อมูลทั้งหมด
3. ใบคำร้องขอนำเรือเข้าเทียบท่าต้องยื่นล่วงหน้าไม่น้อยกว่า 24 ชั่วโมงก่อนเวลาที่คาดว่าเรือจะมาถึง (ETA)
4. ค่าภาระเรือ (Port Dues) คำนวณจากตันกรอส (GRT) ของเรือตามอัตราที่สำนักงานประกาศ และต้องชำระภายในกำหนดที่ระบุในใบแจ้งหนี้
5. สำนักงานสงวนสิทธิ์ในการปฏิเสธ ยกเลิก หรือขอให้แก้ไขใบคำร้องที่ไม่ครบถ้วนหรือไม่เป็นไปตามระเบียบ
6. ผู้ใช้งานยินยอมให้สำนักงานเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลเพื่อการให้บริการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562`;
