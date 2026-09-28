function e(r){if(!r?.retention_times)return{};const t=r.retention_times;return Array.isArray(t)?Object.fromEntries(t.map(n=>[n.substance,n.rt])):t}export{e as b};
