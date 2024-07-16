


export interface PaymentDB {

      id: string;
      currency: string;
      amount: number;
      country: string;
      description: string;
      expiration_type: string;
      expiration_value: number;
      status: string;
      contact_email: string;
      dlocal_payment_id: string;
      created_at: Date;
      updated_at: Date;
      order_id: string;

}