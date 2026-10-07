// Local-only fixture. All notification sends and non-local fetches are intercepted.
import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises';
const directory = new URL('../src/app/notification-check/', import.meta.url);
const file = new URL('page.tsx', directory);
if (process.argv[2] === 'cleanup') {
    await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(directory).catch(error => { if (error.code !== 'ENOENT') throw error; });
} else {
    await mkdir(directory, { recursive: true });
    await writeFile(file, `"use client";
import {useEffect,useRef,useState} from "react";
import QuickBroadcastModal from "@/components/admin/QuickBroadcastModal";
import ProfileClient from "@/components/profile/ProfileClient";
export default function Check() {
  const [ready,setReady]=useState(false), [open,setOpen]=useState(false), [profile,setProfile]=useState(false), [count,setCount]=useState(0);
  const mode=useRef("failure");
  useEffect(()=>{
    if (!["localhost","127.0.0.1"].includes(location.hostname)) throw new Error("Local testing only");
    const original=window.fetch;
    window.fetch=async(input,options)=>{
      const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url,location.origin);
      if(url.pathname.startsWith("/api/notifications")) {
        setCount(value=>value+1);
        if(mode.current==="slow") await new Promise(resolve=>setTimeout(resolve,3000));
        return Response.json(mode.current==="failure"?{error:"No subscribed recipients"}:{success:true,id:"local-test"},{status:mode.current==="failure"?400:200});
      }
      if(url.origin!==location.origin) return Response.json([]);
      return original(input,options);
    };
    setReady(true); return ()=>{window.fetch=original;};
  },[]);
  const permission=(value:string)=>{Object.defineProperty(window,"Notification",{configurable:true,value:value==="unsupported"?undefined:{permission:value}});if(value==="unsupported")Reflect.deleteProperty(window,"Notification");setProfile(true);};
  return <><div style={{position:"relative",zIndex:5,padding:12,background:"white",color:"black"}}>
    <p>Local notification QA · requests: <span data-testid="request-count">{count}</span></p>
    <button onClick={()=>{mode.current="failure";setProfile(false);setOpen(true);}}>Failed broadcast</button>{" "}
    <button onClick={()=>{mode.current="success";setProfile(false);setOpen(true);}}>Successful broadcast</button>{" "}
    <button onClick={()=>{mode.current="slow";setProfile(false);setOpen(true);}}>Slow broadcast</button>{" "}
    <button onClick={()=>permission("denied")}>Denied permission</button>{" "}
    <button onClick={()=>permission("unsupported")}>Unsupported browser</button>{" "}
    <button onClick={()=>permission("granted")}>SDK unavailable</button>
  </div>{ready&&<><QuickBroadcastModal isOpen={open} onClose={()=>setOpen(false)}/>{profile&&<ProfileClient initialProfile={{id:"11111111-2222-3333-4444-555555555555",full_name:"מתאמנת בדיקה",email:"qa@example.invalid",phone:"",balance:0,role:"trainee"}} initialHealth={{is_healthy:true,medical_conditions:null}}/>}</>}</>;
}` , { flag: 'wx' });
}
