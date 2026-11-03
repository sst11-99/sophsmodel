'use strict';
(function(root){
 const defaults={decision:'unreviewed',frame:'',angle:'unknown',makeup:'unknown',footwear:'unknown',clothing:'unknown',types:[],uses:[],smile:false,notes:'',labelsReviewed:false};
 const fields=['decision','frame','angle','makeup','footwear','clothing','types','uses','smile','notes','labelsReviewed','position'];
 function choice(value){return {...defaults,...value,types:[...new Set(value?.types||[])].sort(),uses:[...new Set(value?.uses||[])].sort()};}
 function differences(agency,model){const a=choice(agency),m=choice(model);return fields.filter(k=>JSON.stringify(a[k])!==JSON.stringify(m[k]));}
 function effective(agency,model){const out={};for(const name of new Set([...Object.keys(agency),...Object.keys(model)]))out[name]=choice(Object.hasOwn(model,name)?model[name]:agency[name]);return out;}
 root.ReviewChoiceState={choice,differences,effective,fields};
})(typeof window==='undefined'?globalThis:window);
