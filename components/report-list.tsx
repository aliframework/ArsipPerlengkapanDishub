'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {ArrowRight,Eye,MoreHorizontal,Printer} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Sheet,SheetClose,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';

export type ReportListItem={id:string;nomor:string;waktu:string;pelapor:string;lokasi:string;wilayah?:string;jenis:string;tingkat:string;status:string;asal?:'Manual'|'Import';href:string;printHref?:string;deskripsi?:string;petugas?:string};
const level=(v:string)=>v==='Darurat'?'bg-rose-600 text-white ring-rose-600':v==='Berat'?'bg-rose-50 text-rose-700 ring-rose-100':v==='Sedang'?'bg-amber-50 text-amber-700 ring-amber-100':'bg-emerald-50 text-emerald-700 ring-emerald-100';
const state=(v:string)=>v==='Selesai'?'bg-emerald-500':v==='Dalam Proses'?'bg-blue-500':'bg-amber-500';
const stateText=(v:string)=>v==='Selesai'?'text-emerald-700':v==='Dalam Proses'?'text-blue-700':'text-amber-700';
const stamp=(v:string)=>new Date(v).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'});
const source=(v?:string)=>v==='Import'?'bg-cyan-50 text-cyan-700 ring-cyan-100':'bg-indigo-50 text-indigo-700 ring-indigo-100';

export function ReportList({items,empty='Belum ada laporan.',compact=false}:{items:ReportListItem[];empty?:string;compact?:boolean}){
  const router=useRouter(),[preview,setPreview]=useState<ReportListItem|null>(null);
  const open=(item:ReportListItem)=>router.push(item.href);
  if(!items.length)return <Empty text={empty}/>;
  return <div>
    {!compact&&<div className="hidden grid-cols-[minmax(0,1.15fr)_minmax(0,1.25fr)_minmax(150px,.65fr)_150px] gap-5 border-b bg-slate-50/80 px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400 xl:grid"><span>Laporan</span><span>Lokasi & Jenis</span><span>Kondisi</span><span className="text-right">Aksi</span></div>}
    <div className="divide-y divide-slate-100">{items.map(item=><article role="link" tabIndex={0} aria-label={`Buka ${item.nomor}`} key={(item.asal||'')+item.id} onClick={()=>open(item)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(item)}}} className={'group relative cursor-pointer border-l-4 p-4 outline-none transition duration-200 hover:bg-indigo-50/50 focus-visible:bg-indigo-50 sm:p-5 '+(item.tingkat==='Darurat'?'border-l-rose-500':item.tingkat==='Berat'?'border-l-rose-200':'border-l-transparent')+(compact?' flex flex-col gap-4 sm:grid sm:grid-cols-2':' grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.25fr)_minmax(150px,.65fr)_150px] xl:items-center xl:gap-5')}>
      <Identity item={item}/><Location item={item}/><Condition item={item}/><Actions item={item} onPreview={()=>setPreview(item)}/>
      {!compact&&<span className="pointer-events-none absolute right-3 top-3 translate-x-1 text-sm text-indigo-400 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 xl:hidden">→</span>}
    </article>)}</div>
    {preview&&<Preview item={preview} close={()=>setPreview(null)}/>} 
  </div>
}

function Identity({item}:{item:ReportListItem}){return <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] ring-1 '+source(item.asal)}>{item.asal||'Manual'}</span><span className="break-words text-sm font-bold leading-5 text-indigo-700">{item.nomor}</span></div><p className="mt-2 truncate text-xs text-slate-500">{stamp(item.waktu)} <span className="text-slate-300">•</span> {item.pelapor||'Tidak diketahui'}</p></div>}
function Location({item}:{item:ReportListItem}){return <div className="min-w-0"><p className="font-bold leading-5 text-slate-900">{item.lokasi}</p>{item.wilayah&&<p className="mt-1 truncate text-xs text-slate-500">{item.wilayah}</p>}<p className="mt-2 truncate text-sm font-medium text-slate-600">{item.jenis}</p></div>}
function Condition({item}:{item:ReportListItem}){return <div className="flex flex-wrap items-center gap-2 xl:flex-col xl:items-start"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold ring-1 '+level(item.tingkat)}>{item.tingkat}</span><span className={'flex items-center gap-1.5 text-xs font-semibold '+stateText(item.status)}><i className={'h-2 w-2 rounded-full '+state(item.status)}/>{item.status}</span></div>}
function Actions({item,onPreview}:{item:ReportListItem;onPreview:()=>void}){return <div onClick={e=>e.stopPropagation()} className="flex items-center gap-1 xl:justify-end"><Button type="button" variant="outline" size="icon" onClick={onPreview} aria-label="Lihat ringkasan" title="Lihat ringkasan"><Eye className="h-4 w-4"/></Button><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label="Menu tindakan"><MoreHorizontal className="h-5 w-5"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={item.href}><ArrowRight className="h-4 w-4"/>Buka detail</Link></DropdownMenuItem>{item.printHref&&<DropdownMenuItem asChild><Link href={item.printHref}><Printer className="h-4 w-4"/>Cetak laporan</Link></DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div>}
function Preview({item,close}:{item:ReportListItem;close:()=>void}){return <Sheet open onOpenChange={open=>{if(!open)close()}}><SheetContent><div className="flex-1 overflow-y-auto p-5 sm:p-7"><SheetHeader className="pr-12"><span className={'w-fit rounded-md px-2 py-1 text-[10px] font-bold uppercase ring-1 '+source(item.asal)}>{item.asal||'Manual'}</span><SheetTitle className="break-words text-indigo-700">{item.nomor}</SheetTitle><SheetDescription>{stamp(item.waktu)}</SheetDescription></SheetHeader><div className="mt-6 rounded-2xl bg-slate-50 p-4"><h3 className="break-words font-bold text-slate-900">{item.lokasi||'Lokasi belum tersedia'}</h3><p className="mt-1 text-sm text-slate-500">{item.wilayah||'Wilayah belum tersedia'}</p><p className="mt-3 text-sm font-semibold text-slate-700">{item.jenis||'Jenis belum tersedia'}</p></div><dl className="mt-6 space-y-4 text-sm"><Info label="Pelapor" value={item.pelapor||'Tidak diketahui'}/><Info label="Tingkat kerusakan" value={item.tingkat||'-'}/><Info label="Status" value={item.status||'-'}/><Info label="Petugas input" value={item.petugas||'Belum tersedia'}/><Info label="Deskripsi" value={item.deskripsi||'Belum tersedia'}/></dl></div><SheetFooter><SheetClose asChild><Button variant="outline" className="flex-1">Tutup</Button></SheetClose><Button asChild className="flex-1"><Link href={item.href}>Kelola Laporan<ArrowRight className="h-4 w-4"/></Link></Button></SheetFooter></SheetContent></Sheet>}
function Info({label,value}:{label:string;value:string}){return <div><dt className="text-xs font-medium text-slate-400">{label}</dt><dd className="mt-1 leading-6 text-slate-700">{value}</dd></div>}
function Empty({text}:{text:string}){return <div className="px-5 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl text-slate-400">○</div><p className="mt-3 text-sm text-slate-500">{text}</p></div>}
