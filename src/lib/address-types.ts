export type AddressVM = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  altPhone?: string | null;
  pincode: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  isDefault: boolean;
};