import { MenuCategoryType } from '@shared/enums';

export interface MenuCategoryProps {
  id: string;
  businessId: string;
  name: string;
  type: MenuCategoryType;
  order: number;
  active: boolean;
  image: string | null;
  createdAt?: Date;
}

export class MenuCategory {
  constructor(private props: MenuCategoryProps) {}

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get active(): boolean {
    return this.props.active;
  }

  update(
    partial: Partial<Pick<MenuCategoryProps, 'name' | 'type' | 'order' | 'active' | 'image'>>,
  ): void {
    Object.assign(this.props, partial);
  }

  toPrimitives(): MenuCategoryProps {
    return { ...this.props };
  }
}
