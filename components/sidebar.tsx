'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useState} from 'react';
import {Icon} from './icon';
import {getSupabase} from '@/lib/supabase/client';

type MenuItem={href:string;label:string;icon:'grid'|'file'|'plus'|'print'};
const reportItems:MenuItem[]=[{href:'/laporan',label:'Semua Laporan',icon:'file'},{href:'/laporan/tambah',label:'Tambah Laporan',icon:'plus'}];
const dataItems:MenuItem[]=[{href:'/laporan/import',label:'Import Google Sheet',icon:'plus'},{href:'/laporan/rekap',label:'Rekap & Export',icon:'print'}];

export function Sidebar({mobileOpen=false,onClose=()=>{},collapsed=false,onToggle=()=>{}}:{mobileOpen?:boolean;onClose?:()=>void;collapsed?:boolean;onToggle?:()=>void}){
  const path=usePathname(),router=useRouter();
  const reportActive=path==='/laporan'||path==='/laporan/tambah'||/^\/laporan\/[0-9a-f-]+$/i.test(path)||path.startsWith('/laporan/import/arsip');
  const dataActive=path==='/laporan/import'||path==='/laporan/rekap'||path==='/laporan/cetak';
  const [reportOpen,setReportOpen]=useState(reportActive),[dataOpen,setDataOpen]=useState(dataActive);
  const active=(href:string)=>path===href||(href==='/laporan'&&(/^\/laporan\/[0-9a-f-]+$/i.test(path)||path.startsWith('/laporan/import/arsip')));
  async function logout(){await getSupabase().auth.signOut();router.push('/login');router.refresh()}
  const menu=(items:MenuItem[])=>items.map(item=><Link onClick={onClose} title={item.label} key={item.href} href={item.href} className={'flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition '+(active(item.href)?'bg-white font-semibold text-indigo-700 shadow-sm':'text-indigo-100 hover:bg-white/10 hover:text-white')}><Icon name={item.icon} className="h-4 w-4 shrink-0"/>{!collapsed&&<span className="truncate">{item.label}</span>}</Link>);
  return <>
    <div onClick={onClose} className={'fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition md:hidden '+(mobileOpen?'opacity-100':'pointer-events-none opacity-0')}/>
    <aside className={'no-print fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-indigo-950 via-indigo-900 to-violet-950 p-4 text-white shadow-2xl transition-all duration-300 md:sticky md:top-0 md:z-40 md:h-screen md:translate-x-0 '+(mobileOpen?'translate-x-0':'-translate-x-full')+' '+(collapsed?'w-72 md:w-[76px]':'w-72 md:w-64')}>
      <div className="flex h-11 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 font-bold text-indigo-950 shadow-lg">D</div>{!collapsed&&<div className="min-w-0"><h1 className="truncate text-sm font-bold tracking-wide">DISHUB MADIUN</h1><p className="truncate text-[11px] text-indigo-200">Sistem Pelaporan Jalan</p></div>}<button onClick={onClose} aria-label="Tutup menu" className="ml-auto text-xl text-indigo-200 md:hidden">×</button></div>
      <nav className="mt-7 flex-1 space-y-2 overflow-y-auto">
        <Link onClick={onClose} title="Dashboard" href="/dashboard" className={'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition '+(path==='/dashboard'?'bg-white font-semibold text-indigo-700 shadow-sm':'text-indigo-100 hover:bg-white/10')}><Icon name="grid" className="h-4 w-4 shrink-0"/>{!collapsed&&<span>Dashboard</span>}</Link>
        {!collapsed&&<p className="px-3 pt-4 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-300">Menu Utama</p>}
        <MenuGroup title="Laporan" icon="file" open={reportOpen} setOpen={setReportOpen} collapsed={collapsed}>{menu(reportItems)}</MenuGroup>
        <MenuGroup title="Data" icon="grid" open={dataOpen} setOpen={setDataOpen} collapsed={collapsed}>{menu(dataItems)}</MenuGroup>
        <Link onClick={onClose} title="Pengaturan Google Drive" href="/pengaturan/google-drive" className={'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition '+(path.startsWith('/pengaturan')?'bg-white font-semibold text-indigo-700 shadow-sm':'text-indigo-100 hover:bg-white/10')}><Icon name="file" className="h-4 w-4 shrink-0"/>{!collapsed&&<span>Pengaturan Drive</span>}</Link>
      </nav>
      <div className="space-y-2 border-t border-white/10 pt-4"><div className="flex items-center gap-3 rounded-xl bg-white/[.06] p-2"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400 font-bold text-indigo-950">A</div>{!collapsed&&<div className="min-w-0"><p className="truncate text-xs font-semibold">Admin Dishub</p><p className="truncate text-[10px] text-indigo-300">Operator sistem</p></div>}</div><div className="flex gap-2"><button onClick={onToggle} title={collapsed?'Perbesar sidebar':'Perkecil sidebar'} className="hidden h-9 flex-1 items-center justify-center rounded-lg bg-white/10 text-xs text-indigo-100 hover:bg-white/15 md:flex">{collapsed?'›':'‹ Perkecil'}</button><button onClick={logout} title="Keluar" className="h-9 flex-1 rounded-lg border border-white/10 text-xs text-indigo-100 hover:bg-rose-500/20">{collapsed?'↪':'Keluar'}</button></div></div>
    </aside>
  </>
}

function MenuGroup({title,icon,open,setOpen,collapsed,children}:{title:string;icon:'file'|'grid';open:boolean;setOpen:(v:boolean)=>void;collapsed:boolean;children:React.ReactNode}){return <section className="rounded-2xl border border-white/10 bg-white/[.04] p-1.5"><button title={title} onClick={()=>setOpen(!open)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-indigo-100 hover:bg-white/10"><span className="flex items-center gap-3"><Icon name={icon} className="h-4 w-4 shrink-0"/>{!collapsed&&title}</span>{!collapsed&&<span className={'transition-transform '+(open?'rotate-180':'')}>⌄</span>}</button>{!collapsed&&open&&<div className="mt-1 space-y-1 border-l border-indigo-400/30 pl-2">{children}</div>}</section>}
