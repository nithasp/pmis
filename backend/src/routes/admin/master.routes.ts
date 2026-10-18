import { Router } from 'express';
import * as master from '../../controllers/master.controller';
import * as uploads from '../../controllers/upload.controller';
import { requireOfficer } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

// Reads are open to every signed-in account (agencies fill their forms from them); writes are
// reserved for officers.
const write = requireOfficer;

router.post('/upload', upload.single('file'), uploads.masterData);

router.get('/pilot/list', master.pilots);
router.get('/tug/list', master.tugs);
router.get('/purpose-type', master.purposeTypes);
router.get('/product-group/list', master.productGroupOptions);

router.get('/port', master.portList);
router.get('/port/:id', master.portDetail);
router.post('/port', write, master.portCreate);
router.put('/port/:id', write, master.portUpdate);

router.get('/berth', master.berthList);
router.get('/berth/:id', master.berthDetail);
router.post('/berth', write, master.berthCreate);
router.put('/berth/:id', write, master.berthUpdate);

router.get('/purpose', master.purposeList);
router.get('/purpose/:id', master.purposeDetail);
router.post('/purpose', write, master.purposeCreate);
router.put('/purpose/:id', write, master.purposeUpdate);

router.get('/product', master.productList);
router.get('/product/:id', master.productDetail);
router.post('/product', write, master.productCreate);
router.put('/product/:id', write, master.productUpdate);

router.get('/product-type/list', master.productTypeOptions);
router.get('/product-type/type/:id', master.productTypesOfGroup);
router.get('/product-sub-type/type/:id', master.productTypesOfGroup);
router.get('/product-type', master.productTypeList);
router.get('/product-type/:id', master.productTypeDetail);
router.post('/product-type', write, master.productTypeCreate);
router.put('/product-type/:id', write, master.productTypeUpdate);

router.get('/vessel-flag', master.flagList);
router.get('/vessel-flag/:id', master.flagDetail);
router.post('/vessel-flag', write, master.flagCreate);
router.put('/vessel-flag/:id', write, master.flagUpdate);

router.get('/:key', master.simpleList);
router.get('/:key/:id', master.simpleDetail);
router.post('/:key', write, master.simpleCreate);
router.put('/:key/:id', write, master.simpleUpdate);

export default router;
