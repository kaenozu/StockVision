import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as a}from"./index-0yr9KlQE.js";import{s as N}from"./stockApi-CSKHuUhm.js";import{u as V}from"./chunk-PVWAREVJ--AKJ3QBG.js";const q=a.createContext(null),h=()=>{const t=a.useContext(q);if(t===null)throw new Error("useTheme must be used within a ThemeProvider");return t},S=a.createContext(void 0);function j({children:t}){const[l,d]=a.useState([]),m=a.useCallback(n=>{const r=crypto.randomUUID(),p={...n,id:r,duration:n.duration??5e3};return d(b=>[...b,p]),r},[]),u=a.useCallback(n=>{d(r=>r.filter(p=>p.id!==n))},[]),c=a.useCallback(()=>{d([])},[]);return e.jsx(S.Provider,{value:{toasts:l,addToast:m,removeToast:u,clearToasts:c},children:t})}function D(){const t=a.useContext(S);if(t===void 0)throw new Error("useToast must be used within a ToastProvider");return t}try{j.displayName="ToastProvider",j.__docgenInfo={description:"",displayName:"ToastProvider",props:{}}}catch{}function G(){const{addToast:t}=D(),l=a.useCallback((c,n,r)=>t({type:"success",title:c,message:n,duration:r}),[t]),d=a.useCallback((c,n,r)=>t({type:"error",title:c,message:n,duration:r}),[t]),m=a.useCallback((c,n,r)=>t({type:"warning",title:c,message:n,duration:r}),[t]),u=a.useCallback((c,n,r)=>t({type:"info",title:c,message:n,duration:r}),[t]);return{success:l,error:d,warning:m,info:u}}function i({width:t="100%",height:l="1rem",className:d="",circle:m=!1,lines:u=1}){const{theme:c}=h(),n=`animate-pulse ${c==="dark"?"bg-gray-700":"bg-gray-200"} ${m?"rounded-full":"rounded"}`;return u>1?e.jsx("div",{className:`space-y-2 ${d}`,children:Array.from({length:u},(r,p)=>e.jsx("div",{className:`${n} ${p===u-1?"w-3/4":""}`,style:{width:p===u-1?"75%":t,height:l}},p))}):e.jsx("div",{className:`${n} ${d}`,style:{width:t,height:l}})}function w({className:t=""}){const{theme:l}=h();return e.jsx("div",{className:`p-4 rounded-lg border ${l==="dark"?"bg-gray-800 border-gray-700":"bg-white border-gray-200"} ${t}`,children:e.jsxs("div",{className:"animate-pulse",children:[e.jsxs("div",{className:"flex items-center space-x-4 mb-4",children:[e.jsx(i,{circle:!0,width:"40px",height:"40px"}),e.jsxs("div",{className:"flex-1",children:[e.jsx(i,{width:"60%",height:"1.25rem"}),e.jsx(i,{width:"40%",height:"1rem",className:"mt-2"})]})]}),e.jsx(i,{lines:3,height:"1rem"})]})})}function T({className:t=""}){const{theme:l}=h();return e.jsx("div",{className:`p-4 rounded-lg border ${l==="dark"?"bg-gray-800 border-gray-700":"bg-white border-gray-200"} ${t}`,children:e.jsxs("div",{className:"animate-pulse",children:[e.jsx(i,{width:"40%",height:"1.5rem",className:"mb-4"}),e.jsx("div",{className:"h-64 flex items-end justify-between space-x-1",children:Array.from({length:20},(d,m)=>e.jsx(i,{width:"100%",height:`${Math.random()*80+20}%`,className:"flex-1"},m))})]})})}function C({rows:t=5,columns:l=4,className:d=""}){const{theme:m}=h();return e.jsxs("div",{className:`overflow-hidden rounded-lg border ${m==="dark"?"bg-gray-800 border-gray-700":"bg-white border-gray-200"} ${d}`,children:[e.jsx("div",{className:"px-6 py-4 border-b border-gray-200 dark:border-gray-700",children:e.jsx("div",{className:"flex space-x-4",children:Array.from({length:l},(u,c)=>e.jsx(i,{width:"120px",height:"1rem"},c))})}),Array.from({length:t},(u,c)=>e.jsx("div",{className:"px-6 py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0",children:e.jsx("div",{className:"flex space-x-4",children:Array.from({length:l},(n,r)=>e.jsx(i,{width:r===0?"80px":"100px",height:"1rem"},r))})},c))]})}try{i.displayName="Skeleton",i.__docgenInfo={description:"",displayName:"Skeleton",props:{width:{defaultValue:{value:"100%"},description:"",name:"width",required:!1,type:{name:"enum",value:[{value:"string"},{value:"number"}]}},height:{defaultValue:{value:"1rem"},description:"",name:"height",required:!1,type:{name:"enum",value:[{value:"string"},{value:"number"}]}},className:{defaultValue:{value:""},description:"",name:"className",required:!1,type:{name:"string"}},circle:{defaultValue:{value:"false"},description:"",name:"circle",required:!1,type:{name:"enum",value:[{value:"false"},{value:"true"}]}},lines:{defaultValue:{value:"1"},description:"",name:"lines",required:!1,type:{name:"number"}}}}}catch{}try{w.displayName="SkeletonCard",w.__docgenInfo={description:"",displayName:"SkeletonCard",props:{className:{defaultValue:{value:""},description:"",name:"className",required:!1,type:{name:"string"}}}}}catch{}try{T.displayName="SkeletonChart",T.__docgenInfo={description:"",displayName:"SkeletonChart",props:{className:{defaultValue:{value:""},description:"",name:"className",required:!1,type:{name:"string"}}}}}catch{}try{C.displayName="SkeletonTable",C.__docgenInfo={description:"",displayName:"SkeletonTable",props:{rows:{defaultValue:{value:"5"},description:"",name:"rows",required:!1,type:{name:"number"}},columns:{defaultValue:{value:"4"},description:"",name:"columns",required:!1,type:{name:"number"}},className:{defaultValue:{value:""},description:"",name:"className",required:!1,type:{name:"string"}}}}}catch{}function I(){const[t,l]=a.useState([]),[d,m]=a.useState({}),[u,c]=a.useState(!1),{theme:n}=h(),r=V(),p=G(),b=a.useCallback(s=>s>0?"text-green-600":s<0?"text-red-600":"text-gray-600",[]),g=a.useCallback(async s=>{try{const o=await N.getCurrentPrice(s,!1);m(v=>({...v,[s]:o}))}catch(o){console.error(`Failed to fetch price for ${s}:`,o)}},[]),k=a.useCallback(async()=>{c(!0);try{const o=(await N.getWatchlist()).slice(0,5);l(o);const v=o.map(P=>g(P.stock_code));await Promise.allSettled(v)}catch(s){console.error("Failed to fetch watchlist:",s),p.error("エラー","ウォッチリストの取得に失敗しました")}finally{c(!1)}},[g,p]);a.useEffect(()=>{k()},[k]),a.useEffect(()=>{const s=setInterval(()=>{t.length>0&&t.forEach(o=>g(o.stock_code))},3e5);return()=>clearInterval(s)},[t,g]);const $=a.useCallback(s=>{r(`/stock/${s}`)},[r]),E=a.useCallback(()=>{r("/watchlist")},[r]);return e.jsxs("div",{className:`rounded-lg ${n==="dark"?"bg-gray-800":"bg-white"} shadow-sm border ${n==="dark"?"border-gray-700":"border-gray-200"} p-4`,children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{className:"text-lg font-semibold flex items-center gap-2",children:[e.jsx("span",{role:"img","aria-label":"お気に入り",children:"⭐"}),"ウォッチリスト"]}),e.jsx("button",{onClick:E,className:"text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-2 py-1","aria-label":"ウォッチリスト全体を表示",children:"すべて見る →"})]}),u?e.jsx("div",{className:"space-y-2",children:Array.from({length:3},(s,o)=>e.jsx("div",{className:"p-3 rounded-md",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(i,{width:"60px",height:"1rem"}),e.jsx(i,{width:"80px",height:"0.75rem"})]}),e.jsxs("div",{className:"text-right",children:[e.jsx(i,{width:"70px",height:"1rem"}),e.jsx(i,{width:"50px",height:"0.75rem",className:"mt-1"})]})]})},o))}):t.length===0?e.jsxs("div",{className:"text-center py-8",children:[e.jsx("div",{className:"text-gray-400 mb-2",children:"ウォッチリストが空です"}),e.jsx("button",{onClick:()=>r("/watchlist"),className:"text-sm text-blue-600 hover:text-blue-700",children:"銘柄を追加"})]}):e.jsx("div",{className:"space-y-2",children:t.map(s=>{const o=d[s.stock_code];return e.jsx("button",{onClick:()=>$(s.stock_code),className:`w-full p-3 rounded-md cursor-pointer transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${n==="dark"?"hover:bg-gray-700":"hover:bg-gray-50"}`,"aria-label":`${s.stock_code}の詳細を表示${s.notes?` - ${s.notes}`:""}`,children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"font-medium",children:s.stock_code}),s.notes&&e.jsx("span",{className:"text-xs text-gray-500",children:s.notes})]}),o&&e.jsxs("div",{className:"text-right",children:[e.jsxs("div",{className:"font-mono text-sm",children:["¥",o.current_price.toLocaleString()]}),e.jsxs("div",{className:`text-xs ${b(o.price_change)}`,children:[o.price_change>0?"+":"",o.price_change.toFixed(0),"(",o.price_change_pct>0?"+":"",o.price_change_pct.toFixed(2),"%)"]})]})]})},s.id)})})]})}const F={title:"Watchlist/WatchListWidget",component:I,parameters:{layout:"centered"},tags:["autodocs"]},x={args:{}},f={args:{},parameters:{mockData:[{url:"http://localhost:8000/api/watchlist",method:"GET",status:200,response:new Promise(t=>setTimeout(()=>t([]),2e3))}]}},_={args:{},parameters:{mockData:[{url:"http://localhost:8000/api/watchlist",method:"GET",status:200,response:[{id:1,stock_code:"7203",notes:"トヨタ自動車",created_at:"2023-10-27T10:00:00Z"},{id:2,stock_code:"9984",notes:"ソフトバンクグループ",created_at:"2023-10-27T10:00:00Z"}]},{url:"http://localhost:8000/api/stocks/7203/current",method:"GET",status:200,response:{stock_code:"7203",current_price:2500.5,previous_close:2450,price_change:50.5,price_change_pct:2.06,timestamp:"2023-10-27T10:00:00Z",market_status:"open"}},{url:"http://localhost:8000/api/stocks/9984/current",method:"GET",status:200,response:{stock_code:"9984",current_price:1200,previous_close:1250,price_change:-50,price_change_pct:-4,timestamp:"2023-10-27T10:00:00Z",market_status:"open"}}]}},y={args:{},parameters:{mockData:[{url:"http://localhost:8000/api/watchlist",method:"GET",status:200,response:[]}]}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {}
}`,...x.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    mockData: [{
      url: 'http://localhost:8000/api/watchlist',
      method: 'GET',
      status: 200,
      response: new Promise(resolve => setTimeout(() => resolve([]), 2000))
    }]
  }
}`,...f.parameters?.docs?.source}}};_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    mockData: [{
      url: 'http://localhost:8000/api/watchlist',
      method: 'GET',
      status: 200,
      response: [{
        id: 1,
        stock_code: '7203',
        notes: 'トヨタ自動車',
        created_at: '2023-10-27T10:00:00Z'
      }, {
        id: 2,
        stock_code: '9984',
        notes: 'ソフトバンクグループ',
        created_at: '2023-10-27T10:00:00Z'
      }]
    }, {
      url: 'http://localhost:8000/api/stocks/7203/current',
      method: 'GET',
      status: 200,
      response: {
        stock_code: '7203',
        current_price: 2500.5,
        previous_close: 2450.0,
        price_change: 50.5,
        price_change_pct: 2.06,
        timestamp: '2023-10-27T10:00:00Z',
        market_status: 'open'
      }
    }, {
      url: 'http://localhost:8000/api/stocks/9984/current',
      method: 'GET',
      status: 200,
      response: {
        stock_code: '9984',
        current_price: 1200.0,
        previous_close: 1250.0,
        price_change: -50.0,
        price_change_pct: -4.0,
        timestamp: '2023-10-27T10:00:00Z',
        market_status: 'open'
      }
    }]
  }
}`,..._.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    mockData: [{
      url: 'http://localhost:8000/api/watchlist',
      method: 'GET',
      status: 200,
      response: []
    }]
  }
}`,...y.parameters?.docs?.source}}};const U=["Default","Loading","WithItems","Empty"];export{x as Default,y as Empty,f as Loading,_ as WithItems,U as __namedExportsOrder,F as default};
