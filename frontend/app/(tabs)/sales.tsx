import { OrderListScreen } from "@/src/components/order-list";

export default function Sales() {
  return (
    <OrderListScreen
      kind="sale"
      title="Sales Orders"
      emptyImage="https://images.unsplash.com/photo-1651760680066-db9d32bd0357?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MTN8MHwxfHNlYXJjaHwxfHxlbXB0eSUyMGJveCUyMGludmVudG9yeSUyMGNoZWNrbGlzdHxlbnwwfHx8fDE3ODUzODk0NDB8MA&ixlib=rb-4.1.0&q=85"
    />
  );
}
