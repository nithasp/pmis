import { Router } from 'express';
import * as options from '../controllers/options.controller';
import { verifyAuthToken } from '../middleware/auth';

// Address lists are public: the registration page needs them before an account exists.
export const publicOptionsRouter = Router();
publicOptionsRouter.get('/countries', options.countries);
publicOptionsRouter.get('/provinces', options.provinces);
publicOptionsRouter.get('/districts', options.districts);
publicOptionsRouter.get('/subdistricts', options.subDistricts);

export const optionsRouter = Router();
optionsRouter.use(verifyAuthToken);
optionsRouter.get('/roles', options.roles);
optionsRouter.get('/authority', options.authority);
optionsRouter.get('/vessel-flags', options.vesselFlags);
optionsRouter.get('/vessel-types', options.vesselTypes);
optionsRouter.get('/vessel-owners', options.vesselOwners);
optionsRouter.get('/vessel-status', options.vesselStatus);
optionsRouter.get('/vessel-import-status', options.vesselImportStatus);
optionsRouter.get('/document-status', options.documentStatus);
optionsRouter.get('/agency-document-status', options.agencyDocumentStatus);
optionsRouter.get('/berths', options.berths);
optionsRouter.get('/berth-types', options.berthTypes);
optionsRouter.get('/jetties', options.jetties);
optionsRouter.get('/berth-jetties/:berthId', options.berthJetties);
optionsRouter.get('/purposes', options.purposes);
optionsRouter.get('/purpose-types', options.purposeTypes);
optionsRouter.get('/locations', options.locations);
optionsRouter.get('/products', options.products);
optionsRouter.get('/product-groups', options.productGroups);
optionsRouter.get('/product-types', options.productTypes);
optionsRouter.get('/cargo-types', options.cargoTypes);
optionsRouter.get('/cargo-wharfage', options.cargoWharfage);
optionsRouter.get('/payment-methods', options.paymentMethods);
optionsRouter.get('/payment-terms', options.paymentTerms);
optionsRouter.get('/cargo-owners', options.cargoOwners);
