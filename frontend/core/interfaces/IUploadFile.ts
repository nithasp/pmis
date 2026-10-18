export interface IUploadFile {
   id?: number;
   filePath: string
   fileName: string
   extension: string
   size: number
}

export interface IUploadResponse {
   success: boolean;
   message: string;
   data?: any;
}
