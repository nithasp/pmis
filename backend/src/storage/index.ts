import { config } from '../config';
import { StorageDriver } from '../types/file.types';
import { LocalStorage } from './local.storage';
import { R2Storage } from './r2.storage';

export const storage: StorageDriver = config.storage.driver === 'r2' ? new R2Storage() : new LocalStorage();
