import { OrderStatus, PreparationArea } from '@shared/enums';
import { Order } from './order.entity';
import { OrderItem } from '../value-objects/order-item.vo';

const buildOrder = () =>
  new Order({
    id: 'o1',
    businessId: 'b1',
    tableId: 't1',
    sessionId: 'guest_1',
    status: OrderStatus.PENDING,
    items: [
      new OrderItem({
        menuItemId: 'm1',
        name: 'Mojito',
        unitPrice: 8.5,
        quantity: 2,
        preparationArea: PreparationArea.BAR,
      }),
      new OrderItem({
        menuItemId: 'm2',
        name: 'Bravas',
        unitPrice: 6.5,
        quantity: 1,
        preparationArea: PreparationArea.KITCHEN,
      }),
    ],
  });

describe('Order entity', () => {
  it('calcula el total correctamente', () => {
    expect(buildOrder().total).toBe(23.5);
  });

  it('detecta áreas de preparación implicadas', () => {
    expect(buildOrder().areas.sort()).toEqual([PreparationArea.BAR, PreparationArea.KITCHEN]);
  });

  it('permite transiciones válidas de estado', () => {
    const order = buildOrder();
    order.changeStatus(OrderStatus.ACCEPTED);
    order.changeStatus(OrderStatus.PREPARING);
    expect(order.status).toBe(OrderStatus.PREPARING);
  });

  it('rechaza transiciones inválidas', () => {
    const order = buildOrder();
    expect(() => order.changeStatus(OrderStatus.DELIVERED)).toThrow();
  });
});
