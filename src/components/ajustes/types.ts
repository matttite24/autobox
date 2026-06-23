export type ProfitPlan = {
  id: string;
  name: string;
  percentage: number;
  rounding: "none" | "nearest" | "up" | "down";
};

export type BankSummary = {
  _id: string;
  name: string;
  bankName?: string;
  accountNumber?: string;
  initialBalance?: number;
  currentBalance: number;
  status: "Activo" | "Inactivo";
};

export type PaymentNetworkSummary = {
  _id: string;
  name: string;
  alias?: string;
  commissionRate: number;
  currentBalance: number;
  status: "Activo" | "Inactivo";
};
