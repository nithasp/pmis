import { AgencySeed, OfficerSeed, VesselSeed } from '../../types/seed.types';

// Officer accounts: one per role so every menu of the frontend has someone who can use it
export const OFFICERS: OfficerSeed[] = [
  { email: 'reviewer@pmis.local', fullName: 'นางสาวกนกวรรณ ตรวจคำร้อง', roleType: 'DocumentReviewer', phone: '038-683-305' },
  { email: 'approver@pmis.local', fullName: 'นายวีรพล อนุมัติคำร้อง', roleType: 'DocumentApprove', phone: '038-683-306' },
  { email: 'mit@pmis.local', fullName: 'นายสุรศักดิ์ ท่าเรือ MIT', roleType: 'DocumentBerthOfficerMIT', phone: '038-683-307' },
  { email: 'tct@pmis.local', fullName: 'นางสาวปิยะดา ท่าเรือ TCT', roleType: 'DocumentBerthOfficerTCT', phone: '038-683-308' },
  { email: 'spacial@pmis.local', fullName: 'นายอภิชาติ ท่าเรือพิเศษ', roleType: 'DocumentBerthOfficerSpacial', phone: '038-683-309' },
  { email: 'stat@pmis.local', fullName: 'นางสาวณัฐธิดา เจ้าหน้าที่สถิติ', roleType: 'StatOfficer', phone: '038-683-310' },
  { email: 'statapprove@pmis.local', fullName: 'นายเกรียงไกร หัวหน้างานสถิติ', roleType: 'StatApprove', phone: '038-683-311' },
  { email: 'vtms@pmis.local', fullName: 'นายพงศกร เจ้าหน้าที่ VTMS', roleType: 'VTMS', phone: '038-683-312' },
  { email: 'officer@pmis.local', fullName: 'นางสาวศิริพร ผู้ดูแลระบบ', roleType: 'Admin', phone: '038-683-313' },
];

export const AGENCIES: AgencySeed[] = [
  { email: 'agency@pmis.local', company: 'บริษัท สยามมารีน โลจิสติกส์ จำกัด', fullName: 'นายธนวัฒน์ สมุทรสาคร', tax: '0105551012345', phone: '02-345-6781', mobile: '081-111-2201', personType: 'corporate', status: 'Approved', province: 'กรุงเทพมหานคร', district: 'คลองเตย', subDistrict: 'คลองเตย', address: '88 อาคารสยามมารีน ถนนพระราม 4' },
  { email: 'thaicargo@pmis.local', company: 'บริษัท ไทยคาร์โก้ ชิปปิ้ง จำกัด', fullName: 'นางสาววิภาวี ทองประเสริฐ', tax: '0105552023456', phone: '02-345-6782', mobile: '081-111-2202', personType: 'corporate', status: 'Approved', province: 'กรุงเทพมหานคร', district: 'บางรัก', subDistrict: 'สีลม', address: '191 อาคารสีลมคอมเพล็กซ์ ชั้น 12 ถนนสีลม' },
  { email: 'eastmaritime@pmis.local', company: 'บริษัท ตะวันออก มารีไทม์ จำกัด', fullName: 'นายสมศักดิ์ รัตนพงษ์', tax: '0215553034567', phone: '038-345-678', mobile: '081-111-2203', personType: 'corporate', status: 'Approved', province: 'ระยอง', district: 'เมืองระยอง', subDistrict: 'มาบตาพุด', address: '9/9 ถนนสุขุมวิท ต.มาบตาพุด' },
  { email: 'gulfagency@pmis.local', company: 'บริษัท อ่าวไทย เอเจนซี่ จำกัด', fullName: 'นางพรทิพย์ ชูวงศ์', tax: '0215554045678', phone: '038-456-789', mobile: '081-111-2204', personType: 'corporate', status: 'Approved', province: 'ระยอง', district: 'บ้านฉาง', subDistrict: 'บ้านฉาง', address: '55 ถนนบ้านฉาง-พลา' },
  { email: 'rayongport@pmis.local', company: 'บริษัท ระยอง พอร์ต เซอร์วิส จำกัด', fullName: 'นายธนากร เพชรรัตน์', tax: '0215555056789', phone: '038-567-890', mobile: '081-111-2205', personType: 'corporate', status: 'Approved', province: 'ระยอง', district: 'เมืองระยอง', subDistrict: 'ห้วยโป่ง', address: '120/4 ถนนไอ-เจ็ด นิคมอุตสาหกรรมมาบตาพุด' },
  { email: 'asiaship@pmis.local', company: 'บริษัท เอเชีย ชิป เอเจนซี่ จำกัด', fullName: 'นางสาวกมลวรรณ อินทร์แก้ว', tax: '0105556067890', phone: '02-678-9012', mobile: '081-111-2206', personType: 'corporate', status: 'Approved', province: 'กรุงเทพมหานคร', district: 'สาทร', subDistrict: 'ทุ่งมหาเมฆ', address: '1 อาคารเอ็มไพร์ทาวเวอร์ ชั้น 30 ถนนสาทรใต้' },
  { email: 'mtptransport@pmis.local', company: 'บริษัท มาบตาพุด ทรานสปอร์ต จำกัด', fullName: 'นายประวิทย์ มั่นคง', tax: '0215557078901', phone: '038-678-901', mobile: '081-111-2207', personType: 'corporate', status: 'Approved', province: 'ระยอง', district: 'นิคมพัฒนา', subDistrict: 'มาบข่า', address: '77 หมู่ 3 ถนนสาย 36' },
  { email: 'pacificline@pmis.local', company: 'บริษัท แปซิฟิก โอเชียน ไลน์ จำกัด', fullName: 'นางสุนิสา วัฒนกุล', tax: '0105558089012', phone: '02-789-0123', mobile: '081-111-2208', personType: 'corporate', status: 'Approved', province: 'สมุทรปราการ', district: 'เมืองสมุทรปราการ', subDistrict: 'ปากน้ำ', address: '301 ถนนสุขุมวิท ต.ปากน้ำ' },
  { email: 'burapa@pmis.local', company: 'บริษัท บูรพา ชิปปิ้ง แอนด์ เทรดดิ้ง จำกัด', fullName: 'นายอำนาจ สุขสวัสดิ์', tax: '0205559090123', phone: '038-890-123', mobile: '081-111-2209', personType: 'corporate', status: 'Approved', province: 'ชลบุรี', district: 'ศรีราชา', subDistrict: 'ทุ่งสุขลา', address: '20/8 ถนนสุขุมวิท แหลมฉบัง' },
  { email: 'thaiinter@pmis.local', company: 'บริษัท ไทยอินเตอร์ มารีน จำกัด', fullName: 'นางสาวจิราภรณ์ นาคทอง', tax: '0105560101234', phone: '02-901-2345', mobile: '081-111-2210', personType: 'corporate', status: 'Approved', province: 'กรุงเทพมหานคร', district: 'ห้วยขวาง', subDistrict: 'ห้วยขวาง', address: '234 อาคารรัชดาทาวเวอร์ ถนนรัชดาภิเษก' },
  { email: 'somchai.agent@pmis.local', company: '', fullName: 'นายสมชาย เรือดี', tax: '3210100012345', phone: '', mobile: '089-222-3301', personType: 'individual', status: 'Approved', province: 'ระยอง', district: 'เมืองระยอง', subDistrict: 'เนินพระ', address: '45/2 ซอยเนินพระ 5' },
  { email: 'newagency@pmis.local', company: 'บริษัท นิวเวฟ ชิปปิ้ง จำกัด', fullName: 'นายกิตติพงษ์ คลื่นใหม่', tax: '0215561112345', phone: '038-901-234', mobile: '081-111-2212', personType: 'corporate', status: 'WaitingApproved', province: 'ระยอง', district: 'เมืองระยอง', subDistrict: 'ทับมา', address: '12 ถนนราชชุมพล' },
  { email: 'pending.agent@pmis.local', company: '', fullName: 'นางสาวปาริชาต รอตรวจ', tax: '3100200023456', phone: '', mobile: '089-222-3313', personType: 'individual', status: 'WaitingApproved', province: 'ชลบุรี', district: 'เมืองชลบุรี', subDistrict: 'แสนสุข', address: '99/1 ถนนลงหาดบางแสน' },
];

export const VESSELS: VesselSeed[] = [
  { name: 'NP BANGPAKONG', type: 'Bulk Carrier', flag: 'th', imo: '9020455', official: '570001110', callSign: 'HSB2', mmsi: '567000111', grt: 3501, nrt: 1900, dwt: 5200, loa: 98.5, beam: 16.2, draft: 6.1, engine: 'MAN B&W 6S35MC' },
  { name: 'SIAM PRIDE', type: 'Chemical Tanker', flag: 'th', imo: '9345678', official: '570002221', callSign: 'HSC7', mmsi: '567000222', grt: 8920, nrt: 4100, dwt: 13500, loa: 128.6, beam: 20.4, draft: 8.9, engine: 'Wärtsilä 6RT-flex50' },
  { name: 'THAI STAR', type: 'General Cargo', flag: 'th', imo: '9123456', official: '570003332', callSign: 'HSD3', mmsi: '567000333', grt: 4812, nrt: 2600, dwt: 7200, loa: 105.0, beam: 17.0, draft: 6.8, engine: 'Mitsubishi 6UEC37LA' },
  { name: 'RAYONG EXPRESS', type: 'Container Ship', flag: 'th', imo: '9234567', official: '570004443', callSign: 'HSE1', mmsi: '567000444', grt: 15890, nrt: 7400, dwt: 20100, loa: 169.0, beam: 27.2, draft: 9.5, engine: 'MAN B&W 7S60MC-C' },
  { name: 'MAPTAPHUT GAS', type: 'LPG Carrier', flag: 'th', imo: '9456789', official: '570005554', callSign: 'HSF9', mmsi: '567000555', grt: 11250, nrt: 3400, dwt: 12800, loa: 150.2, beam: 24.0, draft: 8.2, engine: 'MAN B&W 6S50ME-B' },
  { name: 'CHAO PHRAYA NAVIGATOR', type: 'Oil Tanker', flag: 'th', imo: '9567890', official: '570006665', callSign: 'HSG4', mmsi: '567000666', grt: 29870, nrt: 14200, dwt: 47000, loa: 183.0, beam: 32.2, draft: 12.1, engine: 'MAN B&W 6S50MC-C' },
  { name: 'ANDAMAN SPIRIT', type: 'Oil Tanker', flag: 'th', imo: '9678901', official: '570007776', callSign: 'HSH5', mmsi: '567000777', grt: 6230, nrt: 3100, dwt: 9800, loa: 118.0, beam: 19.6, draft: 7.4, engine: 'Daihatsu 6DKM-36' },
  { name: 'SATTAHIP CARRIER', type: 'Bulk Carrier', flag: 'th', imo: '9789012', official: '570008887', callSign: 'HSJ8', mmsi: '567000888', grt: 21450, nrt: 11800, dwt: 35000, loa: 176.5, beam: 29.8, draft: 10.2, engine: 'MAN B&W 5S50MC-C' },
  { name: 'GSM JAYA', type: 'Bulk Carrier', flag: 'id', imo: '9334961', official: 'IDN-33496', callSign: 'YDMP3', mmsi: '525701730', grt: 6155, nrt: 3300, dwt: 9500, loa: 116.0, beam: 20.0, draft: 7.5, engine: 'Hanshin 6LH41LA' },
  { name: 'TOKIHIME', type: 'Chemical Tanker', flag: 'pa', imo: '9806794', official: 'PAN-80679', callSign: 'DYKJ', mmsi: '548690000', grt: 11940, nrt: 5300, dwt: 19900, loa: 147.0, beam: 24.6, draft: 9.4, engine: 'MAN B&W 6S46ME-B' },
  { name: 'MAERSK NANSHA', type: 'Container Ship', flag: 'sg', imo: '9890123', official: 'SGP-89012', callSign: '9V3456', mmsi: '563012345', grt: 48900, nrt: 25100, dwt: 55000, loa: 255.0, beam: 37.3, draft: 12.5, engine: 'MAN B&W 8S80ME-C' },
  { name: 'PACIFIC ZIRCON', type: 'Oil Tanker', flag: 'lr', imo: '9901234', official: 'LBR-90123', callSign: 'D5AB2', mmsi: '636019876', grt: 29440, nrt: 13600, dwt: 49990, loa: 183.2, beam: 32.2, draft: 12.9, engine: 'MAN B&W 6G50ME-B' },
  { name: 'GOLDEN HARVEST', type: 'Bulk Carrier', flag: 'mh', imo: '9012345', official: 'MHL-01234', callSign: 'V7AB9', mmsi: '538007654', grt: 43200, nrt: 25800, dwt: 81500, loa: 229.0, beam: 32.3, draft: 14.5, engine: 'MAN B&W 6S60ME-C' },
  { name: 'ORIENTAL LILY', type: 'LNG Carrier', flag: 'jp', imo: '9112233', official: 'JPN-11223', callSign: 'JAXZ', mmsi: '431002233', grt: 98700, nrt: 29600, dwt: 76000, loa: 288.0, beam: 49.0, draft: 11.5, engine: 'Dual fuel DFDE' },
  { name: 'EVER CHARM', type: 'Container Ship', flag: 'tw', imo: '9223344', official: 'TWN-22334', callSign: 'BKAC', mmsi: '416003344', grt: 27800, nrt: 15100, dwt: 32500, loa: 212.0, beam: 32.2, draft: 11.0, engine: 'Sulzer 7RTA72U' },
  { name: 'HANSA LIBERTY', type: 'General Cargo', flag: 'cy', imo: '9334455', official: 'CYP-33445', callSign: '5BAB4', mmsi: '209004455', grt: 9600, nrt: 5500, dwt: 12700, loa: 138.0, beam: 21.0, draft: 8.0, engine: 'MaK 8M43C' },
  { name: 'SEAWAYS TITAN', type: 'Chemical Tanker', flag: 'mt', imo: '9445566', official: 'MLT-44556', callSign: '9HAB5', mmsi: '229005566', grt: 23200, nrt: 10800, dwt: 37500, loa: 183.0, beam: 32.2, draft: 11.9, engine: 'MAN B&W 6S50MC-C' },
  { name: 'NORDIC AURORA', type: 'LPG Carrier', flag: 'no', imo: '9556677', official: 'NOR-55667', callSign: 'LAAB6', mmsi: '257006677', grt: 36800, nrt: 11000, dwt: 49000, loa: 225.0, beam: 36.6, draft: 11.4, engine: 'MAN B&W 6S60ME-C' },
  { name: 'BRIGHT HORIZON', type: 'Bulk Carrier', flag: 'bs', imo: '9667788', official: 'BHS-66778', callSign: 'C6AB7', mmsi: '311007788', grt: 32900, nrt: 18600, dwt: 56800, loa: 190.0, beam: 32.3, draft: 12.8, engine: 'MAN B&W 6S50MC-C' },
  { name: 'LONG SHUN 8', type: 'General Cargo', flag: 'cn', imo: '9778899', official: 'CHN-77889', callSign: 'BCAB8', mmsi: '413008899', grt: 5600, nrt: 3100, dwt: 8700, loa: 110.0, beam: 18.0, draft: 7.2, engine: 'Zichai 6230ZC' },
  { name: 'SEA GLORY', type: 'Oil Tanker', flag: 'gr', imo: '9889900', official: 'GRC-88990', callSign: 'SVAB9', mmsi: '241009900', grt: 58900, nrt: 32000, dwt: 109000, loa: 244.0, beam: 42.0, draft: 15.0, engine: 'MAN B&W 6S60ME-C' },
  { name: 'HAI PHONG STAR', type: 'Bulk Carrier', flag: 'vn', imo: '9990011', official: 'VNM-99001', callSign: 'XVAB1', mmsi: '574000011', grt: 17200, nrt: 9400, dwt: 28500, loa: 169.0, beam: 27.2, draft: 9.8, engine: 'Mitsubishi 6UEC45LA' },
  { name: 'KOTA WANGI', type: 'Container Ship', flag: 'sg', imo: '9101122', official: 'SGP-10112', callSign: '9VAB2', mmsi: '566001122', grt: 18100, nrt: 8900, dwt: 23400, loa: 182.0, beam: 28.0, draft: 10.1, engine: 'MAN B&W 7S60MC-C' },
  { name: 'HYUNDAI PRIME', type: 'Ro-Ro', flag: 'kr', imo: '9212233', official: 'KOR-21223', callSign: 'DSAB3', mmsi: '440002233', grt: 57600, nrt: 17300, dwt: 18800, loa: 199.9, beam: 32.3, draft: 9.0, engine: 'MAN B&W 7S60MC-C' },
  { name: 'JAG PRERANA', type: 'Oil Tanker', flag: 'in', imo: '9323344', official: 'IND-32334', callSign: 'VTAB4', mmsi: '419003344', grt: 23700, nrt: 10900, dwt: 37200, loa: 178.0, beam: 32.2, draft: 12.0, engine: 'MAN B&W 6S50MC' },
  { name: 'MANILA SPIRIT', type: 'Passenger Ship', flag: 'ph', imo: '9434455', official: 'PHL-43445', callSign: 'DUAB5', mmsi: '548004455', grt: 9800, nrt: 4200, dwt: 2800, loa: 128.0, beam: 21.0, draft: 5.6, engine: 'Pielstick 8PC2-6' },
  { name: 'STOLT ESSENCE', type: 'Chemical Tanker', flag: 'lr', imo: '9545566', official: 'LBR-54556', callSign: 'D5AB6', mmsi: '636005566', grt: 25300, nrt: 11200, dwt: 37800, loa: 176.7, beam: 31.0, draft: 11.5, engine: 'MAN B&W 6S50ME-C' },
  { name: 'PETRONAS LAHAD', type: 'LNG Carrier', flag: 'my', imo: '9656677', official: 'MYS-65667', callSign: '9MAB7', mmsi: '533006677', grt: 92600, nrt: 27800, dwt: 72000, loa: 282.0, beam: 43.4, draft: 11.6, engine: 'Steam turbine' },
  { name: 'BUNGA KELANA 7', type: 'Oil Tanker', flag: 'my', imo: '9767788', official: 'MYS-76778', callSign: '9MAB8', mmsi: '533007788', grt: 30800, nrt: 15100, dwt: 47300, loa: 189.0, beam: 32.2, draft: 12.6, engine: 'MAN B&W 6S50MC-C' },
  { name: 'ATLANTIC OAK', type: 'Bulk Carrier', flag: 'pa', imo: '9878899', official: 'PAN-87889', callSign: 'HPAB9', mmsi: '352008899', grt: 24100, nrt: 13500, dwt: 38200, loa: 180.0, beam: 30.0, draft: 10.5, engine: 'MAN B&W 5S50ME-B' },
  { name: 'SINAR BANDUNG', type: 'Container Ship', flag: 'id', imo: '9989900', official: 'IDN-98990', callSign: 'POAB1', mmsi: '525009900', grt: 9900, nrt: 5000, dwt: 12300, loa: 147.0, beam: 23.0, draft: 8.5, engine: 'MAN B&W 6S42MC' },
  { name: 'MAERSK NIAGARA', type: 'Oil Tanker', flag: 'dk', imo: '9090011', official: 'DNK-09001', callSign: 'OUAB2', mmsi: '219000011', grt: 29200, nrt: 13400, dwt: 49500, loa: 183.0, beam: 32.2, draft: 12.2, engine: 'MAN B&W 6S50ME-C' },
  { name: 'WAN HAI 316', type: 'Container Ship', flag: 'hk', imo: '9191122', official: 'HKG-19112', callSign: 'VRAB3', mmsi: '477001122', grt: 27000, nrt: 14600, dwt: 31700, loa: 213.0, beam: 32.2, draft: 10.8, engine: 'MAN B&W 7S70MC-C' },
  { name: 'SIAM TUG 9', type: 'Tug Boat', flag: 'th', imo: '', official: '570009998', callSign: 'HSK1', mmsi: '567009998', grt: 310, nrt: 93, dwt: 180, loa: 32.0, beam: 10.5, draft: 4.2, engine: 'Caterpillar 3516C x2' },
  { name: 'SIAM BARGE 12', type: 'Barge', flag: 'th', imo: '', official: '570009987', callSign: '', mmsi: '', grt: 1250, nrt: 1250, dwt: 3000, loa: 76.0, beam: 18.0, draft: 3.8, engine: '-' },
  { name: 'RAYONG SUPPLIER', type: 'Offshore Supply Vessel', flag: 'th', imo: '9252233', official: '570009976', callSign: 'HSL2', mmsi: '567009976', grt: 2190, nrt: 657, dwt: 2600, loa: 72.0, beam: 16.0, draft: 5.8, engine: 'Bergen C25:33L8P x2' },
  { name: 'FRONTLINE HOPE', type: 'Oil Tanker', flag: 'mh', imo: '9363344', official: 'MHL-36334', callSign: 'V7AB4', mmsi: '538003344', grt: 61200, nrt: 33800, dwt: 112000, loa: 250.0, beam: 44.0, draft: 15.2, engine: 'MAN B&W 6S60ME-C' },
  { name: 'ANNA SCHULTE', type: 'Container Ship', flag: 'de', imo: '9474455', official: 'DEU-47445', callSign: 'DAAB5', mmsi: '211004455', grt: 35800, nrt: 17900, dwt: 42000, loa: 229.0, beam: 32.2, draft: 12.0, engine: 'MAN B&W 8K80MC-C' },
  { name: 'BOW CEDAR', type: 'Chemical Tanker', flag: 'no', imo: '9585566', official: 'NOR-58556', callSign: 'LAAB7', mmsi: '257005566', grt: 23700, nrt: 10600, dwt: 37400, loa: 183.0, beam: 32.2, draft: 11.7, engine: 'MAN B&W 6S50MC-C' },
  { name: 'LADY NATTHA', type: 'General Cargo', flag: 'th', imo: '9696677', official: '570009965', callSign: 'HSM3', mmsi: '567009965', grt: 2980, nrt: 1660, dwt: 4500, loa: 92.0, beam: 15.6, draft: 5.9, engine: 'Yanmar 6N330-EN' },
];

export const GOVERNMENT_VESSELS: { name: string; official: string; authority: string; loa: number; beam: number; draft: number; displacement: number; type: string }[] = [
  { name: 'เรือหลวงมาตรา', official: 'RTN-721', authority: 'กองทัพเรือ', loa: 65.0, beam: 10.6, draft: 3.5, displacement: 980, type: 'Offshore Supply Vessel' },
  { name: 'เรือหลวงแหลมสิงห์', official: 'RTN-561', authority: 'กองทัพเรือ', loa: 58.0, beam: 9.3, draft: 2.9, displacement: 520, type: 'Offshore Supply Vessel' },
  { name: 'เรือเจ้าท่า 812', official: 'MD-812', authority: 'กรมเจ้าท่า', loa: 32.0, beam: 7.2, draft: 2.1, displacement: 180, type: 'Tug Boat' },
  { name: 'เรือศุลกากร 609', official: 'CUS-609', authority: 'กรมศุลกากร', loa: 28.5, beam: 6.4, draft: 1.8, displacement: 120, type: 'Tug Boat' },
  { name: 'เรือตำรวจน้ำ 524', official: 'MP-524', authority: 'ตำรวจน้ำ', loa: 24.0, beam: 5.8, draft: 1.6, displacement: 85, type: 'Tug Boat' },
  { name: 'เรือตรวจประมงทะเล 2', official: 'DOF-02', authority: 'กรมประมง', loa: 36.0, beam: 7.8, draft: 2.4, displacement: 240, type: 'Offshore Supply Vessel' },
];

export const SURVEYS = [
  {
    name: 'แบบประเมินความพึงพอใจการใช้งานระบบ PMIS ประจำปี 2569',
    description: 'สำนักงานท่าเรืออุตสาหกรรมมาบตาพุดขอความร่วมมือตัวแทนเรือตอบแบบประเมินเพื่อนำไปพัฒนาระบบให้ดียิ่งขึ้น',
    sections: [
      { typeSection: 'heading', title: 'ส่วนที่ 1 ข้อมูลทั่วไป', description: 'กรุณากรอกข้อมูลของท่าน' },
      { typeSection: 'question', questions: [{ question: 'ชื่อบริษัท/หน่วยงานของท่าน', typeQuestion: 'short_answer' }] },
      { typeSection: 'question', questions: [{ question: 'ท่านใช้งานระบบ PMIS บ่อยเพียงใด', typeQuestion: 'multiple_choice', options: ['ทุกวัน', 'สัปดาห์ละ 2-3 ครั้ง', 'สัปดาห์ละครั้ง', 'น้อยกว่าสัปดาห์ละครั้ง'] }] },
      { typeSection: 'evaluation', title: 'ส่วนที่ 2 ความพึงพอใจต่อระบบ', description: 'ให้คะแนน 1 (น้อยที่สุด) ถึง 5 (มากที่สุด)', satisfactionMin: 1, satisfactionMax: 5, satisfactionDesMin: 'ไม่พึงพอใจ', satisfactionDesMax: 'พึงพอใจมาก', questions: [{ question: 'ความสะดวกในการยื่นใบคำร้อง' }, { question: 'ความรวดเร็วในการตรวจและอนุมัติคำร้อง' }, { question: 'ความถูกต้องของใบแจ้งหนี้ค่าภาระเรือ' }, { question: 'ความชัดเจนของหน้าจอและเมนู' }] },
      { typeSection: 'question', questions: [{ question: 'ข้อเสนอแนะเพิ่มเติม', typeQuestion: 'paragraph' }] },
    ],
  },
  {
    name: 'แบบสำรวจความต้องการบริการท่าเทียบเรือ MIT/TCT',
    description: 'สำรวจความต้องการใช้บริการท่าเทียบเรือสาธารณะในปีถัดไป',
    sections: [
      { typeSection: 'heading', title: 'แผนการใช้ท่าเทียบเรือ', description: '' },
      { typeSection: 'question', questions: [{ question: 'ท่าเทียบเรือที่ท่านใช้บริการเป็นหลัก', typeQuestion: 'multiple_choice', options: ['MIT', 'TCT', 'ท่าเรือพิเศษ', 'อื่น ๆ'] }] },
      { typeSection: 'question', questions: [{ question: 'จำนวนเที่ยวเรือที่คาดว่าจะเข้าเทียบท่าในปีหน้า', typeQuestion: 'short_answer' }] },
      { typeSection: 'evaluation', title: 'ความพึงพอใจต่อบริการท่าเรือ', description: '', satisfactionMin: 1, satisfactionMax: 5, satisfactionDesMin: 'ควรปรับปรุง', satisfactionDesMax: 'ดีมาก', questions: [{ question: 'ความพร้อมของท่าเทียบเรือและอุปกรณ์' }, { question: 'การประสานงานของเจ้าหน้าที่ท่าเรือ' }] },
    ],
  },
  {
    name: 'แบบประเมินการให้บริการนำร่องและเรือลากจูง',
    description: 'ประเมินคุณภาพบริการนำร่อง (Pilot) และเรือลากจูง (Tug) ของท่าเรืออุตสาหกรรมมาบตาพุด',
    sections: [
      { typeSection: 'evaluation', title: 'บริการนำร่องและเรือลากจูง', description: 'ให้คะแนน 1-5', satisfactionMin: 1, satisfactionMax: 5, satisfactionDesMin: 'ไม่พึงพอใจ', satisfactionDesMax: 'พึงพอใจมาก', questions: [{ question: 'ความตรงต่อเวลาของเจ้าหน้าที่นำร่อง' }, { question: 'ความปลอดภัยในการนำเรือเข้า-ออก' }, { question: 'ความพร้อมของเรือลากจูง' }] },
      { typeSection: 'question', questions: [{ question: 'เหตุการณ์ที่ต้องการแจ้งให้ทราบ (ถ้ามี)', typeQuestion: 'paragraph' }] },
    ],
  },
];

export const SURVEY_TEXT_ANSWERS = ['ใช้งานสะดวกดี', 'อยากให้แจ้งเตือนทางอีเมลเมื่อคำร้องได้รับการอนุมัติ', 'หน้าจอบนมือถือยังใช้งานยาก', 'ควรเพิ่มการยื่นเอกสารหลายไฟล์พร้อมกัน', 'ขอบคุณเจ้าหน้าที่ที่ตอบเร็ว', 'ระบบช้าในช่วงเช้า', 'ไม่มีข้อเสนอแนะเพิ่มเติม'];
