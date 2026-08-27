import {ArrowRight,Clock,FileText,LayoutDashboard,MapPin,Plus,Printer,type LucideIcon} from 'lucide-react';
const icons:Record<'grid'|'file'|'plus'|'print'|'arrow'|'pin'|'clock',LucideIcon>={grid:LayoutDashboard,file:FileText,plus:Plus,print:Printer,arrow:ArrowRight,pin:MapPin,clock:Clock};
export function Icon({name,className='h-5 w-5'}:{name:keyof typeof icons;className?:string}){const Component=icons[name];return <Component className={className} aria-hidden="true"/>}
