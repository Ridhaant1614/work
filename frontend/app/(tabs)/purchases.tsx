import { OrderListScreen } from "@/src/components/order-list";

export default function Purchases() {
  return (
    <OrderListScreen
      kind="purchase"
      title="Purchase Orders"
      emptyImage="https://images.unsplash.com/photo-1573376670329-0261ea9fde97?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwxfHxlbXB0eSUyMGJveCUyMGludmVudG9yeSUyMG1pbmltYWx8ZW58MHx8fHwxNzgyNDYxMjc3fDA&ixlib=rb-4.1.0&q=85"
    />
  );
}
