'use client';
import Link from 'next/link';
import {useState} from 'react';
import {Filter} from 'lucide-react';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';

type Current={q:string;asal:string;status:string;kecamatan:string;jenis:string};
export function ReportFilters({current,districts,types}:{current:Current;districts:string[];types:string[]}){
  const [open,setOpen]=useState(false),count=[current.status,current.kecamatan,current.jenis].filter(Boolean).length;
  return <>
    <form method="get" className="hidden gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_1fr_1fr_1fr_auto]"><input type="hidden" name="asal" value={current.asal}/><Fields current={current} districts={districts} types={types}/><Buttons reset={Boolean(current.q||current.asal||count)}/></form>
    <div className="flex gap-2 md:hidden"><form method="get" className="min-w-0 flex-1"><input type="hidden" name="asal" value={current.asal}/><input type="hidden" name="status" value={current.status}/><input type="hidden" name="kecamatan" value={current.kecamatan}/><input type="hidden" name="jenis" value={current.jenis}/><input name="q" defaultValue={current.q} aria-label="Cari laporan" placeholder="Cari laporan..." className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"/></form><Button onClick={()=>setOpen(true)} variant="outline" className="h-11"><Filter className="h-4 w-4"/>Filter{count>0&&<span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-white">{count}</span>}</Button></div>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="md:hidden"><form method="get" className="flex h-full flex-col"><input type="hidden" name="asal" value={current.asal}/><div className="flex-1 overflow-y-auto p-5"><SheetHeader className="mb-5 pr-10"><SheetTitle>Filter Laporan</SheetTitle><SheetDescription>Tampilkan hanya data yang dibutuhkan.</SheetDescription></SheetHeader><div className="space-y-4"><Fields current={current} districts={districts} types={types}/></div></div><div className="flex shrink-0 gap-2 border-t bg-white p-4"><Button asChild variant="outline" className="flex-1"><Link href="/laporan">Reset</Link></Button><Button className="h-10 flex-1">Terapkan Filter</Button></div></form></SheetContent></Sheet>
  </>
}
function Fields({current,districts,types}:{current:Current;districts:string[];types:string[]}){return <><Field label="Cari laporan"><input name="q" defaultValue={current.q} placeholder="Nomor, pelapor, jalan..." className={input}/></Field><Field label="Status"><Select name="status" value={current.status} options={['Belum Ditangani','Dalam Proses','Selesai']} placeholder="Semua status"/></Field><Field label="Kecamatan"><Select name="kecamatan" value={current.kecamatan} options={districts} placeholder="Semua kecamatan"/></Field><Field label="Jenis fasilitas"><Select name="jenis" value={current.jenis} options={types} placeholder="Semua jenis"/></Field></>}
function Buttons({reset}:{reset:boolean}){return <div className="flex items-end gap-2"><button className="h-10 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white">Tampilkan</button>{reset&&<Link href="/laporan" className="grid h-10 place-items-center rounded-xl border px-3 text-sm font-semibold text-slate-500">Reset</Link>}</div>}
const input='mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50';
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-xs font-semibold text-slate-600">{label}{children}</label>}
function Select({name,value,options,placeholder}:{name:string;value:string;options:string[];placeholder:string}){return <select name={name} defaultValue={value} className={input+' bg-white text-slate-700'}><option value="">{placeholder}</option>{options.map(x=><option key={x}>{x}</option>)}</select>}
