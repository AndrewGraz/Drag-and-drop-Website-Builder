export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'section' | 'button';
export interface Field { id: string; type: FieldType; label: string; helpText?: string; placeholder?: string; required?: boolean; options?: string[]; min?: number; max?: number; accept?: string; }
export interface Deployment { mode: 'aws'; bucket: string; region: string; url: string; storage: 's3' | 'dynamodb'; }
export interface Form { id: string; name: string; fields: Field[]; updatedAt: string; deployment?: Deployment; }
