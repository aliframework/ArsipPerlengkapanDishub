import {AppShell} from '@/components/app-shell';
import { TestingControls } from '@/components/testing-controls';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell footer={process.env.NODE_ENV !== 'production'?<TestingControls/>:undefined}>{children}</AppShell>;
}
