import { PreparationArea } from '@shared/enums';

export interface OrderItemProps {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  preparationArea: PreparationArea;
  notes?: string | null;
}

/** Value Object: línea de pedido inmutable (snapshot del producto). */
export class OrderItem {
  readonly menuItemId: string;
  readonly name: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly preparationArea: PreparationArea;
  readonly notes: string | null;

  constructor(props: OrderItemProps) {
    if (props.quantity <= 0) {
      throw new Error('La cantidad debe ser mayor que cero.');
    }
    this.menuItemId = props.menuItemId;
    this.name = props.name;
    this.unitPrice = props.unitPrice;
    this.quantity = props.quantity;
    this.preparationArea = props.preparationArea;
    this.notes = props.notes ?? null;
  }

  get subtotal(): number {
    return Math.round(this.unitPrice * this.quantity * 100) / 100;
  }

  toPrimitives(): Required<OrderItemProps> {
    return {
      menuItemId: this.menuItemId,
      name: this.name,
      unitPrice: this.unitPrice,
      quantity: this.quantity,
      preparationArea: this.preparationArea,
      notes: this.notes,
    };
  }
}
