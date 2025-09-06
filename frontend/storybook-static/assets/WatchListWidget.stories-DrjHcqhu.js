import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r}from"./index-0yr9KlQE.js";import{s as v}from"./stockApi-Cf11MmaB.js";import{u as E}from"./chunk-PVWAREVJ--AKJ3QBG.js";const $=r.createContext(null),y=()=>{const t=r.useContext($);if(t===null)throw new Error("useTheme must be used within a ThemeProvider");return t},S=r.createContext(void 0);function W(){const t=r.useContext(S);if(t===void 0)throw new Error("useToast must be used within a ToastProvider");return t}function L(){const{addToast:t}=W(),l=r.useCallback((o,n,c)=>t({type:"success",title:o,message:n,duration:c}),[t]),u=r.useCallback((o,n,c)=>t({type:"error",title:o,message:n,duration:c}),[t]),m=r.useCallback((o,n,c)=>t({type:"warning",title:o,message:n,duration:c}),[t]),i=r.useCallback((o,n,c)=>t({type:"info",title:o,message:n,duration:c}),[t]);return{success:l,error:u,warning:m,info:i}}function p({width:t="100%",height:l="1rem",className:u="",circle:m=!1,lines:i=1}){const{theme:o}=y(),n=`animate-pulse ${o==="dark"?"bg-gray-700":"bg-gray-200"} ${m?"rounded-full":"rounded"}`;return i>1?e.jsx("div",{className:`space-y-2 ${u}`,children:Array.from({length:i},(c,d)=>e.jsx("div",{className:`${n} ${d===i-1?"w-3/4":""}`,style:{width:d===i-1?"75%":t,height:l}},d))}):e.jsx("div",{className:`${n} ${u}`,style:{width:t,height:l}})}p.__docgenInfo={description:"",methods:[],displayName:"Skeleton",props:{width:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"",defaultValue:{value:"'100%'",computed:!1}},height:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"",defaultValue:{value:"'1rem'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}},circle:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},lines:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"1",computed:!1}}}};function w(){const[t,l]=r.useState([]),[u,m]=r.useState({}),[i,o]=r.useState(!1),{theme:n}=y(),c=E(),d=L(),T=r.useCallback(s=>s>0?"text-green-600":s<0?"text-red-600":"text-gray-600",[]),h=r.useCallback(async s=>{try{const a=await v.getCurrentPrice(s,!1);m(k=>({...k,[s]:a}))}catch(a){console.error(`Failed to fetch price for ${s}:`,a)}},[]),b=r.useCallback(async()=>{o(!0);try{const a=(await v.getWatchlist()).slice(0,5);l(a);const k=a.map(C=>h(C.stock_code));await Promise.allSettled(k)}catch(s){console.error("Failed to fetch watchlist:",s),d.error("エラー","ウォッチリストの取得に失敗しました")}finally{o(!1)}},[h,d]);r.useEffect(()=>{b()},[b]),r.useEffect(()=>{const s=setInterval(()=>{t.length>0&&t.forEach(a=>h(a.stock_code))},3e5);return()=>clearInterval(s)},[t,h]);const j=r.useCallback(s=>{c(`/stock/${s}`)},[c]),N=r.useCallback(()=>{c("/watchlist")},[c]);return e.jsxs("div",{className:`rounded-lg ${n==="dark"?"bg-gray-800":"bg-white"} shadow-sm border ${n==="dark"?"border-gray-700":"border-gray-200"} p-4`,children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{className:"text-lg font-semibold flex items-center gap-2",children:[e.jsx("span",{role:"img","aria-label":"お気に入り",children:"⭐"}),"ウォッチリスト"]}),e.jsx("button",{onClick:N,className:"text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-2 py-1","aria-label":"ウォッチリスト全体を表示",children:"すべて見る →"})]}),i?e.jsx("div",{className:"space-y-2",children:Array.from({length:3},(s,a)=>e.jsx("div",{className:"p-3 rounded-md",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(p,{width:"60px",height:"1rem"}),e.jsx(p,{width:"80px",height:"0.75rem"})]}),e.jsxs("div",{className:"text-right",children:[e.jsx(p,{width:"70px",height:"1rem"}),e.jsx(p,{width:"50px",height:"0.75rem",className:"mt-1"})]})]})},a))}):t.length===0?e.jsxs("div",{className:"text-center py-8",children:[e.jsx("div",{className:"text-gray-400 mb-2",children:"ウォッチリストが空です"}),e.jsx("button",{onClick:()=>c("/watchlist"),className:"text-sm text-blue-600 hover:text-blue-700",children:"銘柄を追加"})]}):e.jsx("div",{className:"space-y-2",children:t.map(s=>{const a=u[s.stock_code];return e.jsx("button",{onClick:()=>j(s.stock_code),className:`w-full p-3 rounded-md cursor-pointer transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${n==="dark"?"hover:bg-gray-700":"hover:bg-gray-50"}`,"aria-label":`${s.stock_code}の詳細を表示${s.notes?` - ${s.notes}`:""}`,children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"font-medium",children:s.stock_code}),s.notes&&e.jsx("span",{className:"text-xs text-gray-500",children:s.notes})]}),a&&e.jsxs("div",{className:"text-right",children:[e.jsxs("div",{className:"font-mono text-sm",children:["¥",a.current_price.toLocaleString()]}),e.jsxs("div",{className:`text-xs ${T(a.price_change)}`,children:[a.price_change>0?"+":"",a.price_change.toFixed(0),"(",a.price_change_pct>0?"+":"",a.price_change_pct.toFixed(2),"%)"]})]})]})},s.id)})})]})}w.__docgenInfo={description:"",methods:[],displayName:"WatchListWidget"};const I={title:"Watchlist/WatchListWidget",component:w,parameters:{layout:"centered"},tags:["autodocs"]},g={args:{}},f={args:{},parameters:{mockData:[{url:"http://localhost:8000/api/watchlist",method:"GET",status:200,response:new Promise(t=>setTimeout(()=>t([]),2e3))}]}},x={args:{},parameters:{mockData:[{url:"http://localhost:8000/api/watchlist",method:"GET",status:200,response:[{id:1,stock_code:"7203",notes:"トヨタ自動車",created_at:"2023-10-27T10:00:00Z"},{id:2,stock_code:"9984",notes:"ソフトバンクグループ",created_at:"2023-10-27T10:00:00Z"}]},{url:"http://localhost:8000/api/stocks/7203/current",method:"GET",status:200,response:{stock_code:"7203",current_price:2500.5,previous_close:2450,price_change:50.5,price_change_pct:2.06,timestamp:"2023-10-27T10:00:00Z",market_status:"open"}},{url:"http://localhost:8000/api/stocks/9984/current",method:"GET",status:200,response:{stock_code:"9984",current_price:1200,previous_close:1250,price_change:-50,price_change_pct:-4,timestamp:"2023-10-27T10:00:00Z",market_status:"open"}}]}},_={args:{},parameters:{mockData:[{url:"http://localhost:8000/api/watchlist",method:"GET",status:200,response:[]}]}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {}
}`,...g.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    mockData: [{
      url: 'http://localhost:8000/api/watchlist',
      method: 'GET',
      status: 200,
      response: new Promise(resolve => setTimeout(() => resolve([]), 2000))
    }]
  }
}`,...f.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
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
}`,...x.parameters?.docs?.source}}};_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    mockData: [{
      url: 'http://localhost:8000/api/watchlist',
      method: 'GET',
      status: 200,
      response: []
    }]
  }
}`,..._.parameters?.docs?.source}}};const V=["Default","Loading","WithItems","Empty"];export{g as Default,_ as Empty,f as Loading,x as WithItems,V as __namedExportsOrder,I as default};
