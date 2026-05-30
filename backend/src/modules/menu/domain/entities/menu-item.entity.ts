import { PreparationArea } from '@shared/enums';

export interface MenuItemProps {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  stock: number | null;
  available: boolean;
  preparationArea: PreparationArea;
  createdAt?: Date;
}

export class MenuItem {
  constructor(private props: MenuItemProps) {}

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get categoryId(): string {
    return this.props.categoryId;
  }
  get name(): string {
    return this.props.name;
  }
  get price(): number {
    return this.props.price;
  }
  get preparationArea(): PreparationArea {
    return this.props.preparationArea;
  }
  get available(): boolean {
    return this.props.available;
  }
  get stock(): number | null {
    return this.props.stock;
  }

  /** Verifica disponibilidad considerando stock opcional. */
  canOrder(quantity: number): boolean {
    if (!this.props.available) return false;
    if (this.props.stock === null) return true;
    return this.props.stock >= quantity;
  }

  decrementStock(quantity: number): void {
    if (this.props.stock !== null) {
      this.props.stock = Math.max(0, this.props.stock - quantity);
    }
  }

  update(
    partial: Partial<
      Pick<
        MenuItemProps,
        | 'name'
        | 'description'
        | 'price'
        | 'image'
        | 'stock'
        | 'available'
        | 'preparationArea'
        | 'categoryId'
      >
    >,
  ): void {
    Object.assign(this.props, partial);
  }

  toPrimitives(): MenuItemProps {
    return { ...this.props };
  }
}
