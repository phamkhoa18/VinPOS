import {
  Smartphone, Laptop, Headphones, Tablet, Watch, Speaker,
  Package, Cable, BatteryCharging, Shield, ShoppingBag,
  Folder, Tag, Box, Cpu, Monitor, Camera, Gamepad2,
  Shirt, Coffee, Utensils, Pill, Gem, Wrench, Lightbulb,
  type LucideIcon,
} from 'lucide-react';

// Map category/product icon names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  phone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  tablet: Tablet,
  watch: Watch,
  speaker: Speaker,
  package: Package,
  cable: Cable,
  charger: BatteryCharging,
  shield: Shield,
  bag: ShoppingBag,
  folder: Folder,
  tag: Tag,
  box: Box,
  cpu: Cpu,
  monitor: Monitor,
  camera: Camera,
  gamepad: Gamepad2,
  shirt: Shirt,
  coffee: Coffee,
  food: Utensils,
  pill: Pill,
  gem: Gem,
  wrench: Wrench,
  lightbulb: Lightbulb,
};

export function getCategoryIcon(iconName?: string): LucideIcon {
  if (!iconName) return Folder;
  return iconMap[iconName.toLowerCase()] || Folder;
}

export function getProductIcon(iconName?: string): LucideIcon {
  if (!iconName) return Package;
  return iconMap[iconName.toLowerCase()] || Package;
}

// Available icons for selection in forms
export const availableIcons = [
  { name: 'smartphone', label: 'Điện thoại' },
  { name: 'laptop', label: 'Laptop' },
  { name: 'headphones', label: 'Tai nghe' },
  { name: 'tablet', label: 'Tablet' },
  { name: 'watch', label: 'Đồng hồ' },
  { name: 'speaker', label: 'Loa' },
  { name: 'cable', label: 'Cáp/Dây' },
  { name: 'charger', label: 'Sạc' },
  { name: 'shield', label: 'Phụ kiện' },
  { name: 'camera', label: 'Camera' },
  { name: 'monitor', label: 'Màn hình' },
  { name: 'cpu', label: 'Linh kiện' },
  { name: 'shirt', label: 'Thời trang' },
  { name: 'coffee', label: 'Đồ uống' },
  { name: 'food', label: 'Thực phẩm' },
  { name: 'pill', label: 'Y tế' },
  { name: 'gem', label: 'Trang sức' },
  { name: 'wrench', label: 'Công cụ' },
  { name: 'package', label: 'Khác' },
];
